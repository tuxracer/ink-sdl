/**
 * SDL2 FFI Bindings
 *
 * Provides minimal SDL2 bindings for window-based rendering
 * using koffi for foreign function interface.
 */

import koffi from "koffi";
import type { SDLPointer } from "./types";
import { findLibrary } from "../utils/findLibrary";
import { SdlDependencyError } from "../utils/SdlDependencyError";
import { SdlError } from "../utils/SdlError";
import {
  INT32_BYTES,
  SDL_EVENT_SIZE,
  SDL_WINDOW_EVENT_OFFSET,
  SDL_KEY_STATE_OFFSET,
  SDL_KEY_REPEAT_OFFSET,
  SDL_KEYSYM_SYM_OFFSET,
  SDL_RECT_SIZE,
  SDL_RECT_X_OFFSET,
  SDL_RECT_Y_OFFSET,
  SDL_RECT_W_OFFSET,
  SDL_RECT_H_OFFSET,
  SDL_DISPLAYMODE_SIZE,
  SDL_DISPLAYMODE_REFRESH_RATE_OFFSET,
  DEFAULT_REFRESH_RATE,
  SDL_WINDOWEVENT,
  SDL_KEYDOWN,
  SDL_KEYUP,
  SDL_INIT_VIDEO,
  SDL_INIT_EVENTS,
  SDL_RENDERER_ACCELERATED,
  SDL_RENDERER_PRESENTVSYNC,
  SDL_RENDERER_SOFTWARE,
} from "./consts";

// SDL2 library paths by platform
const SDL_LIB_PATHS: Record<string, string[]> = {
  darwin: [
    "/opt/homebrew/lib/libSDL2.dylib", // Homebrew ARM
    "/usr/local/lib/libSDL2.dylib", // Homebrew Intel
    "/opt/local/lib/libSDL2.dylib", // MacPorts
    "libSDL2.dylib", // System path
  ],
  linux: [
    "/usr/lib/x86_64-linux-gnu/libSDL2-2.0.so.0", // Debian/Ubuntu x64
    "/usr/lib/aarch64-linux-gnu/libSDL2-2.0.so.0", // Debian/Ubuntu ARM64
    "/usr/lib64/libSDL2-2.0.so.0", // Fedora/RHEL
    "/usr/lib/libSDL2-2.0.so.0", // Arch
    "libSDL2-2.0.so.0", // System path
  ],
  win32: ["SDL2.dll", "C:\\Windows\\System32\\SDL2.dll"],
};

/**
 * Find the SDL2 library path for the current platform
 */
const findSDLLibrary = (): string | null => {
  return findLibrary(SDL_LIB_PATHS);
};

/**
 * SDL2 API wrapper class
 *
 * Provides type-safe access to SDL2 functions for window rendering.
 */
export class Sdl2 {
  private lib: koffi.IKoffiLib;
  private initialized = false;

  // Core functions
  private _SDL_Init!: (flags: number) => number;
  private _SDL_Quit!: () => void;
  private _SDL_GetError!: () => string;

  // Window functions
  private _SDL_CreateWindow!: (
    title: string,
    x: number,
    y: number,
    w: number,
    h: number,
    flags: number
  ) => SDLPointer;
  private _SDL_DestroyWindow!: (window: SDLPointer) => void;
  private _SDL_SetWindowTitle!: (window: SDLPointer, title: string) => void;
  private _SDL_GetWindowSize!: (
    window: SDLPointer,
    w: Buffer,
    h: Buffer
  ) => void;
  private _SDL_RaiseWindow!: (window: SDLPointer) => void;
  private _SDL_SetWindowMinimumSize!: (
    window: SDLPointer,
    minW: number,
    minH: number
  ) => void;
  private _SDL_SetWindowMaximumSize!: (
    window: SDLPointer,
    maxW: number,
    maxH: number
  ) => void;

  // Renderer functions
  private _SDL_CreateRenderer!: (
    window: SDLPointer,
    index: number,
    flags: number
  ) => SDLPointer;
  private _SDL_DestroyRenderer!: (renderer: SDLPointer) => void;
  private _SDL_RenderClear!: (renderer: SDLPointer) => number;
  private _SDL_RenderPresent!: (renderer: SDLPointer) => void;
  private _SDL_RenderCopy!: (
    renderer: SDLPointer,
    texture: SDLPointer,
    srcRect: SDLPointer | null,
    dstRect: SDLPointer | null
  ) => number;
  private _SDL_SetRenderDrawColor!: (
    renderer: SDLPointer,
    r: number,
    g: number,
    b: number,
    a: number
  ) => number;

  // Texture functions
  private _SDL_CreateTexture!: (
    renderer: SDLPointer,
    format: number,
    access: number,
    w: number,
    h: number
  ) => SDLPointer;
  private _SDL_DestroyTexture!: (texture: SDLPointer) => void;
  private _SDL_UpdateTexture!: (
    texture: SDLPointer,
    rect: SDLPointer | null,
    pixels: Buffer,
    pitch: number
  ) => number;
  private _SDL_CreateTextureFromSurface!: (
    renderer: SDLPointer,
    surface: SDLPointer
  ) => SDLPointer;
  private _SDL_SetTextureBlendMode!: (
    texture: SDLPointer,
    blendMode: number
  ) => number;
  private _SDL_SetTextureColorMod!: (
    texture: SDLPointer,
    r: number,
    g: number,
    b: number
  ) => number;

  // Surface functions
  private _SDL_FreeSurface!: (surface: SDLPointer) => void;

  // Additional renderer functions
  private _SDL_GetRendererOutputSize!: (
    renderer: SDLPointer,
    w: Buffer,
    h: Buffer
  ) => number;
  private _SDL_RenderFillRect!: (
    renderer: SDLPointer,
    rect: SDLPointer | null
  ) => number;
  private _SDL_SetRenderTarget!: (
    renderer: SDLPointer,
    texture: SDLPointer | null
  ) => number;

  // HiDPI functions
  private _SDL_GL_GetDrawableSize!: (
    window: SDLPointer,
    w: Buffer,
    h: Buffer
  ) => void;

  // Event functions
  private _SDL_PollEvent!: (event: Buffer) => number;

  // Display mode functions
  private _SDL_GetWindowDisplayIndex!: (window: SDLPointer) => number;
  private _SDL_GetCurrentDisplayMode!: (
    displayIndex: number,
    mode: Buffer
  ) => number;

  constructor() {
    const libPath = findSDLLibrary();
    if (!libPath) {
      throw new SdlDependencyError("SDL2");
    }

    try {
      this.lib = koffi.load(libPath);
      this.bindFunctions();
    } catch {
      // Library path was found but loading failed - likely not installed
      throw new SdlDependencyError("SDL2");
    }
  }

  private bindFunctions(): void {
    // Core
    this._SDL_Init = this.lib.func("int SDL_Init(uint32_t flags)");
    this._SDL_Quit = this.lib.func("void SDL_Quit()");
    this._SDL_GetError = this.lib.func("const char* SDL_GetError()");

    // Window
    this._SDL_CreateWindow = this.lib.func(
      "void* SDL_CreateWindow(const char* title, int x, int y, int w, int h, uint32_t flags)"
    );
    this._SDL_DestroyWindow = this.lib.func(
      "void SDL_DestroyWindow(void* window)"
    );
    this._SDL_SetWindowTitle = this.lib.func(
      "void SDL_SetWindowTitle(void* window, const char* title)"
    );
    this._SDL_GetWindowSize = this.lib.func(
      "void SDL_GetWindowSize(void* window, int* w, int* h)"
    );
    this._SDL_RaiseWindow = this.lib.func("void SDL_RaiseWindow(void* window)");
    this._SDL_SetWindowMinimumSize = this.lib.func(
      "void SDL_SetWindowMinimumSize(void* window, int min_w, int min_h)"
    );
    this._SDL_SetWindowMaximumSize = this.lib.func(
      "void SDL_SetWindowMaximumSize(void* window, int max_w, int max_h)"
    );

    // Renderer
    this._SDL_CreateRenderer = this.lib.func(
      "void* SDL_CreateRenderer(void* window, int index, uint32_t flags)"
    );
    this._SDL_DestroyRenderer = this.lib.func(
      "void SDL_DestroyRenderer(void* renderer)"
    );
    this._SDL_RenderClear = this.lib.func(
      "int SDL_RenderClear(void* renderer)"
    );
    this._SDL_RenderPresent = this.lib.func(
      "void SDL_RenderPresent(void* renderer)"
    );
    this._SDL_RenderCopy = this.lib.func(
      "int SDL_RenderCopy(void* renderer, void* texture, void* srcrect, void* dstrect)"
    );
    this._SDL_SetRenderDrawColor = this.lib.func(
      "int SDL_SetRenderDrawColor(void* renderer, uint8_t r, uint8_t g, uint8_t b, uint8_t a)"
    );

    // Texture
    this._SDL_CreateTexture = this.lib.func(
      "void* SDL_CreateTexture(void* renderer, uint32_t format, int access, int w, int h)"
    );
    this._SDL_DestroyTexture = this.lib.func(
      "void SDL_DestroyTexture(void* texture)"
    );
    this._SDL_UpdateTexture = this.lib.func(
      "int SDL_UpdateTexture(void* texture, void* rect, const void* pixels, int pitch)"
    );
    this._SDL_CreateTextureFromSurface = this.lib.func(
      "void* SDL_CreateTextureFromSurface(void* renderer, void* surface)"
    );
    this._SDL_SetTextureBlendMode = this.lib.func(
      "int SDL_SetTextureBlendMode(void* texture, int blendMode)"
    );
    this._SDL_SetTextureColorMod = this.lib.func(
      "int SDL_SetTextureColorMod(void* texture, uint8_t r, uint8_t g, uint8_t b)"
    );

    // Surface
    this._SDL_FreeSurface = this.lib.func(
      "void SDL_FreeSurface(void* surface)"
    );

    // Additional renderer
    this._SDL_GetRendererOutputSize = this.lib.func(
      "int SDL_GetRendererOutputSize(void* renderer, int* w, int* h)"
    );
    this._SDL_RenderFillRect = this.lib.func(
      "int SDL_RenderFillRect(void* renderer, void* rect)"
    );
    this._SDL_SetRenderTarget = this.lib.func(
      "int SDL_SetRenderTarget(void* renderer, void* texture)"
    );

    // HiDPI
    this._SDL_GL_GetDrawableSize = this.lib.func(
      "void SDL_GL_GetDrawableSize(void* window, int* w, int* h)"
    );

    // Events
    this._SDL_PollEvent = this.lib.func("int SDL_PollEvent(void* event)");

    // Display mode
    this._SDL_GetWindowDisplayIndex = this.lib.func(
      "int SDL_GetWindowDisplayIndex(void* window)"
    );
    this._SDL_GetCurrentDisplayMode = this.lib.func(
      "int SDL_GetCurrentDisplayMode(int displayIndex, void* mode)"
    );
  }

  /**
   * Initialize SDL with the given subsystems
   */
  init(flags: number = SDL_INIT_VIDEO | SDL_INIT_EVENTS): boolean {
    if (this.initialized) {
      return true;
    }

    const result = this._SDL_Init(flags);
    if (result !== 0) {
      return false;
    }

    this.initialized = true;
    return true;
  }

  /**
   * Shutdown SDL
   */
  quit(): void {
    if (this.initialized) {
      this._SDL_Quit();
      this.initialized = false;
    }
  }

  /**
   * Get the last SDL error message
   */
  getError(): string {
    return this._SDL_GetError();
  }

  /**
   * Create a window
   */
  createWindow(
    title: string,
    x: number,
    y: number,
    width: number,
    height: number,
    flags: number
  ): SDLPointer {
    const window = this._SDL_CreateWindow(title, x, y, width, height, flags);
    if (!window) {
      throw new SdlError("WINDOW_CREATION_FAILED", this._SDL_GetError());
    }
    return window;
  }

  /**
   * Destroy a window
   */
  destroyWindow(window: SDLPointer): void {
    this._SDL_DestroyWindow(window);
  }

  /**
   * Set window title
   */
  setWindowTitle(window: SDLPointer, title: string): void {
    this._SDL_SetWindowTitle(window, title);
  }

  /**
   * Get window size
   */
  getWindowSize(window: SDLPointer): { width: number; height: number } {
    const wBuf = Buffer.alloc(INT32_BYTES);
    const hBuf = Buffer.alloc(INT32_BYTES);
    this._SDL_GetWindowSize(window, wBuf, hBuf);
    return {
      width: wBuf.readInt32LE(0),
      height: hBuf.readInt32LE(0),
    };
  }

  /**
   * Raise window to front and give it keyboard focus
   */
  raiseWindow(window: SDLPointer): void {
    this._SDL_RaiseWindow(window);
  }

  /**
   * Set the minimum size of a window
   */
  setWindowMinimumSize(window: SDLPointer, minW: number, minH: number): void {
    this._SDL_SetWindowMinimumSize(window, minW, minH);
  }

  /**
   * Set the maximum size of a window
   */
  setWindowMaximumSize(window: SDLPointer, maxW: number, maxH: number): void {
    this._SDL_SetWindowMaximumSize(window, maxW, maxH);
  }

  /**
   * Create a renderer for a window
   */
  createRenderer(
    window: SDLPointer,
    index: number = -1,
    flags: number = SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC
  ): SDLPointer {
    const renderer = this._SDL_CreateRenderer(window, index, flags);
    if (!renderer) {
      // Fall back to software renderer
      const softwareRenderer = this._SDL_CreateRenderer(
        window,
        -1,
        SDL_RENDERER_SOFTWARE
      );
      if (!softwareRenderer) {
        throw new SdlError("RENDERER_CREATION_FAILED", this._SDL_GetError());
      }
      return softwareRenderer;
    }
    return renderer;
  }

  /**
   * Destroy a renderer
   */
  destroyRenderer(renderer: SDLPointer): void {
    this._SDL_DestroyRenderer(renderer);
  }

  /**
   * Clear the renderer
   */
  renderClear(renderer: SDLPointer): void {
    this._SDL_RenderClear(renderer);
  }

  /**
   * Present the renderer (flip buffers)
   */
  renderPresent(renderer: SDLPointer): void {
    this._SDL_RenderPresent(renderer);
  }

  /**
   * Copy texture to renderer
   */
  renderCopy(
    renderer: SDLPointer,
    texture: SDLPointer,
    srcRect: SDLPointer | null = null,
    dstRect: SDLPointer | null = null
  ): void {
    this._SDL_RenderCopy(renderer, texture, srcRect, dstRect);
  }

  /**
   * Set render draw color
   */
  setRenderDrawColor(
    renderer: SDLPointer,
    r: number,
    g: number,
    b: number,
    a: number = 255
  ): void {
    this._SDL_SetRenderDrawColor(renderer, r, g, b, a);
  }

  /**
   * Create a texture
   */
  createTexture(
    renderer: SDLPointer,
    format: number,
    access: number,
    width: number,
    height: number
  ): SDLPointer {
    const texture = this._SDL_CreateTexture(
      renderer,
      format,
      access,
      width,
      height
    );
    if (!texture) {
      throw new SdlError("TEXTURE_CREATION_FAILED", this._SDL_GetError());
    }
    return texture;
  }

  /**
   * Destroy a texture
   */
  destroyTexture(texture: SDLPointer): void {
    this._SDL_DestroyTexture(texture);
  }

  /**
   * Update texture with pixel data
   */
  updateTexture(texture: SDLPointer, pixels: Buffer, pitch: number): void {
    this._SDL_UpdateTexture(texture, null, pixels, pitch);
  }

  /**
   * Create a texture from an SDL surface
   */
  createTextureFromSurface(
    renderer: SDLPointer,
    surface: SDLPointer
  ): SDLPointer {
    const texture = this._SDL_CreateTextureFromSurface(renderer, surface);
    if (!texture) {
      throw new SdlError("TEXTURE_CREATION_FAILED", this._SDL_GetError());
    }
    return texture;
  }

  /**
   * Set texture blend mode
   */
  setTextureBlendMode(texture: SDLPointer, blendMode: number): void {
    this._SDL_SetTextureBlendMode(texture, blendMode);
  }

  /**
   * Set texture color modulation (tint)
   */
  setTextureColorMod(
    texture: SDLPointer,
    r: number,
    g: number,
    b: number
  ): void {
    this._SDL_SetTextureColorMod(texture, r, g, b);
  }

  /**
   * Free an SDL surface
   */
  freeSurface(surface: SDLPointer): void {
    this._SDL_FreeSurface(surface);
  }

  /**
   * Get the output size of a renderer (physical pixels)
   */
  getRendererOutputSize(renderer: SDLPointer): {
    width: number;
    height: number;
  } {
    const wBuf = Buffer.alloc(INT32_BYTES);
    const hBuf = Buffer.alloc(INT32_BYTES);
    const result = this._SDL_GetRendererOutputSize(renderer, wBuf, hBuf);
    if (result !== 0) {
      return { width: 0, height: 0 };
    }
    return {
      width: wBuf.readInt32LE(0),
      height: hBuf.readInt32LE(0),
    };
  }

  /**
   * Fill a rectangle with the current draw color
   */
  renderFillRect(renderer: SDLPointer, rect: Buffer | null): void {
    this._SDL_RenderFillRect(renderer, rect);
  }

  /**
   * Set the render target (null for default window)
   */
  setRenderTarget(renderer: SDLPointer, texture: SDLPointer | null): void {
    this._SDL_SetRenderTarget(renderer, texture);
  }

  /**
   * Get drawable size (physical pixels) for HiDPI windows
   */
  getDrawableSize(window: SDLPointer): { width: number; height: number } {
    const wBuf = Buffer.alloc(INT32_BYTES);
    const hBuf = Buffer.alloc(INT32_BYTES);
    this._SDL_GL_GetDrawableSize(window, wBuf, hBuf);
    return {
      width: wBuf.readInt32LE(0),
      height: hBuf.readInt32LE(0),
    };
  }

  /**
   * Get the scale factor between logical and physical pixels
   */
  getScaleFactor(window: SDLPointer): number {
    const logical = this.getWindowSize(window);
    const physical = this.getDrawableSize(window);
    if (logical.width === 0) {
      return 1.0;
    }
    return physical.width / logical.width;
  }

  /**
   * Get the scale factor using renderer output size (more reliable for non-GL windows)
   */
  getScaleFactorFromRenderer(window: SDLPointer, renderer: SDLPointer): number {
    const logical = this.getWindowSize(window);
    const physical = this.getRendererOutputSize(renderer);
    if (logical.width === 0 || physical.width === 0) {
      return 1.0;
    }
    return physical.width / logical.width;
  }

  /**
   * Get the refresh rate of the display containing the window
   *
   * Returns the display's current refresh rate, or DEFAULT_REFRESH_RATE (60)
   * if detection fails. Works with any refresh rate including variable
   * refresh rate (VRR) displays.
   */
  getDisplayRefreshRate(window: SDLPointer): number {
    // Get which display the window is on
    const displayIndex = this._SDL_GetWindowDisplayIndex(window);
    if (displayIndex < 0) {
      return DEFAULT_REFRESH_RATE;
    }

    // Get the current display mode
    const modeBuf = Buffer.alloc(SDL_DISPLAYMODE_SIZE);
    const result = this._SDL_GetCurrentDisplayMode(displayIndex, modeBuf);
    if (result !== 0) {
      return DEFAULT_REFRESH_RATE;
    }

    // Read refresh_rate from the structure
    const refreshRate = modeBuf.readInt32LE(
      SDL_DISPLAYMODE_REFRESH_RATE_OFFSET
    );

    // SDL returns 0 if refresh rate is unspecified
    if (refreshRate <= 0) {
      return DEFAULT_REFRESH_RATE;
    }

    return refreshRate;
  }

  /**
   * Poll for pending events
   */
  pollEvent(): {
    type: number;
    windowEvent?: number;
    keycode?: number;
    pressed?: boolean;
    repeat?: boolean;
  } | null {
    const eventBuf = Buffer.alloc(SDL_EVENT_SIZE);
    const hasEvent = this._SDL_PollEvent(eventBuf);

    if (!hasEvent) {
      return null;
    }

    const type = eventBuf.readUInt32LE(0);

    if (type === SDL_WINDOWEVENT) {
      const windowEvent = eventBuf.readUInt8(SDL_WINDOW_EVENT_OFFSET);
      return { type, windowEvent };
    }

    if (type === SDL_KEYDOWN || type === SDL_KEYUP) {
      const pressed = eventBuf.readUInt8(SDL_KEY_STATE_OFFSET) === 1;
      const repeat = eventBuf.readUInt8(SDL_KEY_REPEAT_OFFSET) !== 0;
      const keycode = eventBuf.readInt32LE(SDL_KEYSYM_SYM_OFFSET);

      return { type, keycode, pressed, repeat };
    }

    return { type };
  }

  /**
   * Check if SDL is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance (lazy-loaded)
let sdlInstance: Sdl2 | null = null;

/**
 * Get the SDL2 API singleton
 */
export const getSdl2 = (): Sdl2 => {
  if (!sdlInstance) {
    sdlInstance = new Sdl2();
  }
  return sdlInstance;
};

/**
 * Check if SDL2 is available without throwing
 */
export const isSdl2Available = (): boolean => {
  try {
    getSdl2();
    return true;
  } catch {
    return false;
  }
};

/**
 * Create an SDL_Rect buffer for use with SDL functions
 */
export const createSDLRect = (
  x: number,
  y: number,
  w: number,
  h: number
): Buffer => {
  const buf = Buffer.alloc(SDL_RECT_SIZE);
  buf.writeInt32LE(x, SDL_RECT_X_OFFSET);
  buf.writeInt32LE(y, SDL_RECT_Y_OFFSET);
  buf.writeInt32LE(w, SDL_RECT_W_OFFSET);
  buf.writeInt32LE(h, SDL_RECT_H_OFFSET);
  return buf;
};

// Re-export types and constants
export type { SDLPointer, SdlKeyEvent } from "./types";
export * from "./consts";
