/**
 * SDL Error
 *
 * Typed error class for SDL operation failures.
 */

import type { SdlErrorCode } from "./types";

export * from "./types";

/**
 * Error thrown when an SDL operation fails
 */
export class SdlError extends Error {
  readonly code: SdlErrorCode;
  /** The underlying SDL error message, if available */
  readonly sdlMessage: string | undefined;

  constructor(code: SdlErrorCode, sdlMessage?: string) {
    const message = sdlMessage ? `${code}: ${sdlMessage}` : code;
    super(message);
    this.name = "SdlError";
    this.code = code;
    this.sdlMessage = sdlMessage;
  }
}
