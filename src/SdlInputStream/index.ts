/**
 * SDL Input Stream for Ink
 *
 * A Readable stream that provides keyboard input to Ink from SDL events.
 * Implements the TTY interface expected by Ink.
 */

import { Readable } from "stream";

/**
 * SDL Input Stream
 *
 * Wraps SDL keyboard events in a Node.js Readable stream that Ink
 * can use as stdin.
 */
export class SdlInputStream extends Readable {
  /** TTY interface properties expected by Ink */
  isTTY = true;
  isRaw = true;

  private buffer: string[] = [];
  private waiting = false;

  constructor() {
    super({
      encoding: "utf8",
    });
  }

  /**
   * Push a key sequence into the stream
   */
  pushKey(sequence: string): void {
    this.buffer.push(sequence);

    // If someone is waiting for data, push it immediately
    if (this.waiting) {
      this.waiting = false;
      this._read();
    }
  }

  /**
   * Implement Readable._read
   */
  override _read(): void {
    if (this.buffer.length > 0) {
      // Push all buffered sequences
      while (this.buffer.length > 0) {
        const sequence = this.buffer.shift();
        if (sequence !== undefined) {
          this.push(sequence);
        }
      }
    } else {
      // No data available, mark as waiting
      this.waiting = true;
    }
  }

  /**
   * Set raw mode (no-op for SDL, we're always raw)
   */
  setRawMode(_mode: boolean): this {
    return this;
  }

  /**
   * Check if stream has buffered data
   */
  hasData(): boolean {
    return this.buffer.length > 0;
  }

  /**
   * Clear the input buffer
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Close the stream
   */
  close(): void {
    this.push(null);
  }

  /**
   * Keep the event loop alive (no-op for SDL)
   */
  ref(): this {
    return this;
  }

  /**
   * Allow event loop to exit (no-op for SDL)
   */
  unref(): this {
    return this;
  }
}
