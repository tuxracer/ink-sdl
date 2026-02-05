/**
 * Tests for findLibrary utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isSystemPath } from ".";

describe("isSystemPath", () => {
  it("should return true for system library names without slashes", () => {
    expect(isSystemPath("libSDL2.dylib")).toBe(true);
    expect(isSystemPath("SDL2.dll")).toBe(true);
    expect(isSystemPath("libSDL2-2.0.so.0")).toBe(true);
  });

  it("should return false for Unix-style paths", () => {
    expect(isSystemPath("/usr/lib/libSDL2.so")).toBe(false);
    expect(isSystemPath("/System/Library/Frameworks/SDL2")).toBe(false);
    expect(isSystemPath("./lib/SDL2.dylib")).toBe(false);
    expect(isSystemPath("../SDL2.so")).toBe(false);
  });

  it("should return false for Windows-style paths", () => {
    expect(isSystemPath("C:\\Windows\\System32\\SDL2.dll")).toBe(false);
    expect(isSystemPath(".\\lib\\SDL2.dll")).toBe(false);
    expect(isSystemPath("lib\\SDL2.dll")).toBe(false);
  });

  it("should return true for empty string", () => {
    expect(isSystemPath("")).toBe(true);
  });
});

describe("findLibrary", () => {
  beforeEach(() => {
    vi.mock("fs", () => ({
      existsSync: vi.fn((path: string) => {
        // Simulate these paths existing
        const existingPaths = [
          "/usr/lib/libSDL2.so",
          "/opt/homebrew/lib/libSDL2.dylib",
          "C:\\Windows\\System32\\SDL2.dll",
        ];
        return existingPaths.includes(path);
      }),
    }));
    vi.mock("os", () => ({
      platform: vi.fn(() => "darwin"),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return system path immediately without checking existence", async () => {
    // Re-import to get mocked version
    const { findLibrary: findLibraryMocked } = await import(".");
    const { existsSync } = await import("fs");

    const result = findLibraryMocked({
      darwin: ["libSDL2.dylib"],
    });

    expect(result).toBe("libSDL2.dylib");
    // System paths should not check existsSync
    expect(existsSync).not.toHaveBeenCalledWith("libSDL2.dylib");
  });

  it("should return first existing file path", async () => {
    const { findLibrary: findLibraryMocked } = await import(".");

    const result = findLibraryMocked({
      darwin: [
        "/nonexistent/path/libSDL2.dylib",
        "/opt/homebrew/lib/libSDL2.dylib",
        "/another/path/libSDL2.dylib",
      ],
    });

    expect(result).toBe("/opt/homebrew/lib/libSDL2.dylib");
  });

  it("should return last path as fallback when none exist", async () => {
    const { findLibrary: findLibraryMocked } = await import(".");

    const result = findLibraryMocked({
      darwin: [
        "/nonexistent/path1/libSDL2.dylib",
        "/nonexistent/path2/libSDL2.dylib",
        "/fallback/libSDL2.dylib",
      ],
    });

    expect(result).toBe("/fallback/libSDL2.dylib");
  });

  it("should return null for empty path list", async () => {
    const { findLibrary: findLibraryMocked } = await import(".");

    const result = findLibraryMocked({
      darwin: [],
    });

    expect(result).toBe(null);
  });

  it("should return null when platform has no paths", async () => {
    const { findLibrary: findLibraryMocked } = await import(".");

    const result = findLibraryMocked({
      linux: ["/usr/lib/libSDL2.so"],
      // darwin not specified
    });

    expect(result).toBe(null);
  });

  it("should prefer system path over file path", async () => {
    const { findLibrary: findLibraryMocked } = await import(".");

    const result = findLibraryMocked({
      darwin: ["libSDL2.dylib", "/opt/homebrew/lib/libSDL2.dylib"],
    });

    // System path should be returned first
    expect(result).toBe("libSDL2.dylib");
  });
});
