/**
 * TextRenderer Constants
 */

/** Default font filename */
export const DEFAULT_FONT_FILENAME = "CozetteVector.ttf";

/** Maximum number of glyphs to cache */
export const MAX_GLYPH_CACHE_SIZE = 1000;

/** Fraction of cache to evict when full (1/4 = 25%) */
export const GLYPH_CACHE_EVICT_DIVISOR = 4;

/** Bit shift for red channel when packing RGB into 24-bit number */
export const PACK_RED_SHIFT = 16;

/** Bit shift for green channel when packing RGB into 24-bit number */
export const PACK_GREEN_SHIFT = 8;

/**
 * Fallback monospace fonts by platform
 *
 * These are common system fonts to try if the default font fails to load.
 */
export const FALLBACK_FONTS = {
  darwin: [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Monaco.ttf",
    "/System/Library/Fonts/Courier.dfont",
  ],
  linux: [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeMono.ttf",
  ],
  win32: [
    "C:\\Windows\\Fonts\\consola.ttf",
    "C:\\Windows\\Fonts\\cour.ttf",
    "C:\\Windows\\Fonts\\lucon.ttf",
  ],
} as const;
