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
      const { keyEvents, resized } = this.renderer.processEvents();

      // Notify Ink of resize so it can re-render with new dimensions
      if (resized) {
        this.outputStream.notifyResize();
        this.emit("resize", this.renderer.getDimensions());
      }

      // Convert key events to terminal sequences
      for (const event of keyEvents) {
        const sequence = this.renderer.keyEventToSequence(event);
        if (sequence) {
          // Ctrl+C sends SIGINT to the process (like a real terminal)
          if (sequence === "\x03") {
            process.kill(process.pid, "SIGINT");
            continue;
          }

          this.inputStream.pushKey(sequence);
          this.emit("key", event);
        }
      }

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
