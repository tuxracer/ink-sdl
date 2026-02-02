/**
 * SDL Constants
 *
 * SDL initialization flags, window flags, event types, keycodes,
 * and buffer layout offsets for FFI struct access.
 */

// =============================================================================
// SDL Initialization Flags
// =============================================================================

/** Initialize video subsystem */
export const SDL_INIT_VIDEO = 0x00000020;

/** Initialize events subsystem */
export const SDL_INIT_EVENTS = 0x00004000;

// =============================================================================
// SDL Window Flags
// =============================================================================

/** Fullscreen window (changes display mode) */
export const SDL_WINDOW_FULLSCREEN = 0x00000001;

/** Show window immediately */
export const SDL_WINDOW_SHOWN = 0x00000004;

/** Window has no decorations (borderless) */
export const SDL_WINDOW_BORDERLESS = 0x00000010;

/** Window can be resized */
export const SDL_WINDOW_RESIZABLE = 0x00000020;

/** Enable HiDPI support */
export const SDL_WINDOW_ALLOW_HIGHDPI = 0x00002000;

/** Desktop fullscreen modifier flag */
const SDL_WINDOW_FULLSCREEN_DESKTOP_MODIFIER = 0x00001000;

/** Fullscreen window at desktop resolution (borderless fullscreen) */
export const SDL_WINDOW_FULLSCREEN_DESKTOP =
  SDL_WINDOW_FULLSCREEN | SDL_WINDOW_FULLSCREEN_DESKTOP_MODIFIER;

/** Center window on screen */
export const SDL_WINDOWPOS_CENTERED = 0x2fff0000;

// =============================================================================
// SDL Renderer Flags
// =============================================================================

/** Use hardware acceleration */
export const SDL_RENDERER_ACCELERATED = 0x00000002;

/** Synchronize to vertical refresh */
export const SDL_RENDERER_PRESENTVSYNC = 0x00000004;

/** Use software rendering fallback */
export const SDL_RENDERER_SOFTWARE = 0x00000001;

// =============================================================================
// SDL Texture Access
// =============================================================================

/** Texture can be locked for direct pixel access */
export const SDL_TEXTUREACCESS_STREAMING = 1;

/** Texture can be used as a render target */
export const SDL_TEXTUREACCESS_TARGET = 2;

// =============================================================================
// SDL Blend Modes
// =============================================================================

/** Alpha blending: dstRGB = (srcRGB * srcA) + (dstRGB * (1-srcA)) */
export const SDL_BLENDMODE_BLEND = 1;

// =============================================================================
// SDL Pixel Formats
// =============================================================================

/** 24-bit RGB format */
export const SDL_PIXELFORMAT_RGB24 = 0x17101803;

/** 32-bit ARGB format (8 bits per channel) */
export const SDL_PIXELFORMAT_ARGB8888 = 0x16362004;

/** 32-bit RGB format (no alpha, 8 bits per channel) */
export const SDL_PIXELFORMAT_RGB888 = 0x16161804;

// =============================================================================
// SDL Event Types
// =============================================================================

/** Application quit request */
export const SDL_QUIT = 0x100;

/** Window state change event */
export const SDL_WINDOWEVENT = 0x200;

/** Key press event */
export const SDL_KEYDOWN = 0x300;

/** Key release event */
export const SDL_KEYUP = 0x301;

// =============================================================================
// SDL Window Events
// =============================================================================

/** Window has been resized */
export const SDL_WINDOWEVENT_RESIZED = 5;

/** Window size has changed */
export const SDL_WINDOWEVENT_SIZE_CHANGED = 6;

/** Window has gained keyboard focus */
export const SDL_WINDOWEVENT_FOCUS_GAINED = 12;

/** Window has lost keyboard focus */
export const SDL_WINDOWEVENT_FOCUS_LOST = 13;

/** Window close button clicked */
export const SDL_WINDOWEVENT_CLOSE = 14;

// =============================================================================
// SDL Keycodes
// =============================================================================

/** Return/Enter key */
export const SDLK_RETURN = 13;

/** Escape key */
export const SDLK_ESCAPE = 27;

/** Space bar */
export const SDLK_SPACE = 32;

/** Backspace key */
export const SDLK_BACKSPACE = 8;

/** Tab key */
export const SDLK_TAB = 9;

/** Delete key */
export const SDLK_DELETE = 127;

/** Right arrow key */
export const SDLK_RIGHT = 1_073_741_903;

/** Left arrow key */
export const SDLK_LEFT = 1_073_741_904;

/** Down arrow key */
export const SDLK_DOWN = 1_073_741_905;

/** Up arrow key */
export const SDLK_UP = 1_073_741_906;

/** Home key */
export const SDLK_HOME = 1_073_741_898;

/** End key */
export const SDLK_END = 1_073_741_901;

/** Page Up key */
export const SDLK_PAGEUP = 1_073_741_899;

/** Page Down key */
export const SDLK_PAGEDOWN = 1_073_741_902;

/** Function key F1 */
export const SDLK_F1 = 1_073_741_882;

/** Function key F12 */
export const SDLK_F12 = 1_073_741_893;

// Modifier keys
/** Left Shift key */
export const SDLK_LSHIFT = 1_073_742_049;

/** Right Shift key */
export const SDLK_RSHIFT = 1_073_742_053;

/** Left Control key */
export const SDLK_LCTRL = 1_073_742_048;

/** Right Control key */
export const SDLK_RCTRL = 1_073_742_052;

/** Left Alt key */
export const SDLK_LALT = 1_073_742_050;

/** Right Alt key */
export const SDLK_RALT = 1_073_742_054;

// =============================================================================
// Buffer Sizes and Offsets
// =============================================================================

/** Size of an int32 in bytes */
export const INT32_BYTES = 4;

/** Size of SDL_Rect struct in bytes (4 x int32: x, y, w, h) */
export const SDL_RECT_SIZE = 16;

/** Byte offset of x field in SDL_Rect */
export const SDL_RECT_X_OFFSET = 0;

/** Byte offset of y field in SDL_Rect */
export const SDL_RECT_Y_OFFSET = 4;

/** Byte offset of w field in SDL_Rect */
export const SDL_RECT_W_OFFSET = 8;

/** Byte offset of h field in SDL_Rect */
export const SDL_RECT_H_OFFSET = 12;

/** Size of SDL_Event struct in bytes */
export const SDL_EVENT_SIZE = 56;

/** Offset of window event subtype in SDL_Event */
export const SDL_WINDOW_EVENT_OFFSET = 12;

/** Offset of key state (pressed/released) in SDL_KeyboardEvent */
export const SDL_KEY_STATE_OFFSET = 12;

/** Offset of repeat flag in SDL_KeyboardEvent */
export const SDL_KEY_REPEAT_OFFSET = 13;

/** Offset of SDL_Keysym.sym (keycode) in SDL_KeyboardEvent */
export const SDL_KEYSYM_SYM_OFFSET = 20;

// =============================================================================
// ASCII Constants
// =============================================================================

/** ASCII code for lowercase 'a' */
export const ASCII_A_LOWER = 97;

/** ASCII code for lowercase 'z' */
export const ASCII_Z_LOWER = 122;
