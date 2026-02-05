/**
 * SDL Dependency Error
 *
 * Custom error class for missing SDL2/SDL2_ttf dependencies with
 * platform-specific installation instructions.
 */

import { existsSync, readFileSync } from "node:fs";
import { platform } from "node:os";

import {
  OS_RELEASE_ID_PREFIX,
  OS_RELEASE_NAME_PREFIX,
  ANSI_RED,
  ANSI_RESET,
} from "./consts";
import type { LibraryType, LinuxDistro } from "./types";

export * from "./types";
export * from "./consts";

// ============================================================================
// Linux Distribution Detection
// ============================================================================

/**
 * Detect the Linux distribution from /etc/os-release
 */
const detectLinuxDistro = (): LinuxDistro | null => {
  const osReleasePath = "/etc/os-release";

  if (!existsSync(osReleasePath)) {
    return null;
  }

  try {
    const content = readFileSync(osReleasePath, "utf-8");
    const lines = content.split("\n");

    let id = "";
    let name = "";

    for (const line of lines) {
      if (line.startsWith(OS_RELEASE_ID_PREFIX)) {
        id = line
          .slice(OS_RELEASE_ID_PREFIX.length)
          .replace(/"/g, "")
          .toLowerCase();
      }
      if (line.startsWith(OS_RELEASE_NAME_PREFIX)) {
        name = line.slice(OS_RELEASE_NAME_PREFIX.length).replace(/"/g, "");
      }
    }

    if (id) {
      return { id, name: name || id };
    }
  } catch {
    // Ignore read errors
  }

  return null;
};

// ============================================================================
// Install Instructions
// ============================================================================

/**
 * Get installation instructions for the current platform
 */
const getInstallInstructions = (library: LibraryType): string => {
  const plat = platform();

  if (plat === "darwin") {
    const packageName = library === "SDL2" ? "sdl2" : "sdl2_ttf";
    return `  brew install ${packageName}`;
  }

  if (plat === "win32") {
    if (library === "SDL2") {
      return [
        "  1. Download SDL2.dll from:",
        "     https://github.com/libsdl-org/SDL/releases/tag/release-2.24.0",
        "     (get SDL2-2.24.0-win32-x64.zip)",
        "",
        "  2. Extract SDL2.dll and place it in:",
        "     - Your project directory, OR",
        "     - C:\\Windows\\System32",
      ].join("\n");
    } else {
      return [
        "  1. Download SDL2_ttf.dll from:",
        "     https://github.com/libsdl-org/SDL_ttf/releases/tag/release-2.24.0",
        "     (get SDL2_ttf-2.24.0-win32-x64.zip)",
        "",
        "  2. Extract SDL2_ttf.dll and place it in:",
        "     - Your project directory, OR",
        "     - C:\\Windows\\System32",
      ].join("\n");
    }
  }

  // Linux - detect specific distribution
  const distro = detectLinuxDistro();
  const distroId = distro?.id ?? "";

  // Debian-based (Ubuntu, Debian, Linux Mint, Pop!_OS, etc.)
  if (
    distroId === "ubuntu" ||
    distroId === "debian" ||
    distroId === "linuxmint" ||
    distroId === "pop" ||
    distroId === "elementary" ||
    distroId === "zorin"
  ) {
    const packageName =
      library === "SDL2" ? "libsdl2-2.0-0" : "libsdl2-ttf-2.0-0";
    return `  sudo apt install ${packageName}`;
  }

  // Fedora/RHEL-based (Fedora, RHEL, CentOS, Rocky, AlmaLinux)
  if (
    distroId === "fedora" ||
    distroId === "rhel" ||
    distroId === "centos" ||
    distroId === "rocky" ||
    distroId === "almalinux"
  ) {
    const packageName = library === "SDL2" ? "SDL2" : "SDL2_ttf";
    return `  sudo dnf install ${packageName}`;
  }

  // Arch-based (Arch, Manjaro, EndeavourOS)
  if (
    distroId === "arch" ||
    distroId === "manjaro" ||
    distroId === "endeavouros"
  ) {
    const packageName = library === "SDL2" ? "sdl2" : "sdl2_ttf";
    return `  sudo pacman -S ${packageName}`;
  }

  // openSUSE
  if (distroId === "opensuse" || distroId.startsWith("opensuse")) {
    const packageName =
      library === "SDL2" ? "libSDL2-2_0-0" : "libSDL2_ttf-2_0-0";
    return `  sudo zypper install ${packageName}`;
  }

  // Alpine
  if (distroId === "alpine") {
    const packageName = library === "SDL2" ? "sdl2" : "sdl2_ttf";
    return `  sudo apk add ${packageName}`;
  }

  // Generic Linux fallback
  const genericPackages =
    library === "SDL2"
      ? "libsdl2-2.0-0 (Debian/Ubuntu), SDL2 (Fedora), sdl2 (Arch)"
      : "libsdl2-ttf-2.0-0 (Debian/Ubuntu), SDL2_ttf (Fedora), sdl2_ttf (Arch)";

  return `  Install ${library} using your distribution's package manager.\n  Common package names: ${genericPackages}`;
};

/**
 * Get the platform name for display
 */
const getPlatformName = (): string => {
  const plat = platform();

  if (plat === "darwin") {
    return "macOS";
  }

  if (plat === "win32") {
    return "Windows";
  }

  // Linux - include distro name if detected
  const distro = detectLinuxDistro();
  if (distro?.name) {
    return `Linux (${distro.name})`;
  }

  return "Linux";
};

// ============================================================================
// Error Class
// ============================================================================

/**
 * Error thrown when SDL2 or SDL2_ttf libraries are not found
 */
export class SdlDependencyError extends Error {
  readonly library: LibraryType;
  readonly platform: string;
  readonly installInstructions: string;

  constructor(library: LibraryType) {
    const instructions = getInstallInstructions(library);
    const platformName = getPlatformName();

    super(`${library} library not found`);

    this.name = "SdlDependencyError";
    this.library = library;
    this.platform = platformName;
    this.installInstructions = instructions;
  }

  /**
   * Get a nicely formatted error message for display
   */
  getFormattedMessage(): string {
    const lines = [
      "",
      `${ANSI_RED}Missing SDL Dependency${ANSI_RESET}`,
      "",
      `${this.library} is required but was not found on your system.`,
      "",
      `Platform: ${this.platform}`,
      "",
      "To install:",
      this.installInstructions,
      "",
      "For more information, see:",
      "https://github.com/tuxracer/ink-sdl#prerequisites",
      "",
    ];

    return lines.join("\n");
  }
}
