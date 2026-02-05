/**
 * TextRenderer Types
 */

import type { SDLPointer } from "../Sdl2";

/**
 * Cached glyph texture with metadata
 */
export interface CachedGlyph {
  texture: SDLPointer;
  width: number;
  height: number;
  lastUsed: number;
}
