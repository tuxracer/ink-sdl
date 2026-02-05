/**
 * AnsiParser Constants
 */

import type { Color } from "./types";

/** Default foreground color (white) */
export const DEFAULT_FG: Color = { r: 255, g: 255, b: 255 };

/** Default background color (black) */
export const DEFAULT_BG: Color = { r: 0, g: 0, b: 0 };

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

/** ANSI 16 basic colors (normal intensity) */
export const ANSI_COLORS_NORMAL: Color[] = [
  { r: 0, g: 0, b: 0 }, // 0: Black
  { r: 187, g: 0, b: 0 }, // 1: Red
  { r: 0, g: 187, b: 0 }, // 2: Green
  { r: 187, g: 187, b: 0 }, // 3: Yellow
  { r: 0, g: 0, b: 187 }, // 4: Blue
  { r: 187, g: 0, b: 187 }, // 5: Magenta
  { r: 0, g: 187, b: 187 }, // 6: Cyan
  { r: 187, g: 187, b: 187 }, // 7: White
];

/** ANSI 16 basic colors (bright/bold intensity) */
export const ANSI_COLORS_BRIGHT: Color[] = [
  { r: 85, g: 85, b: 85 }, // 8: Bright Black (Gray)
  { r: 255, g: 85, b: 85 }, // 9: Bright Red
  { r: 85, g: 255, b: 85 }, // 10: Bright Green
  { r: 255, g: 255, b: 85 }, // 11: Bright Yellow
  { r: 85, g: 85, b: 255 }, // 12: Bright Blue
  { r: 255, g: 85, b: 255 }, // 13: Bright Magenta
  { r: 85, g: 255, b: 255 }, // 14: Bright Cyan
  { r: 255, g: 255, b: 255 }, // 15: Bright White
];

/** SGR code constants */
export const SGR_RESET = 0;
export const SGR_BOLD = 1;
export const SGR_DIM = 2;
export const SGR_ITALIC = 3;
export const SGR_UNDERLINE = 4;
export const SGR_REVERSE = 7;
export const SGR_STRIKETHROUGH = 9;
export const SGR_NORMAL_INTENSITY = 22;
export const SGR_NO_ITALIC = 23;
export const SGR_NO_UNDERLINE = 24;
export const SGR_NO_REVERSE = 27;
export const SGR_NO_STRIKETHROUGH = 29;
export const SGR_FG_BASE = 30;
export const SGR_FG_END = 37;
export const SGR_FG_DEFAULT = 39;
export const SGR_BG_BASE = 40;
export const SGR_BG_END = 47;
export const SGR_BG_DEFAULT = 49;
export const SGR_FG_BRIGHT_BASE = 90;
export const SGR_FG_BRIGHT_END = 97;
export const SGR_BG_BRIGHT_BASE = 100;
export const SGR_BG_BRIGHT_END = 107;
export const SGR_EXTENDED = 38;
export const SGR_EXTENDED_BG = 48;
export const EXTENDED_256 = 5;
export const EXTENDED_RGB = 2;

/** ANSI 256 color cube constants */
export const COLOR_CUBE_START = 16;
export const COLOR_CUBE_END = 231;
export const GRAYSCALE_START = 232;
export const GRAYSCALE_END = 255;
export const GRAYSCALE_STEP = 10;
export const GRAYSCALE_BASE = 8;
