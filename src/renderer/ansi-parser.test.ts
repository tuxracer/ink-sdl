/**
 * Tests for AnsiParser
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { describe, it, expect, beforeEach } from "vitest";
import { AnsiParser } from "./ansi-parser";

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
});
