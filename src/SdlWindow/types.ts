import type { ExistingSdlResources } from "../SdlUiRenderer";
import type { SdlInputStream } from "../SdlInputStream";
import type { SdlOutputStream } from "../SdlOutputStream";
import type { SdlWindow } from ".";
import type { SdlUiRenderer } from "../SdlUiRenderer";

/**
 * Options for creating SDL streams
 */
export interface SdlStreamsOptions {
  /** Window title */
  title?: string;
  /** Window width in pixels */
  width?: number;
  /** Window height in pixels */
  height?: number;
  /** Enable vsync */
  vsync?: boolean;
  /** Font size in points */
  fontSize?: number;
  /** Override scale factor (null = auto-detect) */
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
  /** Force a specific frame rate instead of auto-detecting display refresh rate */
  frameRate?: number | undefined;
  /**
   * Use existing SDL window and renderer instead of creating new ones.
   *
   * When provided, ink-sdl will:
   * - Use the existing window/renderer for all rendering
   * - NOT destroy them when the window is closed (caller retains ownership)
   * - Read dimensions from the existing window
   * - Ignore width/height/title/fullscreen/borderless options
   *
   * @example
   * ```typescript
   * // Create your own SDL window and renderer
   * const myWindow = SDL_CreateWindow(...);
   * const myRenderer = SDL_CreateRenderer(myWindow, ...);
   *
   * // Use them with ink-sdl
   * const streams = createSdlStreams({
   *   existing: { window: myWindow, renderer: myRenderer },
   *   fontSize: 16,
   * });
   *
   * // When done with ink-sdl, clean up
   * streams.window.close();
   *
   * // You can now use the window/renderer for other purposes
   * // or destroy them yourself when fully done
   * SDL_DestroyRenderer(myRenderer);
   * SDL_DestroyWindow(myWindow);
   * ```
   */
  existing?: ExistingSdlResources | undefined;
}

/**
 * Result of createSdlStreams
 */
export interface SdlStreams {
  /** Readable stream for keyboard input */
  stdin: SdlInputStream;
  /** Writable stream for ANSI output */
  stdout: SdlOutputStream;
  /** SDL window wrapper with events */
  window: SdlWindow;
  /** UI renderer (for advanced use) */
  renderer: SdlUiRenderer;
}
