import { InstallError } from ".";

/** Error codes for install failures */
export type InstallErrorCode =
  | "PLATFORM_NOT_SUPPORTED"
  | "NON_INTERACTIVE"
  | "USER_DECLINED"
  | "INSTALL_FAILED";

/**
 * Options for installMissingDependencies
 */
export interface InstallMissingDependenciesOptions {
  /**
   * Skip the built-in interactive prompt.
   * When true, `userAccepted` determines whether to proceed with installation.
   * This allows you to implement your own confirmation UI.
   */
  skipPrompt?: boolean;

  /**
   * Whether the user accepted installation.
   * Only used when `skipPrompt` is true.
   * If false or undefined, throws InstallError with code "USER_DECLINED".
   */
  userAccepted?: boolean;
}

/**
 * Check if an error is an InstallError
 */
export const isInstallError = (error: unknown): error is InstallError => {
  return error instanceof InstallError;
};
