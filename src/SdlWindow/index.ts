/**
 * SDL Window and Streams for Ink
 *
 * Factory function to create stdin/stdout streams that render to SDL.
 */

import { EventEmitter } from "events";
import { pickBy, isDefined } from "remeda";
import { SdlUiRenderer, type SdlUiRendererOptions } from "../SdlUiRenderer";
import { SdlOutputStream } from "../SdlOutputStream";
import { SdlInputStream } from "../SdlInputStream";
import { getSdl2 } from "../Sdl2";
import { EVENT_LOOP_INTERVAL_MS } from "./consts";

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

  constructor(
    renderer: SdlUiRenderer,
    inputStream: SdlInputStream,
    outputStream: SdlOutputStream
  ) {
    super();
    this.renderer = renderer;
    this.inputStream = inputStream;
    this.outputStream = outputStream;

    // Start the event loop
    this.startEventLoop();
  }

  /**
   * Start the SDL event loop
   */
  private startEventLoop(): void {
    this.eventLoopHandle = setInterval(() => {
      if (this.closed) {
        return;
      }

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
    }, EVENT_LOOP_INTERVAL_MS);
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
  const window = new SdlWindow(renderer, inputStream, outputStream);

  return {
    stdin: inputStream,
    stdout: outputStream,
    window,
    renderer,
  };
};
