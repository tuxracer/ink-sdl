import type { SDLPointer, SdlKeyEvent } from "../Sdl2";

/**
 * Existing SDL resources to use instead of creating new ones.
 *
 * When provided, ink-sdl will use these resources instead of creating its own.
 * The caller retains ownership and is responsible for destroying them after
 * ink-sdl is done.
 */
export interface ExistingSdlResources {
  /** Existing SDL window pointer */
  window: SDLPointer;
  /** Existing SDL renderer pointer */
  renderer: SDLPointer;
}

export interface SdlUiRendererOptions {
  width?: number;
  height?: number;
  title?: string;
  vsync?: boolean;
  fontSize?: number;
  scaleFactor?: number | null;
  /** Use system font instead of bundled Cozette font */
  systemFont?: boolean;
  /** Path to a custom TTF font file */
  fontPath?: string;
  /** Font name to search for in system font directories */
  fontName?: string;
  /** Background color as RGB tuple [r, g, b] or hex string "#RRGGBB" */
  backgroundColor?: [number, number, number] | string | undefined;
  /** Fullscreen mode: true for exclusive fullscreen, "desktop" for borderless fullscreen */
  fullscreen?: boolean | "desktop" | undefined;
  /** Remove window decorations (title bar, borders) */
  borderless?: boolean | undefined;
  /** Minimum window width in pixels */
  minWidth?: number | undefined;
  /** Minimum window height in pixels */
  minHeight?: number | undefined;
  /**
   * Use existing SDL window and renderer instead of creating new ones.
   *
   * When provided, ink-sdl will:
   * - Use the existing window/renderer for all rendering
   * - NOT destroy them when destroy() is called (caller retains ownership)
   * - Read dimensions from the existing window
   * - Ignore width/height/title/fullscreen/borderless options (window already exists)
   *
   * This enables sharing a single SDL window between ink-sdl and other renderers,
   * such as an emulator that switches between menu UI and game rendering.
   */
  existing?: ExistingSdlResources | undefined;
}

/** Result from processing SDL events */
export interface ProcessEventsResult {
  /** Key events that occurred */
  keyEvents: SdlKeyEvent[];
  /** Whether a resize event occurred */
  resized: boolean;
  /** Whether focus was lost (modifier keys should be reset) */
  focusLost: boolean;
}
