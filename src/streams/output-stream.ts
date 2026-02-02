/**
 * SDL Output Stream for Ink
 *
 * A Writable stream that intercepts Ink's ANSI output and renders it
 * to an SDL window.
 */

import { Writable } from "stream";
import type { SdlUiRenderer } from "../renderer";

/** Default terminal dimensions */
const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;

/**
 * SDL Output Stream
 *
 * Wraps an SdlUiRenderer in a Node.js Writable stream that Ink
 * can use as stdout.
 */
export class SdlOutputStream extends Writable {
  /** TTY interface property expected by Ink */
  isTTY = true;

  private uiRenderer: SdlUiRenderer;

  constructor(uiRenderer: SdlUiRenderer) {
    super({
      decodeStrings: false,
    });

    this.uiRenderer = uiRenderer;
  }

  /**
   * Get terminal columns
   */
  get columns(): number {
    const dims = this.uiRenderer.getDimensions();
    return dims.columns || DEFAULT_COLUMNS;
  }

  /**
   * Get terminal rows
   */
  get rows(): number {
    const dims = this.uiRenderer.getDimensions();
    return dims.rows || DEFAULT_ROWS;
  }

  /**
   * Notify Ink of resize
   */
  notifyResize(): void {
    this.emit("resize");
  }

  /**
   * Implement Writable._write
   */
  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    try {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");

      // Process the ANSI output
      this.uiRenderer.processAnsi(text);

      // Present the frame
      this.uiRenderer.present();

      callback(null);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get the underlying renderer
   */
  getRenderer(): SdlUiRenderer {
    return this.uiRenderer;
  }

  /**
   * Clear the screen
   */
  clear(): void {
    this.uiRenderer.clear();
  }

  /**
   * Write a string directly (bypasses Writable buffering)
   */
  writeSync(text: string): void {
    this.uiRenderer.processAnsi(text);
    this.uiRenderer.present();
  }

  /**
   * Get cursor position
   */
  getCursorPos(): { x: number; y: number } {
    return this.uiRenderer.getCursorPos();
  }
}
