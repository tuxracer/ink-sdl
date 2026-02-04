/**
 * SDL Text Renderer
 *
 * Handles TrueType font loading and text rendering with glyph caching
 * for efficient SDL UI rendering.
 */

import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { platform, homedir } from "os";
import { flatMap, sortBy, take } from "remeda";
import { getSdl2, createSDLRect, SDL_BLENDMODE_BLEND } from "../Sdl2";
import { getSdlTtf, TTF_STYLE_NORMAL, TTF_STYLE_ITALIC } from "../SdlTtf";
import type { SDLPointer } from "../Sdl2";
import type { Color } from "../AnsiParser";
import {
  COLOR_CHANNEL_MAX,
  DEFAULT_FONT_SIZE,
  SCALE_FACTOR_EPSILON,
} from "../consts";
import {
  DEFAULT_FONT_FILENAME,
  MAX_GLYPH_CACHE_SIZE,
  GLYPH_CACHE_EVICT_DIVISOR,
  PACK_RED_SHIFT,
  PACK_GREEN_SHIFT,
  FALLBACK_FONTS,
  EMOJI_FONTS,
  EMOJI_FONT_SCALE,
} from "./consts";
import { FontError } from "../utils/FontError";

/**
 * Find the first existing path from a list of candidates
 */
const findFirstExisting = (paths: string[]): string | null => {
  for (const p of paths) {
    try {
      if (existsSync(p)) {
        return p;
      }
    } catch {
      // Continue to next path
    }
  }
  return null;
};

/**
 * Get platform-specific paths from a path map
 */
const getPlatformPaths = (
  pathMap: Record<string, readonly string[]>
): string[] => {
  const plat = platform();
  return [...(pathMap[plat] ?? [])];
};

/**
 * Cached glyph texture with metadata
 */
interface CachedGlyph {
  texture: SDLPointer;
  width: number;
  height: number;
  lastUsed: number;
}

/**
 * SDL Text Renderer
 *
 * Loads TTF fonts and renders text with glyph caching for performance.
 * Supports HiDPI displays by scaling font size based on scale factor.
 */
export class TextRenderer {
  private sdl = getSdl2();
  private ttf = getSdlTtf();
  private font: SDLPointer | null = null;
  private fallbackFont: SDLPointer | null = null;
  private renderer: SDLPointer;
  private baseFontSize: number;
  private scaleFactor: number;
  private glyphCache = new Map<string, CachedGlyph>();
  private accessCounter = 0;
  private charWidth = 0;
  private charHeight = 0;
  private currentFontPath: string | null = null;

  constructor(
    renderer: SDLPointer,
    options: {
      fontSize?: number;
      scaleFactor?: number;
      fontPath?: string;
      fontName?: string;
      systemFont?: boolean;
    } = {}
  ) {
    this.renderer = renderer;
    this.baseFontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
    this.scaleFactor = options.scaleFactor ?? 1.0;

    // Initialize SDL_ttf
    if (!this.ttf.isInitialized()) {
      this.ttf.init();
    }

    // Load font with fallback support
    // Priority: fontPath > fontName > systemFont > default (Cozette)
    let fontPath: string;
    if (options.fontPath) {
      fontPath = options.fontPath;
    } else if (options.fontName) {
      fontPath = this.findFontByName(options.fontName);
    } else if (options.systemFont) {
      fontPath = this.findSystemFont();
    } else {
      fontPath = this.findAvailableFont();
    }
    this.loadFont(fontPath);

    // Load fallback emoji font if available
    this.loadFallbackFont();
  }

  /**
   * Get system font directories for the current platform
   */
  private getSystemFontDirectories(): string[] {
    const home = homedir();
    const plat = platform();

    if (plat === "darwin") {
      return [
        join(home, "Library/Fonts"),
        "/Library/Fonts",
        "/System/Library/Fonts",
        "/System/Library/Fonts/Supplemental",
      ];
    }

    if (plat === "linux") {
      return [
        join(home, ".fonts"),
        join(home, ".local/share/fonts"),
        "/usr/share/fonts/truetype",
        "/usr/share/fonts/TTF",
        "/usr/local/share/fonts",
      ];
    }

    if (plat === "win32") {
      return ["C:\\Windows\\Fonts"];
    }

    return [];
  }

  /**
   * Get system font paths for the default font filename
   */
  private getSystemFontPaths(): string[] {
    return this.getSystemFontDirectories().map((dir) =>
      join(dir, DEFAULT_FONT_FILENAME)
    );
  }

  /**
   * Find a font by name in system font directories
   *
   * Searches for common font file extensions (.ttf, .ttc, .otf)
   */
  private findFontByName(fontName: string): string {
    const extensions = [".ttf", ".ttc", ".otf", ".TTC", ".TTF", ".OTF"];
    const directories = this.getSystemFontDirectories();

    const paths = flatMap(directories, (dir) =>
      extensions.map((ext) => join(dir, `${fontName}${ext}`))
    );

    const fontPath = findFirstExisting(paths);
    if (fontPath) {
      return fontPath;
    }

    // If not found, throw a helpful error
    throw new FontError(
      "NOT_FOUND",
      `Font "${fontName}" not found. Searched: ${directories.join(", ")}`
    );
  }

  /**
   * Get the path to the Cozette font (system or bundled)
   */
  private getDefaultFontPath(): string {
    // First, check system font directories
    const systemPath = findFirstExisting(this.getSystemFontPaths());
    if (systemPath) {
      return systemPath;
    }

    // Fall back to bundled font
    const currentFilename = fileURLToPath(import.meta.url);
    const currentDirname = dirname(currentFilename);

    const bundledPaths = [
      resolve(currentDirname, "../../fonts", DEFAULT_FONT_FILENAME), // Dev path
      resolve(currentDirname, "./fonts", DEFAULT_FONT_FILENAME), // Bundled (dist)
      resolve(currentDirname, "../fonts", DEFAULT_FONT_FILENAME), // Alternate
    ];

    // Return first existing bundled path, or first path (will error if not found)
    return findFirstExisting(bundledPaths) ?? bundledPaths[0]!;
  }

  /**
   * Get fallback fonts for the current platform
   */
  private getFallbackFontPaths(): string[] {
    return getPlatformPaths(FALLBACK_FONTS);
  }

  /**
   * Find an available font, trying default first then fallbacks
   */
  private findAvailableFont(): string {
    // Try the default Cozette font first
    const defaultPath = this.getDefaultFontPath();

    // Try default, then platform-specific fallbacks
    return (
      findFirstExisting([defaultPath, ...this.getFallbackFontPaths()]) ??
      defaultPath
    );
  }

  /**
   * Find a system font, skipping the default bundled font
   */
  private findSystemFont(): string {
    // Try platform-specific fallback fonts, fall back to default if none found
    return (
      findFirstExisting(this.getFallbackFontPaths()) ??
      this.getDefaultFontPath()
    );
  }

  /**
   * Get emoji font paths for the current platform
   */
  private getEmojiFontPaths(): string[] {
    return getPlatformPaths(EMOJI_FONTS);
  }

  /**
   * Find an available emoji font
   */
  private findEmojiFont(): string | null {
    return findFirstExisting(this.getEmojiFontPaths());
  }

  /**
   * Load the fallback emoji font if available
   */
  private loadFallbackFont(): void {
    if (this.fallbackFont) {
      this.ttf.closeFont(this.fallbackFont);
      this.fallbackFont = null;
    }

    const emojiFontPath = this.findEmojiFont();
    if (!emojiFontPath) {
      return;
    }

    // Scale emoji font size to better match primary font metrics
    const physicalSize = Math.round(
      this.baseFontSize * this.scaleFactor * EMOJI_FONT_SCALE
    );

    try {
      this.fallbackFont = this.ttf.openFont(emojiFontPath, physicalSize);
    } catch {
      // Emoji font failed to load, continue without it
      this.fallbackFont = null;
    }
  }

  /**
   * Load a TTF font at the current scaled size
   */
  private loadFont(fontPath: string): void {
    if (this.font) {
      this.ttf.closeFont(this.font);
      this.font = null;
    }

    // Clear glyph cache when font changes
    this.clearCache();

    // Calculate physical font size for HiDPI
    // Scale by the display's scale factor so the font renders at native resolution
    // while maintaining the same visual size (e.g., 11pt stays 11pt visually)
    const physicalSize = Math.round(this.baseFontSize * this.scaleFactor);

    try {
      this.font = this.ttf.openFont(fontPath, physicalSize);
      this.currentFontPath = fontPath;
    } catch (error) {
      const fallbackPaths = this.getFallbackFontPaths();
      const triedPaths = [fontPath, ...fallbackPaths].join(", ");
      const originalError =
        error instanceof Error ? error.message : String(error);
      throw new FontError(
        "LOAD_FAILED",
        `${fontPath} (tried: ${triedPaths}). ${originalError}`
      );
    }

    // Get character dimensions (use 'M' as reference)
    const dims = this.ttf.sizeText(this.font, "M");
    this.charWidth = dims.width;
    this.charHeight = dims.height;
  }

  /**
   * Update scale factor (for HiDPI display changes)
   */
  updateScaleFactor(scaleFactor: number): void {
    if (Math.abs(scaleFactor - this.scaleFactor) < SCALE_FACTOR_EPSILON) {
      return;
    }

    this.scaleFactor = scaleFactor;

    // Reload font at new size using the current font path
    const fontPath = this.currentFontPath ?? this.findAvailableFont();
    this.loadFont(fontPath);

    // Reload fallback font at new size
    this.loadFallbackFont();
  }

  /**
   * Get character dimensions
   */
  getCharDimensions(): { width: number; height: number } {
    return { width: this.charWidth, height: this.charHeight };
  }

  /**
   * Generate cache key for a glyph
   */
  private getCacheKey(
    char: string,
    r: number,
    g: number,
    b: number,
    italic: boolean
  ): string {
    // Pack color into a single number for faster key generation
    const packedColor = (r << PACK_RED_SHIFT) | (g << PACK_GREEN_SHIFT) | b;
    return `${char}:${packedColor}:${italic ? "i" : "n"}`;
  }

  /**
   * Get or create a cached glyph texture
   */
  private getGlyph(
    char: string,
    r: number,
    g: number,
    b: number,
    italic: boolean = false
  ): CachedGlyph | null {
    const key = this.getCacheKey(char, r, g, b, italic);

    // Check cache
    const cached = this.glyphCache.get(key);
    if (cached) {
      cached.lastUsed = this.accessCounter++;
      return cached;
    }

    // Render new glyph
    if (!this.font) {
      return null;
    }

    try {
      // Get the Unicode codepoint for the character
      const codepoint = char.codePointAt(0) ?? 0;

      // Choose font: use fallback if primary doesn't have the glyph
      let fontToUse = this.font;
      if (
        this.fallbackFont &&
        !this.ttf.glyphIsProvided(this.font, codepoint) &&
        this.ttf.glyphIsProvided(this.fallbackFont, codepoint)
      ) {
        fontToUse = this.fallbackFont;
      }

      // Apply font style for italic (only for primary font)
      if (fontToUse === this.font) {
        const currentStyle = this.ttf.getFontStyle(this.font);
        const targetStyle = italic ? TTF_STYLE_ITALIC : TTF_STYLE_NORMAL;
        if (currentStyle !== targetStyle) {
          this.ttf.setFontStyle(this.font, targetStyle);
        }
      }

      // Render text to surface with WHITE color
      // We'll apply the actual color via texture color mod
      const surface = this.ttf.renderTextBlended(
        fontToUse,
        char,
        COLOR_CHANNEL_MAX, // White
        COLOR_CHANNEL_MAX,
        COLOR_CHANNEL_MAX,
        COLOR_CHANNEL_MAX
      );

      // Create texture from surface
      const texture = this.sdl.createTextureFromSurface(this.renderer, surface);

      // Set blend mode to properly render alpha channel
      this.sdl.setTextureBlendMode(texture, SDL_BLENDMODE_BLEND);

      // Apply the actual color via texture color modulation
      this.sdl.setTextureColorMod(texture, r, g, b);

      // Get surface dimensions from rendered text
      const dims = this.ttf.sizeText(fontToUse, char);

      // Free surface (texture now owns the pixel data)
      this.sdl.freeSurface(surface);

      // Cache the glyph
      const glyph: CachedGlyph = {
        texture,
        width: dims.width,
        height: dims.height,
        lastUsed: this.accessCounter++,
      };

      // Evict old entries if cache is full
      if (this.glyphCache.size >= MAX_GLYPH_CACHE_SIZE) {
        this.evictOldGlyphs();
      }

      this.glyphCache.set(key, glyph);
      return glyph;
    } catch {
      return null;
    }
  }

  /**
   * Evict least recently used glyphs
   */
  private evictOldGlyphs(): void {
    const entries = sortBy(
      [...this.glyphCache.entries()],
      ([, glyph]) => glyph.lastUsed
    );

    const removeCount = Math.floor(
      MAX_GLYPH_CACHE_SIZE / GLYPH_CACHE_EVICT_DIVISOR
    );

    for (const [key, glyph] of take(entries, removeCount)) {
      this.sdl.destroyTexture(glyph.texture);
      this.glyphCache.delete(key);
    }
  }

  /**
   * Render a single character at the specified position
   */
  renderChar(
    char: string,
    x: number,
    y: number,
    color: Color,
    italic: boolean = false
  ): void {
    const glyph = this.getGlyph(char, color.r, color.g, color.b, italic);
    if (!glyph) {
      return;
    }

    // Scale oversized glyphs (e.g., emoji) to fit within character cell
    let destWidth = glyph.width;
    let destHeight = glyph.height;
    let destX = x;
    const destY = y;

    if (glyph.height > this.charHeight) {
      const scale = this.charHeight / glyph.height;
      destWidth = Math.round(glyph.width * scale);
      destHeight = this.charHeight;
      // Center horizontally within character cell
      destX = x + Math.round((this.charWidth - destWidth) / 2);
    }

    const destRect = createSDLRect(destX, destY, destWidth, destHeight);
    this.sdl.renderCopy(this.renderer, glyph.texture, null, destRect);
  }

  /**
   * Render a string of text at the specified position
   */
  renderText(
    text: string,
    x: number,
    y: number,
    color: Color,
    italic: boolean = false
  ): void {
    let cursorX = x;

    for (const char of text) {
      if (char === " ") {
        cursorX += this.charWidth;
        continue;
      }

      this.renderChar(char, cursorX, y, color, italic);
      cursorX += this.charWidth;
    }
  }

  /**
   * Get text dimensions
   */
  measureText(text: string): { width: number; height: number } {
    if (!this.font) {
      return { width: 0, height: 0 };
    }
    return this.ttf.sizeText(this.font, text);
  }

  /**
   * Clear the glyph cache
   */
  clearCache(): void {
    for (const glyph of this.glyphCache.values()) {
      this.sdl.destroyTexture(glyph.texture);
    }
    this.glyphCache.clear();
    this.accessCounter = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.glyphCache.size,
      maxSize: MAX_GLYPH_CACHE_SIZE,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearCache();
    if (this.font) {
      this.ttf.closeFont(this.font);
      this.font = null;
    }
    if (this.fallbackFont) {
      this.ttf.closeFont(this.fallbackFont);
      this.fallbackFont = null;
    }
  }
}
