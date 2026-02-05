import { FontError } from ".";

/** Error codes for font failures */
export type FontErrorCode = "NOT_FOUND" | "LOAD_FAILED" | "RENDER_FAILED";

/**
 * Check if an error is a FontError
 */
export const isFontError = (error: unknown): error is FontError => {
  return error instanceof FontError;
};
