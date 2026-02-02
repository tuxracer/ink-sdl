/**
 * Renderer Constants
 */

// =============================================================================
// Window Dimensions
// =============================================================================

/** Default window width in pixels */
export const DEFAULT_WINDOW_WIDTH = 800;

/** Default window height in pixels */
export const DEFAULT_WINDOW_HEIGHT = 600;

/** Default terminal columns */
export const DEFAULT_COLUMNS = 80;

/** Default terminal rows */
export const DEFAULT_ROWS = 24;

/** Minimum terminal columns */
export const MIN_COLUMNS = 40;

/** Minimum terminal rows */
export const MIN_ROWS = 10;

// =============================================================================
// Font Constants
// =============================================================================

/** Default font size in points */
export const DEFAULT_FONT_SIZE = 13;

// =============================================================================
// Glyph Cache
// =============================================================================

/** Maximum number of glyphs to cache */
export const MAX_GLYPH_CACHE_SIZE = 1000;

/** Fraction of cache to evict when full (1/4 = 25%) */
export const GLYPH_CACHE_EVICT_DIVISOR = 4;

// =============================================================================
// Color Constants
// =============================================================================

/** Maximum value for 8-bit color channel */
export const COLOR_CHANNEL_MAX = 255;

/** Number of standard (non-bright) colors in ANSI 16 palette */
export const ANSI_STANDARD_COLOR_COUNT = 8;

// =============================================================================
// Style Multipliers
// =============================================================================

/** Bold text brightness multiplier */
export const BOLD_BRIGHTNESS_MULTIPLIER = 1.3;

/** Dim text brightness multiplier */
export const DIM_BRIGHTNESS_MULTIPLIER = 0.5;

// =============================================================================
// Scale Factor
// =============================================================================

/** Epsilon for scale factor comparison */
export const SCALE_FACTOR_EPSILON = 0.01;

// =============================================================================
// ANSI Parser Constants
// =============================================================================

/** Tab stop width in columns */
export const ANSI_TAB_WIDTH = 8;

/** ANSI erase display mode: clear entire screen */
export const ANSI_ERASE_ENTIRE_SCREEN = 2;

/** ANSI erase display mode: clear to end and beyond */
export const ANSI_ERASE_TO_END_AND_BEYOND = 3;

/** Extended color parse offset increment for 256-color mode */
export const ANSI_EXTENDED_COLOR_OFFSET_256 = 2;

/** Extended RGB color check: need at least 3 more params (R, G, B) */
export const ANSI_EXTENDED_RGB_MIN_PARAMS = 3;

/** Extended RGB color parse offset increment */
export const ANSI_EXTENDED_COLOR_OFFSET_RGB = 4;

/** Extended RGB R offset from mode */
export const ANSI_RGB_R_OFFSET = 1;

/** Extended RGB G offset from mode */
export const ANSI_RGB_G_OFFSET = 2;

/** Extended RGB B offset from mode */
export const ANSI_RGB_B_OFFSET = 3;

// =============================================================================
// ANSI 256 Color Cube Constants
// =============================================================================

/** Red channel multiplier in 6x6x6 cube */
export const ANSI_CUBE_RED_MULTIPLIER = 36;

/** Number of levels per channel in 6x6x6 color cube (0-5) */
export const ANSI_256_COLOR_LEVELS = 6;

/** Cube step size for non-zero values */
export const ANSI_CUBE_STEP = 40;

/** Cube base for non-zero values */
export const ANSI_CUBE_BASE = 55;

// =============================================================================
// Color Packing Constants
// =============================================================================

/** Bit shift for red channel when packing RGB into 24-bit number */
export const PACK_RED_SHIFT = 16;

/** Bit shift for green channel when packing RGB into 24-bit number */
export const PACK_GREEN_SHIFT = 8;
