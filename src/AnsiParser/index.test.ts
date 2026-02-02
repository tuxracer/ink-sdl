/**
 * Tests for AnsiParser
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { describe, it, expect, beforeEach } from "vitest";
import { AnsiParser } from ".";

describe("AnsiParser", () => {
  let parser: AnsiParser;

  beforeEach(() => {
    parser = new AnsiParser();
  });

  describe("text parsing", () => {
    it("should parse plain text", () => {
      const commands = parser.parse("Hello, World!");

      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual({
        type: "text",
        text: "Hello, World!",
        row: 1,
        col: 1,
      });
    });

    it("should advance cursor position after text", () => {
      parser.parse("Hello");
      const cursor = parser.getCursor();

      expect(cursor.row).toBe(1);
      expect(cursor.col).toBe(6);
    });

    it("should handle newlines", () => {
      const commands = parser.parse("Line1\nLine2");

      expect(commands).toHaveLength(2);
      expect(commands[0]?.text).toBe("Line1");
      expect(commands[1]?.row).toBe(2);
      expect(commands[1]?.col).toBe(1);
    });
  });

  describe("cursor movement", () => {
    it("should handle cursor position escape sequence", () => {
      const commands = parser.parse("\x1b[5;10H");

      expect(commands).toContainEqual({
        type: "cursor_move",
        row: 5,
        col: 10,
      });

      const cursor = parser.getCursor();
      expect(cursor.row).toBe(5);
      expect(cursor.col).toBe(10);
    });

    it("should handle cursor up", () => {
      parser.parse("\x1b[5;5H"); // Move to row 5
      parser.parse("\x1b[2A"); // Move up 2

      const cursor = parser.getCursor();
      expect(cursor.row).toBe(3);
    });

    it("should handle cursor down", () => {
      parser.parse("\x1b[2B");

      const cursor = parser.getCursor();
      expect(cursor.row).toBe(3);
    });
  });

  describe("color parsing", () => {
    it("should parse foreground color", () => {
      const commands = parser.parse("\x1b[31mRed");

      const fgCommand = commands.find((c) => c.type === "set_fg");
      expect(fgCommand?.color).toEqual({ r: 187, g: 0, b: 0 });
    });

    it("should parse bright foreground color", () => {
      const commands = parser.parse("\x1b[91mBrightRed");

      const fgCommand = commands.find((c) => c.type === "set_fg");
      expect(fgCommand?.color).toEqual({ r: 255, g: 85, b: 85 });
    });

    it("should parse 256-color mode", () => {
      const commands = parser.parse("\x1b[38;5;196mRed256");

      const fgCommand = commands.find((c) => c.type === "set_fg");
      expect(fgCommand?.color).toBeDefined();
    });

    it("should parse 24-bit RGB color", () => {
      const commands = parser.parse("\x1b[38;2;100;150;200mRGB");

      const fgCommand = commands.find((c) => c.type === "set_fg");
      expect(fgCommand?.color).toEqual({ r: 100, g: 150, b: 200 });
    });
  });

  describe("style parsing", () => {
    it("should handle bold", () => {
      const commands = parser.parse("\x1b[1mBold");

      const boldCommand = commands.find((c) => c.type === "set_bold");
      expect(boldCommand?.enabled).toBe(true);
    });

    it("should handle reset", () => {
      parser.parse("\x1b[31m");
      const commands = parser.parse("\x1b[0m");

      const resetCommand = commands.find((c) => c.type === "reset_style");
      expect(resetCommand).toBeDefined();
    });
  });

  describe("screen clearing", () => {
    it("should handle clear screen", () => {
      const commands = parser.parse("\x1b[2J");

      const clearCommand = commands.find((c) => c.type === "clear_screen");
      expect(clearCommand).toBeDefined();
    });

    it("should handle clear line", () => {
      parser.parse("\x1b[5;10H");
      const commands = parser.parse("\x1b[K");

      const clearCommand = commands.find((c) => c.type === "clear_line");
      expect(clearCommand?.row).toBe(5);
      expect(clearCommand?.col).toBe(10);
    });
  });

  describe("reset", () => {
    it("should reset parser state", () => {
      parser.parse("\x1b[5;10H\x1b[31m");
      parser.reset();

      const cursor = parser.getCursor();
      expect(cursor.row).toBe(1);
      expect(cursor.col).toBe(1);

      const fg = parser.getFgColor();
      expect(fg).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe("edge cases", () => {
    describe("incomplete sequences", () => {
      it("should handle standalone escape character", () => {
        // Just ESC without CSI should be treated as text or ignored
        const commands = parser.parse("\x1b");
        // Parser should not crash
        expect(commands).toBeDefined();
      });

      it("should handle escape followed by non-CSI character", () => {
        const commands = parser.parse("\x1bX");
        expect(commands).toBeDefined();
      });

      it("should handle CSI without terminator at end of input", () => {
        // This tests partial sequence handling
        const commands = parser.parse("\x1b[31");
        expect(commands).toBeDefined();
      });
    });

    describe("multiple SGR codes", () => {
      it("should handle multiple SGR codes in one sequence", () => {
        // Bold + Red foreground + Blue background
        const commands = parser.parse("\x1b[1;31;44mStyled");

        const boldCmd = commands.find((c) => c.type === "set_bold");
        const fgCmd = commands.find((c) => c.type === "set_fg");
        const bgCmd = commands.find((c) => c.type === "set_bg");
        const textCmd = commands.find((c) => c.type === "text");

        // Should set bold mode
        expect(boldCmd?.enabled).toBe(true);
        // Should set some foreground color (red family)
        expect(fgCmd?.color).toBeDefined();
        expect(fgCmd?.color?.r).toBeGreaterThan(0);
        expect(fgCmd?.color?.g).toBeLessThanOrEqual(100);
        expect(fgCmd?.color?.b).toBeLessThanOrEqual(100);
        // Should set some background color (blue family)
        expect(bgCmd?.color).toBeDefined();
        expect(bgCmd?.color?.b).toBeGreaterThan(0);
        // Should include text
        expect(textCmd?.text).toBe("Styled");
      });

      it("should handle reset with other codes", () => {
        const commands = parser.parse("\x1b[0;31mResetThenRed");

        const resetCmd = commands.find((c) => c.type === "reset_style");
        const textCmd = commands.find((c) => c.type === "text");

        // Reset should be emitted
        expect(resetCmd).toBeDefined();
        // Text should be parsed
        expect(textCmd?.text).toBe("ResetThenRed");
      });
    });

    describe("cursor boundaries", () => {
      it("should not move cursor to row 0", () => {
        parser.parse("\x1b[1;1H");
        parser.parse("\x1b[10A"); // Try to go up 10 rows from row 1

        const cursor = parser.getCursor();
        expect(cursor.row).toBeGreaterThanOrEqual(1);
      });

      it("should not move cursor to col 0", () => {
        parser.parse("\x1b[1;1H");
        parser.parse("\x1b[10D"); // Try to go left 10 cols from col 1

        const cursor = parser.getCursor();
        expect(cursor.col).toBeGreaterThanOrEqual(1);
      });

      it("should handle cursor home (H without params)", () => {
        parser.parse("\x1b[5;5H");
        parser.parse("\x1b[H"); // Home

        const cursor = parser.getCursor();
        expect(cursor.row).toBe(1);
        expect(cursor.col).toBe(1);
      });
    });

    describe("256-color edge cases", () => {
      it("should handle color index 0 (black)", () => {
        const commands = parser.parse("\x1b[38;5;0m");
        const fgCmd = commands.find((c) => c.type === "set_fg");
        expect(fgCmd?.color).toBeDefined();
      });

      it("should handle color index 255", () => {
        const commands = parser.parse("\x1b[38;5;255m");
        const fgCmd = commands.find((c) => c.type === "set_fg");
        expect(fgCmd?.color).toBeDefined();
      });

      it("should handle grayscale ramp colors (232-255)", () => {
        const commands = parser.parse("\x1b[38;5;240m");
        const fgCmd = commands.find((c) => c.type === "set_fg");
        expect(fgCmd?.color).toBeDefined();
      });
    });

    describe("RGB edge cases", () => {
      it("should handle RGB with zero values", () => {
        const commands = parser.parse("\x1b[38;2;0;0;0m");
        const fgCmd = commands.find((c) => c.type === "set_fg");
        expect(fgCmd?.color).toEqual({ r: 0, g: 0, b: 0 });
      });

      it("should handle RGB with max values", () => {
        const commands = parser.parse("\x1b[38;2;255;255;255m");
        const fgCmd = commands.find((c) => c.type === "set_fg");
        expect(fgCmd?.color).toEqual({ r: 255, g: 255, b: 255 });
      });
    });

    describe("long text lines", () => {
      it("should handle very long text without crashing", () => {
        const longText = "x".repeat(10000);
        const commands = parser.parse(longText);

        expect(commands).toHaveLength(1);
        expect(commands[0]?.text).toBe(longText);
      });
    });

    describe("mixed content", () => {
      it("should handle rapid style changes", () => {
        const input = "\x1b[31mR\x1b[32mG\x1b[34mB\x1b[0m";
        const commands = parser.parse(input);

        // Should have fg changes and text commands
        const fgCommands = commands.filter((c) => c.type === "set_fg");
        const textCommands = commands.filter((c) => c.type === "text");

        // At least 3 fg changes (one for each color)
        expect(fgCommands.length).toBeGreaterThanOrEqual(3);
        // Exactly 3 text commands (R, G, B)
        expect(textCommands.length).toBe(3);
        expect(textCommands.map((c) => c.text)).toEqual(["R", "G", "B"]);
      });

      it("should handle interleaved cursor moves and text", () => {
        parser.parse("\x1b[1;1HFirst");
        parser.parse("\x1b[2;1HSecond");

        const cursor = parser.getCursor();
        expect(cursor.row).toBe(2);
        expect(cursor.col).toBe(7); // "Second" is 6 chars, cursor at 7
      });
    });

    describe("carriage return", () => {
      it("should handle carriage return", () => {
        parser.parse("Hello");
        parser.parse("\r");

        const cursor = parser.getCursor();
        expect(cursor.col).toBe(1);
        expect(cursor.row).toBe(1);
      });
    });
  });
});
