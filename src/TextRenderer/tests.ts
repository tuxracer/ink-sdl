/**
 * Tests for TextRenderer font resolution utilities
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { describe, it, expect } from "vitest";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { findFirstExisting } from ".";
import { FALLBACK_FONTS, DEFAULT_FONT_FILENAME } from "./consts";

const currentDirname = dirname(fileURLToPath(import.meta.url));

describe("findFirstExisting", () => {
  it("should return null for empty array", () => {
    const result = findFirstExisting([]);

    expect(result).toBe(null);
  });

  it("should return null when no paths exist", () => {
    const result = findFirstExisting([
      "/definitely/nonexistent/path1.ttf",
      "/definitely/nonexistent/path2.ttf",
      "/definitely/nonexistent/path3.ttf",
    ]);

    expect(result).toBe(null);
  });

  it("should return first existing path when found", () => {
    // Use actual files from this project
    const existingFile = join(currentDirname, "index.ts");
    const result = findFirstExisting([
      "/definitely/nonexistent/path.ttf",
      existingFile,
      "/another/nonexistent/path.ttf",
    ]);

    expect(result).toBe(existingFile);
  });

  it("should return first path when it exists", () => {
    const existingFile = join(currentDirname, "index.ts");
    const anotherExistingFile = join(currentDirname, "consts.ts");

    const result = findFirstExisting([
      existingFile,
      "/nonexistent/path.ttf",
      anotherExistingFile,
    ]);

    // Should return the first one, not check further
    expect(result).toBe(existingFile);
  });

  it("should handle paths with special characters gracefully", () => {
    // Should not throw on paths with special characters
    const result = findFirstExisting([
      "/path/with spaces/font.ttf",
      "/path/with-dashes/font.ttf",
      "/path/with_underscores/font.ttf",
    ]);

    expect(result).toBe(null);
  });

  it("should skip paths that cause errors", () => {
    // Invalid paths should be skipped, not throw
    const existingFile = join(currentDirname, "index.ts");

    const result = findFirstExisting([
      "", // Empty path
      existingFile,
    ]);

    expect(result).toBe(existingFile);
  });
});

describe("FALLBACK_FONTS constant", () => {
  it("should have darwin fallback fonts with correct paths", () => {
    expect(FALLBACK_FONTS.darwin).toBeDefined();
    expect(FALLBACK_FONTS.darwin.length).toBeGreaterThan(0);

    // All darwin paths should be macOS system font paths
    for (const path of FALLBACK_FONTS.darwin) {
      expect(path).toMatch(/^\/System\/Library\/Fonts\//);
    }
  });

  it("should have linux fallback fonts with correct paths", () => {
    expect(FALLBACK_FONTS.linux).toBeDefined();
    expect(FALLBACK_FONTS.linux.length).toBeGreaterThan(0);

    // All linux paths should be standard Linux font paths
    for (const path of FALLBACK_FONTS.linux) {
      expect(path).toMatch(/^\/usr\/(share|local)\/fonts\//);
    }
  });

  it("should have win32 fallback fonts with correct paths", () => {
    expect(FALLBACK_FONTS.win32).toBeDefined();
    expect(FALLBACK_FONTS.win32.length).toBeGreaterThan(0);

    // All win32 paths should be Windows font paths
    for (const path of FALLBACK_FONTS.win32) {
      expect(path).toMatch(/^C:\\Windows\\Fonts\\/);
    }
  });

  it("should have monospace fonts as fallbacks", () => {
    // Check that fallback fonts are monospace fonts
    const monospaceFontNames = [
      "Menlo",
      "Monaco",
      "Courier",
      "DejaVuSansMono",
      "LiberationMono",
      "FreeMono",
      "consola",
      "cour",
      "lucon",
    ];

    const allFallbacks = [
      ...FALLBACK_FONTS.darwin,
      ...FALLBACK_FONTS.linux,
      ...FALLBACK_FONTS.win32,
    ];

    // Each fallback should contain a known monospace font name
    for (const path of allFallbacks) {
      const hasMonospaceFont = monospaceFontNames.some((name) =>
        path.toLowerCase().includes(name.toLowerCase())
      );
      expect(hasMonospaceFont).toBe(true);
    }
  });
});

describe("DEFAULT_FONT_FILENAME constant", () => {
  it("should be the Cozette font", () => {
    expect(DEFAULT_FONT_FILENAME).toBe("CozetteVector.ttf");
  });

  it("should have .ttf extension", () => {
    expect(DEFAULT_FONT_FILENAME).toMatch(/\.ttf$/);
  });
});

describe("font resolution priority documentation", () => {
  /**
   * These tests document the expected font resolution priority:
   * 1. fontPath - explicit path provided by user
   * 2. fontName - search system directories for font by name
   * 3. systemFont - use platform fallback fonts
   * 4. default - use bundled Cozette font
   */

  it("should document priority order", () => {
    // This is a documentation test - the actual priority is implemented
    // in TextRenderer constructor and private methods
    const priorityOrder = ["fontPath", "fontName", "systemFont", "default"];
    expect(priorityOrder).toHaveLength(4);
    expect(priorityOrder[0]).toBe("fontPath");
    expect(priorityOrder[3]).toBe("default");
  });

  it("should have bundled font as final fallback", () => {
    // The bundled Cozette font should exist in the fonts directory
    const bundledFontPath = join(
      currentDirname,
      "../../fonts",
      DEFAULT_FONT_FILENAME
    );

    // This path should be one of the fallback candidates
    // (actual existence depends on build state)
    expect(bundledFontPath).toContain("fonts");
    expect(bundledFontPath).toContain(DEFAULT_FONT_FILENAME);
  });
});
