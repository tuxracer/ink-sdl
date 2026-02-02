/**
 * SDL UI Renderer
 *
 * Main renderer for Ink-based UI in SDL mode. Intercepts ANSI output
 * from Ink and renders it to an SDL window using text rendering.
 */

import {
  getSdl2,
  SDL_INIT_VIDEO,
  SDL_INIT_EVENTS,
  SDL_WINDOW_SHOWN,
  SDL_WINDOW_RESIZABLE,
  SDL_WINDOW_ALLOW_HIGHDPI,
  SDL_WINDOW_FULLSCREEN,
  SDL_WINDOW_FULLSCREEN_DESKTOP,
  SDL_WINDOW_BORDERLESS,
  SDL_WINDOWPOS_CENTERED,
  SDL_RENDERER_ACCELERATED,
  SDL_RENDERER_PRESENTVSYNC,
  SDL_QUIT,
  SDL_WINDOWEVENT,
  SDL_WINDOWEVENT_CLOSE,
  SDL_WINDOWEVENT_SIZE_CHANGED,
  SDL_WINDOWEVENT_FOCUS_LOST,
  SDL_KEYDOWN,
  SDL_KEYUP,
  SDL_TEXTUREACCESS_TARGET,
  SDL_PIXELFORMAT_ARGB8888,
  SDL_BLENDMODE_BLEND,
  createSDLRect,
} from "../Sdl2";
import type { SDLPointer, SdlKeyEvent } from "../Sdl2";
import { AnsiParser, type DrawCommand, type Color } from "../AnsiParser";
import { TextRenderer } from "../TextRenderer";
import { InputBridge } from "../InputBridge";
import {
  COLOR_CHANNEL_MAX,
  DEFAULT_FONT_SIZE,
  SCALE_FACTOR_EPSILON,
} from "../consts";
import {
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  MIN_COLUMNS,
  MIN_ROWS,
  BOLD_BRIGHTNESS_MULTIPLIER,
  DIM_BRIGHTNESS_MULTIPLIER,
  UNDERLINE_POSITION,
  STRIKETHROUGH_POSITION,
  TEXT_DECORATION_THICKNESS,
} from "./consts";

/** Default background color (black) */
const DEFAULT_BG: Color = { r: 0, g: 0, b: 0 };

/** Default foreground color (white) */
const DEFAULT_FG: Color = { r: 255, g: 255, b: 255 };

/** Minimum brightness for text visibility */
const MIN_BRIGHTNESS = 100;

/** Length of a 6-character hex color string (RRGGBB) */
const HEX_COLOR_LENGTH = 6;

/** Slice indices for parsing hex color channels */
const HEX_R_END = 2;
const HEX_G_END = 4;

/**
 * Parse a background color from various formats
 */
const parseBackgroundColor = (
  color: [number, number, number] | string | undefined
): Color => {
  if (!color) {
    return { ...DEFAULT_BG };
  }

  if (Array.isArray(color)) {
    return { r: color[0], g: color[1], b: color[2] };
  }

  // Parse hex string "#RRGGBB" or "RRGGBB"
  const hex = color.startsWith("#") ? color.slice(1) : color;
  if (hex.length === HEX_COLOR_LENGTH) {
    const r = parseInt(hex.slice(0, HEX_R_END), 16);
    const g = parseInt(hex.slice(HEX_R_END, HEX_G_END), 16);
    const b = parseInt(hex.slice(HEX_G_END), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }

  return { ...DEFAULT_BG };
};

export interface SdlUiRendererOptions {
  width?: number;
  height?: number;
  title?: string;
  vsync?: boolean;
  fontSize?: number;
  scaleFactor?: number | null;
  /** Use system font instead of bundled Cozette font */
  systemFont?: boolean;
  /** Path to a custom TTF font file */
  fontPath?: string;
  /** Font name to search for in system font directories */
  fontName?: string;
  /** Background color as RGB tuple [r, g, b] or hex string "#RRGGBB" */
  backgroundColor?: [number, number, number] | string;
  /** Fullscreen mode: true for exclusive fullscreen, "desktop" for borderless fullscreen */
  fullscreen?: boolean | "desktop";
  /** Remove window decorations (title bar, borders) */
  borderless?: boolean;
  /** Minimum window width in pixels */
  minWidth?: number;
  /** Minimum window height in pixels */
  minHeight?: number;
}

/** Result from processing SDL events */
export interface ProcessEventsResult {
  /** Key events that occurred */
  keyEvents: SdlKeyEvent[];
  /** Whether a resize event occurred */
  resized: boolean;
  /** Whether focus was lost (modifier keys should be reset) */
  focusLost: boolean;
}

/**
 * SDL UI Renderer
 *
 * Renders Ink UI to an SDL window by parsing ANSI sequences and
 * drawing text with SDL_ttf.
 */
export class SdlUiRenderer {
  private sdl = getSdl2();
  private window: SDLPointer | null = null;
  private renderer: SDLPointer | null = null;
  private textRenderer: TextRenderer | null = null;
  private renderTarget: SDLPointer | null = null;

  private ansiParser: AnsiParser;
  private inputBridge: InputBridge;

  private windowWidth: number;
  private windowHeight: number;
  private columns: number;
  private rows: number;
  private charWidth = 0;
  private charHeight = 0;

  private fgColor: Color = { ...DEFAULT_FG };
  private bgColor: Color = { ...DEFAULT_BG };
  private defaultBgColor: Color = { ...DEFAULT_BG };
  private bold = false;
  private dim = false;
  private italic = false;
  private underline = false;
  private strikethrough = false;
  private reverse = false;

  private shouldQuit = false;
  private pendingCommands: DrawCommand[] = [];
  private scaleFactor = 1.0;
  private userScaleFactor: number | null = null;

  constructor(options: SdlUiRendererOptions = {}) {
    this.windowWidth = options.width ?? DEFAULT_WINDOW_WIDTH;
    this.windowHeight = options.height ?? DEFAULT_WINDOW_HEIGHT;
    this.columns = DEFAULT_COLUMNS;
    this.rows = DEFAULT_ROWS;

    this.ansiParser = new AnsiParser();
    this.inputBridge = new InputBridge();

    this.initSDL(options);
  }

  /**
   * Initialize SDL window and renderer
   */
  private initSDL(options: SdlUiRendererOptions): void {
    // Initialize SDL
    if (!this.sdl.init(SDL_INIT_VIDEO | SDL_INIT_EVENTS)) {
      throw new Error("Failed to initialize SDL2 for UI rendering");
    }

    // Parse background color
    this.defaultBgColor = parseBackgroundColor(options.backgroundColor);
    this.bgColor = { ...this.defaultBgColor };

    // Build window flags
    let windowFlags = SDL_WINDOW_SHOWN | SDL_WINDOW_ALLOW_HIGHDPI;

    // Add resizable flag unless fullscreen (fullscreen windows can't be resized)
    if (!options.fullscreen) {
      windowFlags |= SDL_WINDOW_RESIZABLE;
    }

    // Handle fullscreen modes
    if (options.fullscreen === "desktop") {
      windowFlags |= SDL_WINDOW_FULLSCREEN_DESKTOP;
    } else if (options.fullscreen === true) {
      windowFlags |= SDL_WINDOW_FULLSCREEN;
    }

    // Handle borderless (only if not fullscreen, which is already borderless)
    if (options.borderless && !options.fullscreen) {
      windowFlags |= SDL_WINDOW_BORDERLESS;
    }

    // Create window
    this.window = this.sdl.createWindow(
      options.title ?? "ink-sdl",
      SDL_WINDOWPOS_CENTERED,
      SDL_WINDOWPOS_CENTERED,
      this.windowWidth,
      this.windowHeight,
      windowFlags
    );

    // Set minimum window size if specified
    if (options.minWidth !== undefined || options.minHeight !== undefined) {
      const minW = options.minWidth ?? 1;
      const minH = options.minHeight ?? 1;
      this.sdl.setWindowMinimumSize(this.window, minW, minH);
    }

    // Create renderer
    const rendererFlags =
      options.vsync !== false
        ? SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC
        : SDL_RENDERER_ACCELERATED;
    this.renderer = this.sdl.createRenderer(this.window, -1, rendererFlags);

    // Store user's explicit scale factor preference
    this.userScaleFactor =
      options.scaleFactor === undefined ? null : options.scaleFactor;

    // Get scale factor
    if (this.userScaleFactor !== null) {
      this.scaleFactor = this.userScaleFactor;
    } else {
      this.scaleFactor = this.sdl.getScaleFactorFromRenderer(
        this.window,
        this.renderer
      );
    }

    // Create text renderer
    this.textRenderer = new TextRenderer(this.renderer, {
      fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
      scaleFactor: this.scaleFactor,
      ...(options.systemFont && { systemFont: true }),
      ...(options.fontPath && { fontPath: options.fontPath }),
      ...(options.fontName && { fontName: options.fontName }),
    });

    // Get character dimensions
    const charDims = this.textRenderer.getCharDimensions();
    this.charWidth = charDims.width;
    this.charHeight = charDims.height;

    // Calculate terminal dimensions
    this.updateTerminalDimensions();

    // Create render target texture for persistent drawing
    // This solves the double-buffering issue where SDL swaps buffers on present,
    // causing incremental updates from Ink to be lost
    this.createRenderTarget();

    // Set background color
    this.sdl.setRenderDrawColor(
      this.renderer,
      this.defaultBgColor.r,
      this.defaultBgColor.g,
      this.defaultBgColor.b,
      COLOR_CHANNEL_MAX
    );

    // Initial clear of the render target
    this.sdl.setRenderTarget(this.renderer, this.renderTarget);
    this.sdl.renderClear(this.renderer);
    this.sdl.setRenderTarget(this.renderer, null);

    // Present initial black frame
    this.sdl.renderClear(this.renderer);
    this.sdl.renderPresent(this.renderer);

    // Bring window to front
    this.sdl.raiseWindow(this.window);
  }

  /**
   * Update terminal dimensions based on window size
   */
  private updateTerminalDimensions(): void {
    if (!this.window || this.charWidth === 0 || this.charHeight === 0) {
      return;
    }

    // Get drawable size (physical pixels)
    const drawable = this.sdl.getDrawableSize(this.window);

    // Calculate character grid dimensions
    this.columns = Math.floor(drawable.width / this.charWidth);
    this.rows = Math.floor(drawable.height / this.charHeight);

    // Ensure minimum dimensions
    this.columns = Math.max(this.columns, MIN_COLUMNS);
    this.rows = Math.max(this.rows, MIN_ROWS);
  }

  /**
   * Get terminal dimensions
   */
  getDimensions(): { columns: number; rows: number } {
    return {
      columns: this.columns,
      rows: this.rows,
    };
  }

  /**
   * Create or recreate the render target texture
   */
  private createRenderTarget(): void {
    if (!this.renderer) {
      return;
    }

    // Destroy old render target if it exists
    if (this.renderTarget) {
      this.sdl.destroyTexture(this.renderTarget);
      this.renderTarget = null;
    }

    // Get the drawable size for the texture dimensions
    const drawable = this.sdl.getDrawableSize(this.window!);

    // Create a new render target texture
    this.renderTarget = this.sdl.createTexture(
      this.renderer,
      SDL_PIXELFORMAT_ARGB8888,
      SDL_TEXTUREACCESS_TARGET,
      drawable.width,
      drawable.height
    );

    // Set blend mode on render target for proper alpha handling when copying to screen
    this.sdl.setTextureBlendMode(this.renderTarget, SDL_BLENDMODE_BLEND);
  }

  /**
   * Process ANSI output from Ink
   */
  processAnsi(output: string): void {
    const commands = this.ansiParser.parse(output);
    this.pendingCommands.push(...commands);
  }

  /**
   * Render pending commands and present
   */
  present(): void {
    if (!this.renderer || !this.textRenderer || !this.renderTarget) {
      return;
    }

    // Set render target to our persistent texture
    this.sdl.setRenderTarget(this.renderer, this.renderTarget);

    // Process all pending commands (drawing to the texture)
    for (const cmd of this.pendingCommands) {
      this.executeCommand(cmd);
    }
    this.pendingCommands = [];

    // Reset render target to the screen
    this.sdl.setRenderTarget(this.renderer, null);

    // Copy the render target texture to the screen
    this.sdl.renderCopy(this.renderer, this.renderTarget, null, null);

    // Present the frame
    this.sdl.renderPresent(this.renderer);
  }

  /**
   * Refresh the display by copying the render target to the screen
   *
   * Call this periodically to keep the display updated even when no new
   * content is being rendered. Required for SDL's double-buffering to work
   * correctly - without continuous presents, the window can go black.
   */
  refreshDisplay(): void {
    if (!this.renderer || !this.renderTarget) {
      return;
    }

    // Ensure we're rendering to the screen, not the texture
    // This is defensive - the render target should already be null after present()
    // but font operations or other SDL calls might affect renderer state
    this.sdl.setRenderTarget(this.renderer, null);

    // Copy the render target texture to the screen
    this.sdl.renderCopy(this.renderer, this.renderTarget, null, null);

    // Present the frame
    this.sdl.renderPresent(this.renderer);
  }

  /**
   * Execute a single draw command
   */
  private executeCommand(cmd: DrawCommand): void {
    switch (cmd.type) {
      case "text":
        this.renderText(cmd);
        break;

      case "clear_screen":
        // Clear the render target directly (don't call clear() which resets render target)
        this.sdl.setRenderDrawColor(
          this.renderer!,
          this.defaultBgColor.r,
          this.defaultBgColor.g,
          this.defaultBgColor.b,
          COLOR_CHANNEL_MAX
        );
        this.sdl.renderClear(this.renderer!);
        this.ansiParser.reset();
        break;

      case "clear_line":
        this.clearLine(cmd.row ?? 1, cmd.col ?? 1);
        break;

      case "cursor_move":
        break;

      case "set_fg":
        if (cmd.color) {
          this.fgColor = cmd.color;
        }
        break;

      case "set_bg":
        if (cmd.color) {
          this.bgColor = cmd.color;
        }
        break;

      case "reset_style":
        this.fgColor = { ...DEFAULT_FG };
        this.bgColor = { ...this.defaultBgColor };
        this.bold = false;
        this.dim = false;
        this.italic = false;
        this.underline = false;
        this.strikethrough = false;
        this.reverse = false;
        break;

      case "set_bold":
        this.bold = cmd.enabled ?? false;
        break;

      case "set_dim":
        this.dim = cmd.enabled ?? false;
        break;

      case "set_italic":
        this.italic = cmd.enabled ?? false;
        break;

      case "set_underline":
        this.underline = cmd.enabled ?? false;
        break;

      case "set_strikethrough":
        this.strikethrough = cmd.enabled ?? false;
        break;

      case "set_reverse":
        this.reverse = cmd.enabled ?? false;
        break;
    }
  }

  /**
   * Render text at position
   */
  private renderText(cmd: DrawCommand): void {
    if (!cmd.text || !this.renderer || !this.textRenderer) {
      return;
    }

    const text = cmd.text;
    const row = cmd.row ?? 1;
    const col = cmd.col ?? 1;

    // Calculate pixel position (1-indexed to 0-indexed)
    const x = (col - 1) * this.charWidth;
    const y = (row - 1) * this.charHeight;

    // Determine colors (handle reverse)
    let fg = this.reverse ? this.bgColor : this.fgColor;
    const bg = this.reverse ? this.fgColor : this.bgColor;

    // Apply bold (brighten colors)
    if (this.bold) {
      fg = {
        r: Math.min(
          COLOR_CHANNEL_MAX,
          Math.floor(fg.r * BOLD_BRIGHTNESS_MULTIPLIER)
        ),
        g: Math.min(
          COLOR_CHANNEL_MAX,
          Math.floor(fg.g * BOLD_BRIGHTNESS_MULTIPLIER)
        ),
        b: Math.min(
          COLOR_CHANNEL_MAX,
          Math.floor(fg.b * BOLD_BRIGHTNESS_MULTIPLIER)
        ),
      };
    }

    // Apply dim (darken colors)
    if (this.dim) {
      fg = {
        r: Math.floor(fg.r * DIM_BRIGHTNESS_MULTIPLIER),
        g: Math.floor(fg.g * DIM_BRIGHTNESS_MULTIPLIER),
        b: Math.floor(fg.b * DIM_BRIGHTNESS_MULTIPLIER),
      };
    }

    // Ensure minimum brightness for visibility
    const brightness = Math.max(fg.r, fg.g, fg.b);

    if (brightness < MIN_BRIGHTNESS) {
      if (brightness === 0) {
        fg = { r: MIN_BRIGHTNESS, g: MIN_BRIGHTNESS, b: MIN_BRIGHTNESS };
      } else {
        const scale = MIN_BRIGHTNESS / brightness;
        fg = {
          r: Math.min(COLOR_CHANNEL_MAX, Math.floor(fg.r * scale)),
          g: Math.min(COLOR_CHANNEL_MAX, Math.floor(fg.g * scale)),
          b: Math.min(COLOR_CHANNEL_MAX, Math.floor(fg.b * scale)),
        };
      }
    }

    // Draw background rectangle
    const textWidth = text.length * this.charWidth;
    const bgRect = createSDLRect(x, y, textWidth, this.charHeight);
    this.sdl.setRenderDrawColor(
      this.renderer,
      bg.r,
      bg.g,
      bg.b,
      COLOR_CHANNEL_MAX
    );
    this.sdl.renderFillRect(this.renderer, bgRect);

    // Render text
    this.textRenderer.renderText(text, x, y, fg, this.italic);

    // Draw text decorations (underline, strikethrough)
    if (this.underline || this.strikethrough) {
      const lineThickness = Math.max(
        1,
        Math.round(this.charHeight * TEXT_DECORATION_THICKNESS)
      );

      this.sdl.setRenderDrawColor(
        this.renderer,
        fg.r,
        fg.g,
        fg.b,
        COLOR_CHANNEL_MAX
      );

      if (this.underline) {
        const underlineY = y + Math.round(this.charHeight * UNDERLINE_POSITION);
        const underlineRect = createSDLRect(
          x,
          underlineY,
          textWidth,
          lineThickness
        );
        this.sdl.renderFillRect(this.renderer, underlineRect);
      }

      if (this.strikethrough) {
        const strikeY =
          y + Math.round(this.charHeight * STRIKETHROUGH_POSITION);
        const strikeRect = createSDLRect(x, strikeY, textWidth, lineThickness);
        this.sdl.renderFillRect(this.renderer, strikeRect);
      }
    }
  }

  /**
   * Clear the entire screen
   */
  clear(): void {
    if (!this.renderer || !this.renderTarget) {
      return;
    }

    // Clear the render target texture
    this.sdl.setRenderTarget(this.renderer, this.renderTarget);
    this.sdl.setRenderDrawColor(
      this.renderer,
      this.defaultBgColor.r,
      this.defaultBgColor.g,
      this.defaultBgColor.b,
      COLOR_CHANNEL_MAX
    );
    this.sdl.renderClear(this.renderer);
    this.sdl.setRenderTarget(this.renderer, null);

    // Reset parser state
    this.ansiParser.reset();
  }

  /**
   * Clear a line from a specific position
   */
  private clearLine(row: number, fromCol: number): void {
    if (!this.renderer) {
      return;
    }

    const x = (fromCol - 1) * this.charWidth;
    const y = (row - 1) * this.charHeight;
    const drawable = this.sdl.getDrawableSize(this.window!);
    const clearWidth = drawable.width - x;

    const rect = createSDLRect(x, y, clearWidth, this.charHeight);
    this.sdl.setRenderDrawColor(
      this.renderer,
      this.bgColor.r,
      this.bgColor.g,
      this.bgColor.b,
      COLOR_CHANNEL_MAX
    );
    this.sdl.renderFillRect(this.renderer, rect);
  }

  /**
   * Process SDL events
   */
  processEvents(): ProcessEventsResult {
    const keyEvents: SdlKeyEvent[] = [];
    let resized = false;
    let focusLost = false;

    let event = this.sdl.pollEvent();
    while (event) {
      if (event.type === SDL_QUIT) {
        this.shouldQuit = true;
      } else if (event.type === SDL_WINDOWEVENT) {
        if (event.windowEvent === SDL_WINDOWEVENT_CLOSE) {
          this.shouldQuit = true;
        } else if (event.windowEvent === SDL_WINDOWEVENT_SIZE_CHANGED) {
          this.handleResize();
          resized = true;
        } else if (event.windowEvent === SDL_WINDOWEVENT_FOCUS_LOST) {
          focusLost = true;
        }
      } else if (event.type === SDL_KEYDOWN || event.type === SDL_KEYUP) {
        if (event.keycode !== undefined && event.pressed !== undefined) {
          keyEvents.push({
            keycode: event.keycode,
            pressed: event.pressed,
            repeat: event.repeat ?? false,
          });
        }
      }

      event = this.sdl.pollEvent();
    }

    return { keyEvents, resized, focusLost };
  }

  /**
   * Convert SDL key event to terminal sequence
   */
  keyEventToSequence(event: SdlKeyEvent): string | null {
    return this.inputBridge.processKeyEvent(event);
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (!this.window) {
      return;
    }

    // Update window dimensions
    const size = this.sdl.getWindowSize(this.window);
    this.windowWidth = size.width;
    this.windowHeight = size.height;

    // Update scale factor only if user hasn't set an explicit value
    if (this.userScaleFactor === null) {
      const newScale = this.sdl.getScaleFactor(this.window);
      if (Math.abs(newScale - this.scaleFactor) > SCALE_FACTOR_EPSILON) {
        this.scaleFactor = newScale;
        this.textRenderer?.updateScaleFactor(newScale);

        if (this.textRenderer) {
          const charDims = this.textRenderer.getCharDimensions();
          this.charWidth = charDims.width;
          this.charHeight = charDims.height;
        }
      }
    }

    // Recreate render target at new size
    this.createRenderTarget();

    // Recalculate terminal dimensions
    this.updateTerminalDimensions();

    // Clear and repaint
    this.clear();
  }

  /**
   * Check if quit was requested
   */
  shouldClose(): boolean {
    return this.shouldQuit;
  }

  /**
   * Get cursor position
   */
  getCursorPos(): { x: number; y: number } {
    const cursor = this.ansiParser.getCursor();
    return { x: cursor.col, y: cursor.row };
  }

  /**
   * Get the SDL window
   */
  getWindow(): SDLPointer | null {
    return this.window;
  }

  /**
   * Get the SDL renderer
   */
  getRenderer(): SDLPointer | null {
    return this.renderer;
  }

  /**
   * Set the scale factor
   */
  setScaleFactor(scaleFactor: number | null): void {
    this.userScaleFactor = scaleFactor;

    let newScale: number;
    if (scaleFactor !== null) {
      newScale = scaleFactor;
    } else if (this.window && this.renderer) {
      newScale = this.sdl.getScaleFactorFromRenderer(
        this.window,
        this.renderer
      );
    } else {
      newScale = 1.0;
    }

    if (Math.abs(newScale - this.scaleFactor) < SCALE_FACTOR_EPSILON) {
      return;
    }

    this.scaleFactor = newScale;

    if (this.textRenderer) {
      this.textRenderer.updateScaleFactor(newScale);

      const charDims = this.textRenderer.getCharDimensions();
      this.charWidth = charDims.width;
      this.charHeight = charDims.height;
    }

    // Recreate render target in case drawable size changed
    this.createRenderTarget();

    this.updateTerminalDimensions();
    this.clear();
  }

  /**
   * Get current scale factor
   */
  getScaleFactor(): number {
    return this.scaleFactor;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.textRenderer) {
      this.textRenderer.destroy();
      this.textRenderer = null;
    }

    if (this.renderTarget) {
      this.sdl.destroyTexture(this.renderTarget);
      this.renderTarget = null;
    }

    if (this.renderer) {
      this.sdl.destroyRenderer(this.renderer);
      this.renderer = null;
    }
    if (this.window) {
      this.sdl.destroyWindow(this.window);
      this.window = null;
    }
  }

  /**
   * Reset state for reuse
   */
  reset(): void {
    this.shouldQuit = false;
    this.pendingCommands = [];
    this.fgColor = { ...DEFAULT_FG };
    this.bgColor = { ...this.defaultBgColor };
    this.bold = false;
    this.dim = false;
    this.italic = false;
    this.underline = false;
    this.strikethrough = false;
    this.reverse = false;
    this.ansiParser.reset();

    if (this.window) {
      const size = this.sdl.getWindowSize(this.window);
      this.windowWidth = size.width;
      this.windowHeight = size.height;
      this.updateTerminalDimensions();
    }
  }

  /**
   * Reset input state (modifier keys)
   *
   * Call this when focus is lost to prevent "stuck" modifier keys.
   */
  resetInputState(): void {
    this.inputBridge.reset();
  }

  /**
   * Get glyph cache statistics
   *
   * Useful for profiling and tuning cache size.
   */
  getCacheStats(): { size: number; maxSize: number } | null {
    return this.textRenderer?.getCacheStats() ?? null;
  }
}
