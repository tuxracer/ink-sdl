import { SdlDependencyError } from ".";

export type LibraryType = "SDL2" | "SDL2_ttf";

export interface LinuxDistro {
  id: string;
  name: string;
}

/**
 * Check if an error is an SdlDependencyError
 */
export const isSdlDependencyError = (
  error: unknown
): error is SdlDependencyError => {
  return error instanceof SdlDependencyError;
};
