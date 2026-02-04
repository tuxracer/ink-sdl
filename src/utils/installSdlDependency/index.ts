/**
 * Interactive SDL Dependency Installer
 *
 * Prompts the user to install missing SDL dependencies and runs
 * the appropriate package manager command for their platform.
 */

import { createInterface } from "node:readline";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { platform } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { isSdl2Available } from "../../Sdl2";
import { isSdlTtfAvailable } from "../../SdlTtf";

// ============================================================================
// Types
// ============================================================================

type LibraryType = "SDL2" | "SDL2_ttf";

interface InstallCommand {
  /** Command arguments (e.g., ["brew", "install", "sdl2"]) */
  args: string[];
  /** Whether this platform supports auto-installation */
  canAutoInstall: boolean;
}

interface LinuxDistro {
  id: string;
  name: string;
}

/** Error codes for install failures */
export type InstallErrorCode =
  | "PLATFORM_NOT_SUPPORTED"
  | "NON_INTERACTIVE"
  | "USER_DECLINED"
  | "INSTALL_FAILED";

/**
 * Error thrown when dependency installation fails
 */
export class InstallError extends Error {
  readonly code: InstallErrorCode;

  constructor(code: InstallErrorCode) {
    super(code);
    this.name = "InstallError";
    this.code = code;
  }
}

/**
 * Check if an error is an InstallError
 */
export const isInstallError = (error: unknown): error is InstallError => {
  return error instanceof InstallError;
};

// ============================================================================
// Constants
// ============================================================================

/** Prefix for distro ID in /etc/os-release */
const OS_RELEASE_ID_PREFIX = "ID=";

/** ANSI escape code for bold text */
const ANSI_BOLD = "\x1b[1m";

/** ANSI escape code for green text */
const ANSI_GREEN = "\x1b[32m";

/** ANSI escape code for yellow text */
const ANSI_YELLOW = "\x1b[33m";

/** ANSI escape code to reset formatting */
const ANSI_RESET = "\x1b[0m";

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

    for (const line of lines) {
      if (line.startsWith(OS_RELEASE_ID_PREFIX)) {
        const id = line
          .slice(OS_RELEASE_ID_PREFIX.length)
          .replace(/"/g, "")
          .toLowerCase();
        if (id) {
          return { id, name: id };
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return null;
};

// ============================================================================
// Package Manager Detection
// ============================================================================

/**
 * Check if Homebrew is installed on macOS
 */
const isHomebrewInstalled = (): boolean => {
  try {
    execSync("which brew", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if MacPorts is installed on macOS
 */
const isMacPortsInstalled = (): boolean => {
  try {
    execSync("which port", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// Install Command Resolution
// ============================================================================

/**
 * Get the install command for the current platform
 */
const getInstallCommand = (library: LibraryType): InstallCommand => {
  const plat = platform();

  // macOS - try Homebrew first, then MacPorts
  if (plat === "darwin") {
    if (isHomebrewInstalled()) {
      const packageName = library === "SDL2" ? "sdl2" : "sdl2_ttf";
      return { args: ["brew", "install", packageName], canAutoInstall: true };
    }
    if (isMacPortsInstalled()) {
      const packageName = library === "SDL2" ? "libsdl2" : "libsdl2_ttf";
      return {
        args: ["sudo", "port", "install", packageName],
        canAutoInstall: true,
      };
    }
    return { args: [], canAutoInstall: false };
  }

  // Windows - manual installation required
  if (plat === "win32") {
    return { args: [], canAutoInstall: false };
  }

  // Linux - detect distribution
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
    return {
      args: ["sudo", "apt", "install", "-y", packageName],
      canAutoInstall: true,
    };
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
    return {
      args: ["sudo", "dnf", "install", "-y", packageName],
      canAutoInstall: true,
    };
  }

  // Arch-based (Arch, Manjaro, EndeavourOS)
  if (
    distroId === "arch" ||
    distroId === "manjaro" ||
    distroId === "endeavouros"
  ) {
    const packageName = library === "SDL2" ? "sdl2" : "sdl2_ttf";
    return {
      args: ["sudo", "pacman", "-S", "--noconfirm", packageName],
      canAutoInstall: true,
    };
  }

  // openSUSE
  if (distroId === "opensuse" || distroId.startsWith("opensuse")) {
    const packageName =
      library === "SDL2" ? "libSDL2-2_0-0" : "libSDL2_ttf-2_0-0";
    return {
      args: ["sudo", "zypper", "install", "-y", packageName],
      canAutoInstall: true,
    };
  }

  // Alpine
  if (distroId === "alpine") {
    const packageName = library === "SDL2" ? "sdl2" : "sdl2_ttf";
    return { args: ["sudo", "apk", "add", packageName], canAutoInstall: true };
  }

  // Unknown Linux distribution - can't auto-install
  return { args: [], canAutoInstall: false };
};

// ============================================================================
// User Prompt
// ============================================================================

/**
 * Prompt the user with a yes/no question
 */
const promptYesNo = (question: string): Promise<boolean> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    // Handle Ctrl+D (EOF) - resolve as "no"
    rl.on("close", () => {
      resolve(false);
    });

    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
};

// ============================================================================
// Install Execution
// ============================================================================

/**
 * Run the install command
 */
const runInstallCommand = (args: string[]): Promise<boolean> => {
  return new Promise((resolve) => {
    const command = args[0];
    if (!command) {
      resolve(false);
      return;
    }

    console.log(`\n${ANSI_BOLD}Running:${ANSI_RESET} ${args.join(" ")}\n`);

    const child: ChildProcess = spawn(command, args.slice(1), {
      stdio: "inherit",
    });

    child.on("error", (error: Error) => {
      console.error(`\nFailed to run command: ${error.message}`);
      resolve(false);
    });

    child.on("close", (code: number | null) => {
      resolve(code === 0);
    });
  });
};

/**
 * Install a single dependency
 */
const installDependency = async (library: LibraryType): Promise<void> => {
  const command = getInstallCommand(library);

  if (!command.canAutoInstall) {
    throw new InstallError("PLATFORM_NOT_SUPPORTED");
  }

  const success = await runInstallCommand(command.args);

  if (!success) {
    throw new InstallError("INSTALL_FAILED");
  }
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if automatic dependency installation is supported on the current platform
 *
 * Returns true if a supported package manager is available (e.g., Homebrew on macOS,
 * apt on Ubuntu/Debian, dnf on Fedora, pacman on Arch, etc.).
 *
 * Use this to determine whether to offer auto-installation to users before
 * calling `installMissingDependencies()`.
 */
export const isAutoInstallSupported = (): boolean => {
  // Check with SDL2 - the result will be the same for both libraries
  // since it depends on platform/package manager, not the specific library
  const command = getInstallCommand("SDL2");
  return command.canAutoInstall;
};

/**
 * Detect and install missing SDL dependencies
 *
 * Checks if SDL2 and SDL2_ttf are available. If all dependencies are present,
 * resolves immediately. If dependencies are missing, prompts the user to
 * install them.
 *
 * Resolves if all dependencies are present or successfully installed.
 * Rejects if auto-installation is not supported, the user declines,
 * or installation fails.
 */
export const installMissingDependencies = async (): Promise<void> => {
  // Check which dependencies are missing
  const missingDeps: LibraryType[] = [];

  if (!isSdl2Available()) {
    missingDeps.push("SDL2");
  }
  if (!isSdlTtfAvailable()) {
    missingDeps.push("SDL2_ttf");
  }

  // All dependencies present
  if (missingDeps.length === 0) {
    return;
  }

  // Check if stdin is a TTY (interactive terminal)
  if (!process.stdin.isTTY) {
    throw new InstallError("NON_INTERACTIVE");
  }

  // Check if auto-install is supported for all missing deps
  for (const lib of missingDeps) {
    const command = getInstallCommand(lib);
    if (!command.canAutoInstall) {
      throw new InstallError("PLATFORM_NOT_SUPPORTED");
    }
  }

  // Prompt user
  const depsText = missingDeps.join(" and ");
  console.log(
    `\n${ANSI_YELLOW}${depsText} ${missingDeps.length === 1 ? "is" : "are"} required but not found.${ANSI_RESET}\n`
  );

  const shouldInstall = await promptYesNo(
    `Would you like to install ${missingDeps.length === 1 ? "it" : "them"} now? [y/N] `
  );

  if (!shouldInstall) {
    throw new InstallError("USER_DECLINED");
  }

  // Install each missing dependency
  for (const lib of missingDeps) {
    await installDependency(lib);
  }

  console.log(
    `\n${ANSI_GREEN}Installation complete!${ANSI_RESET} Please run the command again.\n`
  );
};
