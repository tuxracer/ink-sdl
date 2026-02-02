/**
 * SDL2_ttf FFI Bindings
 *
 * Provides SDL2_ttf bindings for TrueType font rendering
 * using koffi for foreign function interface.
 */

import koffi from "koffi";
import { platform } from "os";
import { existsSync } from "fs";
import { find, last } from "remeda";
import { getSdl2, type SDLPointer, INT32_BYTES } from "../Sdl2";

// SDL2_ttf library paths by platform
const SDL_TTF_LIB_PATHS: Record<string, string[]> = {
  darwin: [
    "/opt/homebrew/lib/libSDL2_ttf.dylib", // Homebrew ARM
    "/usr/local/lib/libSDL2_ttf.dylib", // Homebrew Intel
    "/opt/local/lib/libSDL2_ttf.dylib", // MacPorts
    "libSDL2_ttf.dylib", // System path
  ],
  linux: [
    "/usr/lib/x86_64-linux-gnu/libSDL2_ttf-2.0.so.0", // Debian/Ubuntu x64
    "/usr/lib/aarch64-linux-gnu/libSDL2_ttf-2.0.so.0", // Debian/Ubuntu ARM64
    "/usr/lib64/libSDL2_ttf-2.0.so.0", // Fedora/RHEL
    "/usr/lib/libSDL2_ttf-2.0.so.0", // Arch
    "libSDL2_ttf-2.0.so.0", // System path
  ],
  win32: ["SDL2_ttf.dll", "C:\\Windows\\System32\\SDL2_ttf.dll"],
};

/**
 * Check if a path is a system path (no directory, let koffi search)
 */
const isSystemPath = (p: string): boolean =>
  !p.includes("/") && !p.includes("\\");

/**
 * Find a library path for the current platform
 */
const findLibrary = (pathMap: Record<string, string[]>): string | null => {
  const plat = platform();
  const paths = pathMap[plat] ?? [];

  // Try paths in order: system paths are accepted immediately,
  // paths with directories must exist on disk
  const foundPath = find(paths, (p) => isSystemPath(p) || existsSync(p));

  return foundPath ?? last(paths) ?? null;
};

/**
 * Find the SDL2_ttf library path for the current platform
 */
const findSDLTtfLibrary = (): string | null => {
  return findLibrary(SDL_TTF_LIB_PATHS);
};

/**
 * SDL_ttf API wrapper class for TrueType font rendering
 */
export class SdlTtf {
  private lib: koffi.IKoffiLib;
  private initialized = false;

  // TTF functions
  private _TTF_Init!: () => number;
  private _TTF_Quit!: () => void;
  private _TTF_OpenFont!: (file: string, ptsize: number) => SDLPointer;
  private _TTF_CloseFont!: (font: SDLPointer) => void;
  private _TTF_RenderUTF8_Blended!: (
    font: SDLPointer,
    text: string,
    fg: { r: number; g: number; b: number; a: number }
  ) => SDLPointer;
  private _TTF_SizeUTF8!: (
    font: SDLPointer,
    text: string,
    w: Buffer,
    h: Buffer
  ) => number;
  private _TTF_SetFontStyle!: (font: SDLPointer, style: number) => void;
  private _TTF_GetFontStyle!: (font: SDLPointer) => number;

  constructor() {
    const libPath = findSDLTtfLibrary();
    if (!libPath) {
      throw new Error(
        "SDL2_ttf library not found. Please install SDL2_ttf:\n" +
          "  macOS: brew install sdl2_ttf\n" +
          "  Linux: apt install libsdl2-ttf-2.0-0 (or equivalent)\n" +
          "  Windows: Download SDL2_ttf.dll from libsdl.org"
      );
    }

    try {
      this.lib = koffi.load(libPath);
      this.bindFunctions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to load SDL2_ttf library from ${libPath}: ${message}`
      );
    }
  }

  private bindFunctions(): void {
    this._TTF_Init = this.lib.func("int TTF_Init()");
    this._TTF_Quit = this.lib.func("void TTF_Quit()");
    this._TTF_OpenFont = this.lib.func(
      "void* TTF_OpenFont(const char* file, int ptsize)"
    );
    this._TTF_CloseFont = this.lib.func("void TTF_CloseFont(void* font)");

    // Define SDL_Color struct for proper ABI handling on ARM64
    koffi.struct("SDL_Color", {
      r: "uint8_t",
      g: "uint8_t",
      b: "uint8_t",
      a: "uint8_t",
    });

    // TTF_RenderUTF8_Blended takes SDL_Color by value
    this._TTF_RenderUTF8_Blended = this.lib.func(
      "void* TTF_RenderUTF8_Blended(void* font, const char* text, SDL_Color fg)"
    ) as unknown as (
      font: SDLPointer,
      text: string,
      fg: { r: number; g: number; b: number; a: number }
    ) => SDLPointer;

    this._TTF_SizeUTF8 = this.lib.func(
      "int TTF_SizeUTF8(void* font, const char* text, int* w, int* h)"
    );

    this._TTF_SetFontStyle = this.lib.func(
      "void TTF_SetFontStyle(void* font, int style)"
    );
    this._TTF_GetFontStyle = this.lib.func("int TTF_GetFontStyle(void* font)");
  }

  /**
   * Initialize SDL_ttf
   */
  init(): boolean {
    if (this.initialized) {
      return true;
    }

    const result = this._TTF_Init();
    if (result !== 0) {
      return false;
    }

    this.initialized = true;
    return true;
  }

  /**
   * Shutdown SDL_ttf
   */
  quit(): void {
    if (this.initialized) {
      this._TTF_Quit();
      this.initialized = false;
    }
  }

  /**
   * Get the last SDL_ttf error message
   */
  getError(): string {
    return getSdl2().getError();
  }

  /**
   * Open a TrueType font file
   */
  openFont(file: string, ptsize: number): SDLPointer {
    const font = this._TTF_OpenFont(file, ptsize);
    if (!font) {
      throw new Error(`TTF_OpenFont failed: ${getSdl2().getError()}`);
    }
    return font;
  }

  /**
   * Close a font
   */
  closeFont(font: SDLPointer): void {
    this._TTF_CloseFont(font);
  }

  /**
   * Render UTF-8 text to a surface with blended (anti-aliased) rendering
   */
  renderTextBlended(
    font: SDLPointer,
    text: string,
    r: number,
    g: number,
    b: number,
    a: number = 255
  ): SDLPointer {
    const color = { r, g, b, a };
    const surface = this._TTF_RenderUTF8_Blended(font, text, color);
    if (!surface) {
      throw new Error(`TTF_RenderUTF8_Blended failed: ${getSdl2().getError()}`);
    }
    return surface;
  }

  /**
   * Get the dimensions of rendered text without actually rendering
   */
  sizeText(font: SDLPointer, text: string): { width: number; height: number } {
    const wBuf = Buffer.alloc(INT32_BYTES);
    const hBuf = Buffer.alloc(INT32_BYTES);
    const result = this._TTF_SizeUTF8(font, text, wBuf, hBuf);
    if (result !== 0) {
      return { width: 0, height: 0 };
    }
    return {
      width: wBuf.readInt32LE(0),
      height: hBuf.readInt32LE(0),
    };
  }

  /**
   * Check if SDL_ttf is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set font style (bold, italic, underline, strikethrough)
   */
  setFontStyle(font: SDLPointer, style: number): void {
    this._TTF_SetFontStyle(font, style);
  }

  /**
   * Get current font style
   */
  getFontStyle(font: SDLPointer): number {
    return this._TTF_GetFontStyle(font);
  }
}

// TTF Style constants
export const TTF_STYLE_NORMAL = 0x00;
export const TTF_STYLE_BOLD = 0x01;
export const TTF_STYLE_ITALIC = 0x02;
export const TTF_STYLE_UNDERLINE = 0x04;
export const TTF_STYLE_STRIKETHROUGH = 0x08;

// Singleton instance (lazy-loaded)
let ttfInstance: SdlTtf | null = null;

/**
 * Get the SDL_ttf API singleton
 */
export const getSdlTtf = (): SdlTtf => {
  if (!ttfInstance) {
    ttfInstance = new SdlTtf();
  }
  return ttfInstance;
};

/**
 * Check if SDL_ttf is available without throwing
 */
export const isSdlTtfAvailable = (): boolean => {
  try {
    getSdlTtf();
    return true;
  } catch {
    return false;
  }
};
