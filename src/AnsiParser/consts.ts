/**
 * AnsiParser Constants
 */

/** Number of standard (non-bright) colors in ANSI 16 palette */
export const ANSI_STANDARD_COLOR_COUNT = 8;

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

/** Red channel multiplier in 6x6x6 cube */
export const ANSI_CUBE_RED_MULTIPLIER = 36;

/** Number of levels per channel in 6x6x6 color cube (0-5) */
export const ANSI_256_COLOR_LEVELS = 6;

/** Cube step size for non-zero values */
export const ANSI_CUBE_STEP = 40;

/** Cube base for non-zero values */
export const ANSI_CUBE_BASE = 55;
