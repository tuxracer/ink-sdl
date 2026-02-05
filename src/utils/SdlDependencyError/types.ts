import { SdlDependencyError } from ".";

/**
 * Check if an error is an SdlDependencyError
 */
export const isSdlDependencyError = (
  error: unknown
): error is SdlDependencyError => {
  return error instanceof SdlDependencyError;
};
