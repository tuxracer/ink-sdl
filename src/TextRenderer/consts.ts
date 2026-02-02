/**
 * TextRenderer Constants
 */

/** Maximum number of glyphs to cache */
export const MAX_GLYPH_CACHE_SIZE = 1000;

/** Fraction of cache to evict when full (1/4 = 25%) */
export const GLYPH_CACHE_EVICT_DIVISOR = 4;

/** Bit shift for red channel when packing RGB into 24-bit number */
export const PACK_RED_SHIFT = 16;

/** Bit shift for green channel when packing RGB into 24-bit number */
export const PACK_GREEN_SHIFT = 8;
