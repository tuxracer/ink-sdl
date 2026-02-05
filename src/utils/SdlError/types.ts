import { SdlError } from ".";

/** Error codes for SDL failures */
export type SdlErrorCode =
  | "INIT_FAILED"
  | "WINDOW_CREATION_FAILED"
  | "RENDERER_CREATION_FAILED"
  | "TEXTURE_CREATION_FAILED";

/**
 * Check if an error is an SdlError
 */
export const isSdlError = (error: unknown): error is SdlError => {
  return error instanceof SdlError;
};
