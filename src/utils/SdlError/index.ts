/**
 * SDL Error
 *
 * Typed error class for SDL operation failures.
 */

/** Error codes for SDL failures */
export type SdlErrorCode =
  | "INIT_FAILED"
  | "WINDOW_CREATION_FAILED"
  | "RENDERER_CREATION_FAILED"
  | "TEXTURE_CREATION_FAILED";

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

/**
 * Check if an error is an SdlError
 */
export const isSdlError = (error: unknown): error is SdlError => {
  return error instanceof SdlError;
};
