/**
 * Font Error
 *
 * Typed error class for font loading and rendering failures.
 */

/** Error codes for font failures */
export type FontErrorCode = "NOT_FOUND" | "LOAD_FAILED" | "RENDER_FAILED";

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

/**
 * Check if an error is a FontError
 */
export const isFontError = (error: unknown): error is FontError => {
  return error instanceof FontError;
};
