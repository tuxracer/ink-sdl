/**
 * SDL Type Definitions
 */

/** Opaque pointer type for SDL handles (windows, renderers, textures, etc.) */
export type SDLPointer = unknown;

/**
 * Keyboard event from SDL
 */
export interface SdlKeyEvent {
  keycode: number;
  pressed: boolean;
  repeat: boolean;
}
