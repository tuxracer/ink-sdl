/**
 * SDL Window and Streams for Ink
 *
 * Factory function to create stdin/stdout streams that render to SDL.
 */

import { EventEmitter } from "events";
import { pickBy, isDefined } from "remeda";
import {
  SdlUiRenderer,
  type SdlUiRendererOptions,
  type ExistingSdlResources,
} from "../SdlUiRenderer";
import { SdlOutputStream } from "../SdlOutputStream";
import { SdlInputStream } from "../SdlInputStream";
import { getSdl2 } from "../Sdl2";
import {
  MS_PER_SECOND,
  DEFAULT_EVENT_LOOP_INTERVAL_MS,
  REFRESH_RATE_CHECK_INTERVAL_MS,
} from "./consts";

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
 * SDL Window wrapper that emits events
 */
export class SdlWindow extends EventEmitter {
  private renderer: SdlUiRenderer;
  private eventLoopHandle: ReturnType<typeof setInterval> | null = null;
  private inputStream: SdlInputStream;
  private outputStream: SdlOutputStream;
  private closed = false;
  private currentRefreshRate = 0;
  private lastRefreshRateCheck = 0;
  private forcedFrameRate: number | null = null;

  constructor(
    renderer: SdlUiRenderer,
    inputStream: SdlInputStream,
    outputStream: SdlOutputStream,
    frameRate?: number
  ) {
    super();
    this.renderer = renderer;
    this.inputStream = inputStream;
    this.outputStream = outputStream;
    this.forcedFrameRate = frameRate ?? null;

    // Start the event loop
    this.startEventLoop();
  }

  /**
   * Calculate event loop interval from refresh rate
   */
  private calculateIntervalMs(refreshRate: number): number {
    return refreshRate > 0
      ? Math.floor(MS_PER_SECOND / refreshRate)
      : DEFAULT_EVENT_LOOP_INTERVAL_MS;
  }

  /**
   * Get the effective frame rate (forced or auto-detected)
   */
  private getEffectiveFrameRate(): number {
    if (this.forcedFrameRate !== null) {
      return this.forcedFrameRate;
    }
    return this.renderer.getDisplayRefreshRate();
  }

  /**
   * Start the SDL event loop
   *
   * The loop interval is calculated from either the forced frame rate or
   * the display's current refresh rate. When auto-detecting, supports any
   * rate including variable refresh rate (VRR) displays, and automatically
   * adapts when the refresh rate changes (e.g., laptop switching to battery).
   */
  private startEventLoop(): void {
    this.currentRefreshRate = this.getEffectiveFrameRate();
    this.lastRefreshRateCheck = Date.now();
    const intervalMs = this.calculateIntervalMs(this.currentRefreshRate);

    this.eventLoopHandle = setInterval(() => {
      this.runEventLoopIteration();
    }, intervalMs);
  }

  /**
   * Check if refresh rate changed and restart event loop if needed
   *
   * Skipped when using a forced frame rate since it won't change.
   */
  private checkRefreshRateChange(): void {
    // Skip check when using forced frame rate
    if (this.forcedFrameRate !== null) {
      return;
    }

    const now = Date.now();
    if (now - this.lastRefreshRateCheck < REFRESH_RATE_CHECK_INTERVAL_MS) {
      return;
    }

    this.lastRefreshRateCheck = now;
    const newRefreshRate = this.renderer.getDisplayRefreshRate();

    if (newRefreshRate !== this.currentRefreshRate) {
      this.currentRefreshRate = newRefreshRate;

      // Restart event loop with new interval
      if (this.eventLoopHandle) {
        clearInterval(this.eventLoopHandle);
      }

      const intervalMs = this.calculateIntervalMs(newRefreshRate);
      this.eventLoopHandle = setInterval(() => {
        this.runEventLoopIteration();
      }, intervalMs);

      this.emit("frameRateChange", newRefreshRate);
    }
  }

  /**
   * Run a single iteration of the event loop
   */
  private runEventLoopIteration(): void {
    if (this.closed) {
      return;
    }

    // Periodically check for refresh rate changes
    this.checkRefreshRateChange();

    // Process SDL events
    const { keyEvents, resized, focusLost } = this.renderer.processEvents();

    // Notify Ink of resize so it can re-render with new dimensions
    if (resized) {
      this.outputStream.notifyResize();
      this.emit("resize", this.renderer.getDimensions());
    }

    // Reset modifier keys when focus is lost to prevent "stuck" keys
    if (focusLost) {
      this.renderer.resetInputState();
      this.emit("blur");
    }

    // Convert key events to terminal sequences
    for (const event of keyEvents) {
      const sequence = this.renderer.keyEventToSequence(event);
      if (sequence) {
        // Ctrl+C handling: emit "sigint" for graceful shutdown opportunity
        if (sequence === "\x03") {
          if (this.listenerCount("sigint") > 0) {
            // Application has a handler - let it manage shutdown gracefully
            this.emit("sigint");
          } else {
            // No handler - send SIGINT like a real terminal
            process.kill(process.pid, "SIGINT");
          }
          continue;
        }

        this.inputStream.pushKey(sequence);
        this.emit("key", event);
      }
    }

    // Refresh the display to prevent screen from going black
    // SDL's double-buffering requires continuous presents to keep content visible
    this.renderer.refreshDisplay();

    // Check for window close
    if (this.renderer.shouldClose()) {
      this.emit("close");
      this.close();
    }
  }

  /**
   * Get terminal dimensions
   */
  getDimensions(): { columns: number; rows: number } {
    return this.renderer.getDimensions();
  }

  /**
   * Set window title
   */
  setTitle(title: string): void {
    const window = this.renderer.getWindow();
    if (window) {
      getSdl2().setWindowTitle(window, title);
    }
  }

  /**
   * Clear the screen
   */
  clear(): void {
    this.renderer.clear();
    this.renderer.present();
  }

  /**
   * Close the window
   */
  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.eventLoopHandle) {
      clearInterval(this.eventLoopHandle);
      this.eventLoopHandle = null;
    }

    this.inputStream.close();
    this.renderer.destroy();
  }

  /**
   * Check if window is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Get the output stream
   */
  getOutputStream(): SdlOutputStream {
    return this.outputStream;
  }

  /**
   * Get glyph cache statistics
   *
   * Useful for profiling and tuning cache performance.
   *
   * @example
   * ```typescript
   * const stats = window.getCacheStats();
   * if (stats) {
   *   console.log(`Cache: ${stats.size}/${stats.maxSize} glyphs`);
   * }
   * ```
   */
  getCacheStats(): { size: number; maxSize: number } | null {
    return this.renderer.getCacheStats();
  }

  /**
   * Get the current frame rate
   *
   * Returns either the forced frame rate (if set) or the auto-detected
   * display refresh rate. Subscribe to "frameRateChange" event to be
   * notified when the rate changes.
   *
   * @example
   * ```typescript
   * console.log(`Running at ${window.getFrameRate()} fps`);
   *
   * window.on("frameRateChange", (frameRate) => {
   *   console.log(`Frame rate changed to ${frameRate} fps`);
   * });
   * ```
   */
  getFrameRate(): number {
    return this.currentRefreshRate;
  }
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

/**
 * Create SDL streams for use with Ink
 *
 * @example
 * ```typescript
 * import { render, Text, Box } from "ink";
 * import { createSdlStreams } from "ink-sdl";
 *
 * const App = () => (
 *   <Box flexDirection="column">
 *     <Text color="green">Hello from SDL!</Text>
 *   </Box>
 * );
 *
 * const { stdin, stdout, window } = createSdlStreams({
 *   title: "My App",
 *   width: 800,
 *   height: 600,
 * });
 *
 * render(<App />, { stdin, stdout });
 *
 * window.on("close", () => process.exit(0));
 * ```
 */
export const createSdlStreams = (
  options: SdlStreamsOptions = {}
): SdlStreams => {
  // Enable ANSI color output for chalk/Ink
  // chalk checks process.env.FORCE_COLOR rather than the stream's isTTY property,
  // so we need to set this for colors to work with our custom stdout stream.
  // Level 3 enables 24-bit true color support.
  if (process.env["FORCE_COLOR"] === undefined) {
    process.env["FORCE_COLOR"] = "3";
  }

  // Create the UI renderer - filter out undefined options
  const rendererOptions = pickBy(options, isDefined) as SdlUiRendererOptions;

  const renderer = new SdlUiRenderer(rendererOptions);

  // Create streams
  const inputStream = new SdlInputStream();
  const outputStream = new SdlOutputStream(renderer);

  // Create window wrapper
  const window = new SdlWindow(
    renderer,
    inputStream,
    outputStream,
    options.frameRate
  );

  return {
    stdin: inputStream,
    stdout: outputStream,
    window,
    renderer,
  };
};

// Re-export consts
export * from "./consts";
