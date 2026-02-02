/**
 * Library path finding utilities
 *
 * Shared utilities for finding native library paths across platforms.
 */

import { existsSync } from "fs";
import { platform } from "os";
import { find, last } from "remeda";

/**
 * Check if a path is a system path (no directory, let koffi search)
 */
export const isSystemPath = (p: string): boolean =>
  !p.includes("/") && !p.includes("\\");

/**
 * Find a library path for the current platform
 */
export const findLibrary = (
  pathMap: Record<string, string[]>
): string | null => {
  const plat = platform();
  const paths = pathMap[plat] ?? [];

  // Try paths in order: system paths are accepted immediately,
  // paths with directories must exist on disk
  const foundPath = find(paths, (p) => isSystemPath(p) || existsSync(p));

  return foundPath ?? last(paths) ?? null;
};
