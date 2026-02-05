/**
 * Font Error
 *
 * Typed error class for font loading and rendering failures.
 */

import type { FontErrorCode } from "./types";

export * from "./types";

/**
 * Error thrown when a font operation fails
 */
export class FontError extends Error {
  readonly code: FontErrorCode;
  /** Additional details about the failure (paths tried, etc.) */
  readonly details: string | undefined;

  constructor(code: FontErrorCode, details?: string) {
    const message = details ? `${code}: ${details}` : code;
    super(message);
    this.name = "FontError";
    this.code = code;
    this.details = details;
  }
}
