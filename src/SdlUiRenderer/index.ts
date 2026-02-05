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
  DEFAULT_REFRESH_RATE,
  createSDLRect,
} from "../Sdl2";
import type { SDLPointer, SdlKeyEvent } from "../Sdl2";
import { AnsiParser, type DrawCommand, type Color } from "../AnsiParser";

import { TextRenderer } from "../TextRenderer";
import type { SdlUiRendererOptions, ProcessEventsResult } from "./types";

export * from "./types";
import { InputBridge } from "../InputBridge";
import { SdlError } from "../utils/SdlError";
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

/**
 * Adjust color brightness by a multiplier, optionally clamping to max channel value
 */
const adjustBrightness = (
  color: Color,
  multiplier: number,
  clamp = true
): Color => ({
  r: clamp
    ? Math.min(COLOR_CHANNEL_MAX, Math.floor(color.r * multiplier))
    : Math.floor(color.r * multiplier),
  g: clamp
    ? Math.min(COLOR_CHANNEL_MAX, Math.floor(color.g * multiplier))
    : Math.floor(color.g * multiplier),
  b: clamp
    ? Math.min(COLOR_CHANNEL_MAX, Math.floor(color.b * multiplier))
    : Math.floor(color.b * multiplier),
});

/** Length of a 6-character hex color string (RRGGBB) */
const HEX_COLOR_LENGTH = 6;

/** Slice indices for parsing hex color channels */
const HEX_R_END = 2;
const HEX_G_END = 4;

/**
 * Parse a background color from various formats
 */
export const parseBackgroundColor = (
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

  /** Whether we own the window (should destroy it on cleanup) */
  private ownsWindow = true;
  /** Whether we own the renderer (should destroy it on cleanup) */
  private ownsRenderer = true;

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
    // Parse background color
    this.defaultBgColor = parseBackgroundColor(options.backgroundColor);
    this.bgColor = { ...this.defaultBgColor };

    // Check if using existing resources
    if (options.existing) {
      this.initWithExistingResources(options);
    } else {
      this.initNewResources(options);
    }

    // Store user's explicit scale factor preference
    this.userScaleFactor =
      options.scaleFactor === undefined ? null : options.scaleFactor;

    // Get scale factor
    if (this.userScaleFactor !== null) {
      this.scaleFactor = this.userScaleFactor;
    } else {
      this.scaleFactor = this.sdl.getScaleFactorFromRenderer(
        this.window!,
        this.renderer!
      );
    }

    // Create text renderer
    this.textRenderer = new TextRenderer(this.renderer!, {
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
    this.setDrawColor(this.defaultBgColor);

    // Initial clear of the render target
    this.sdl.setRenderTarget(this.renderer!, this.renderTarget);
    this.sdl.renderClear(this.renderer!);
    this.sdl.setRenderTarget(this.renderer!, null);

    // Present initial black frame
    this.sdl.renderClear(this.renderer!);
    this.sdl.renderPresent(this.renderer!);

    // Bring window to front (only if we own the window)
    if (this.ownsWindow) {
      this.sdl.raiseWindow(this.window!);
    }
  }

  /**
   * Initialize with existing SDL window and renderer
   */
  private initWithExistingResources(options: SdlUiRendererOptions): void {
    const existing = options.existing!;

    // Use existing resources - caller retains ownership
    this.window = existing.window;
    this.renderer = existing.renderer;
    this.ownsWindow = false;
    this.ownsRenderer = false;

    // Initialize SDL for events only (if not already initialized)
    // SDL_Init is idempotent and won't re-initialize already-initialized subsystems
    if (!this.sdl.init(SDL_INIT_EVENTS)) {
      throw new SdlError("INIT_FAILED", "Failed to initialize SDL2 events");
    }

    // Read dimensions from existing window
    const size = this.sdl.getWindowSize(this.window);
    this.windowWidth = size.width;
    this.windowHeight = size.height;
  }

  /**
   * Initialize by creating new SDL window and renderer
   */
  private initNewResources(options: SdlUiRendererOptions): void {
    // Initialize SDL
    if (!this.sdl.init(SDL_INIT_VIDEO | SDL_INIT_EVENTS)) {
      throw new SdlError(
        "INIT_FAILED",
        "Failed to initialize SDL2 for UI rendering"
      );
    }

    // We own the resources we create
    this.ownsWindow = true;
    this.ownsRenderer = true;

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
        this.setDrawColor(this.defaultBgColor);
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
      fg = adjustBrightness(fg, BOLD_BRIGHTNESS_MULTIPLIER);
    }

    // Apply dim (darken colors)
    if (this.dim) {
      fg = adjustBrightness(fg, DIM_BRIGHTNESS_MULTIPLIER, false);
    }

    // Ensure minimum brightness for visibility
    const brightness = Math.max(fg.r, fg.g, fg.b);

    if (brightness < MIN_BRIGHTNESS) {
      if (brightness === 0) {
        fg = { r: MIN_BRIGHTNESS, g: MIN_BRIGHTNESS, b: MIN_BRIGHTNESS };
      } else {
        fg = adjustBrightness(fg, MIN_BRIGHTNESS / brightness);
      }
    }

    // Draw background rectangle
    const textWidth = text.length * this.charWidth;
    const bgRect = createSDLRect(x, y, textWidth, this.charHeight);
    this.setDrawColor(bg);
    this.sdl.renderFillRect(this.renderer, bgRect);

    // Render text
    this.textRenderer.renderText(text, x, y, fg, this.italic);

    // Draw text decorations (underline, strikethrough)
    if (this.underline || this.strikethrough) {
      const lineThickness = Math.max(
        1,
        Math.round(this.charHeight * TEXT_DECORATION_THICKNESS)
      );

      this.setDrawColor(fg);

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
    this.setDrawColor(this.defaultBgColor);
    this.sdl.renderClear(this.renderer);
    this.sdl.setRenderTarget(this.renderer, null);

    // Reset parser state
    this.ansiParser.reset();
  }

  /**
   * Set the SDL render draw color
   */
  private setDrawColor(color: Color): void {
    this.sdl.setRenderDrawColor(
      this.renderer!,
      color.r,
      color.g,
      color.b,
      COLOR_CHANNEL_MAX
    );
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
    this.setDrawColor(this.bgColor);
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
   *
   * When using existing window/renderer (via `existing` option), this method
   * will NOT destroy the window or renderer - only the resources created by
   * ink-sdl (TextRenderer, render target texture). The caller is responsible
   * for destroying the window/renderer they provided.
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

    // Only destroy resources we own
    if (this.ownsRenderer && this.renderer) {
      this.sdl.destroyRenderer(this.renderer);
    }
    this.renderer = null;

    if (this.ownsWindow && this.window) {
      this.sdl.destroyWindow(this.window);
    }
    this.window = null;
  }

  /**
   * Check if this renderer owns the SDL window
   *
   * Returns false when using an existing window via the `existing` option.
   */
  ownsResources(): boolean {
    return this.ownsWindow && this.ownsRenderer;
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

  /**
   * Get the refresh rate of the display containing the window
   *
   * Queries the display's current refresh rate for matching event loop timing.
   * Works with any refresh rate including variable refresh rate (VRR) displays.
   * Returns DEFAULT_REFRESH_RATE (60) if detection fails.
   */
  getDisplayRefreshRate(): number {
    if (!this.window) {
      return DEFAULT_REFRESH_RATE;
    }
    return this.sdl.getDisplayRefreshRate(this.window);
  }
}

// Re-export consts
export * from "./consts";
