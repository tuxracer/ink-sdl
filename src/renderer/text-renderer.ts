/**
 * SDL Text Renderer
 *
 * Handles TrueType font loading and text rendering with glyph caching
 * for efficient SDL UI rendering.
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { sortBy, take } from "remeda";
import {
  getSDL2,
  getSDL_ttf,
  createSDLRect,
  SDL_BLENDMODE_BLEND,
} from "../sdl";
import type { SDLPointer } from "../sdl";
import type { Color } from "./ansi-parser";
import {
  COLOR_CHANNEL_MAX,
  DEFAULT_FONT_SIZE,
  MAX_GLYPH_CACHE_SIZE,
  GLYPH_CACHE_EVICT_DIVISOR,
  SCALE_FACTOR_EPSILON,
  PACK_RED_SHIFT,
  PACK_GREEN_SHIFT,
} from "./consts";

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
  private sdl = getSDL2();
  private ttf = getSDL_ttf();
  private font: SDLPointer | null = null;
  private renderer: SDLPointer;
  private baseFontSize: number;
  private scaleFactor: number;
  private glyphCache = new Map<string, CachedGlyph>();
  private accessCounter = 0;
  private charWidth = 0;
  private charHeight = 0;

  constructor(
    renderer: SDLPointer,
    options: {
      fontSize?: number;
      scaleFactor?: number;
      fontPath?: string;
    } = {}
  ) {
    this.renderer = renderer;
    this.baseFontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
    this.scaleFactor = options.scaleFactor ?? 1.0;

    // Initialize SDL_ttf
    if (!this.ttf.isInitialized()) {
      this.ttf.init();
    }

    // Load font
    const fontPath = options.fontPath ?? this.getDefaultFontPath();
    this.loadFont(fontPath);
  }

  /**
   * Get the path to the bundled Cozette font
   */
  private getDefaultFontPath(): string {
    const currentFilename = fileURLToPath(import.meta.url);
    const currentDirname = dirname(currentFilename);

    // Try multiple locations:
    // 1. Development: src/fonts/ relative to this file
    // 2. Bundled: fonts/ relative to dist
    const paths = [
      resolve(currentDirname, "../fonts/CozetteVector.ttf"), // Dev path
      resolve(currentDirname, "./fonts/CozetteVector.ttf"), // Bundled (dist)
      resolve(currentDirname, "../../src/fonts/CozetteVector.ttf"), // Alternate
    ];

    for (const p of paths) {
      try {
        if (existsSync(p)) {
          return p;
        }
      } catch {
        // Continue to next path
      }
    }

    // Fallback: return first path (will error if not found)
    return paths[0]!;
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
    // Apply scaleFactor twice:
    // 1. Once to increase logical size (so UI is larger on HiDPI displays)
    // 2. Once for physical pixel density (for crisp rendering)
    const physicalSize = Math.round(
      this.baseFontSize * this.scaleFactor * this.scaleFactor
    );
    this.font = this.ttf.openFont(fontPath, physicalSize);

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

    // Reload font at new size
    const fontPath = this.getDefaultFontPath();
    this.loadFont(fontPath);
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
  private getCacheKey(char: string, r: number, g: number, b: number): string {
    // Pack color into a single number for faster key generation
    const packedColor = (r << PACK_RED_SHIFT) | (g << PACK_GREEN_SHIFT) | b;
    return `${char}:${packedColor}`;
  }

  /**
   * Get or create a cached glyph texture
   */
  private getGlyph(
    char: string,
    r: number,
    g: number,
    b: number
  ): CachedGlyph | null {
    const key = this.getCacheKey(char, r, g, b);

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
      // Render text to surface with WHITE color
      // We'll apply the actual color via texture color mod
      const surface = this.ttf.renderTextBlended(
        this.font,
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
      const dims = this.ttf.sizeText(this.font, char);

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
  renderChar(char: string, x: number, y: number, color: Color): void {
    const glyph = this.getGlyph(char, color.r, color.g, color.b);
    if (!glyph) {
      return;
    }

    const destRect = createSDLRect(x, y, glyph.width, glyph.height);
    this.sdl.renderCopy(this.renderer, glyph.texture, null, destRect);
  }

  /**
   * Render a string of text at the specified position
   */
  renderText(text: string, x: number, y: number, color: Color): void {
    let cursorX = x;

    for (const char of text) {
      if (char === " ") {
        cursorX += this.charWidth;
        continue;
      }

      this.renderChar(char, cursorX, y, color);
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
  }
}
