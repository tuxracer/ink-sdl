/**
 * Tests for SdlUiRenderer utilities
 */

import { describe, it, expect } from "vitest";
import { parseBackgroundColor } from ".";

describe("parseBackgroundColor", () => {
  describe("undefined input", () => {
    it("should return default black when undefined", () => {
      const result = parseBackgroundColor(undefined);

      expect(result).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe("RGB tuple input", () => {
    it("should parse RGB tuple with standard values", () => {
      const result = parseBackgroundColor([100, 150, 200]);

      expect(result).toEqual({ r: 100, g: 150, b: 200 });
    });

    it("should parse RGB tuple with all zeros (black)", () => {
      const result = parseBackgroundColor([0, 0, 0]);

      expect(result).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("should parse RGB tuple with max values (white)", () => {
      const result = parseBackgroundColor([255, 255, 255]);

      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it("should parse RGB tuple with primary colors", () => {
      expect(parseBackgroundColor([255, 0, 0])).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseBackgroundColor([0, 255, 0])).toEqual({ r: 0, g: 255, b: 0 });
      expect(parseBackgroundColor([0, 0, 255])).toEqual({ r: 0, g: 0, b: 255 });
    });
  });

  describe("hex string input", () => {
    it("should parse hex string with # prefix", () => {
      const result = parseBackgroundColor("#FF8800");

      expect(result).toEqual({ r: 255, g: 136, b: 0 });
    });

    it("should parse hex string without # prefix", () => {
      const result = parseBackgroundColor("3366CC");

      expect(result).toEqual({ r: 51, g: 102, b: 204 });
    });

    it("should parse black hex color", () => {
      expect(parseBackgroundColor("#000000")).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseBackgroundColor("000000")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("should parse white hex color", () => {
      expect(parseBackgroundColor("#FFFFFF")).toEqual({
        r: 255,
        g: 255,
        b: 255,
      });
      expect(parseBackgroundColor("FFFFFF")).toEqual({
        r: 255,
        g: 255,
        b: 255,
      });
    });

    it("should handle lowercase hex", () => {
      const result = parseBackgroundColor("#aabbcc");

      expect(result).toEqual({ r: 170, g: 187, b: 204 });
    });

    it("should handle mixed case hex", () => {
      const result = parseBackgroundColor("#AaBbCc");

      expect(result).toEqual({ r: 170, g: 187, b: 204 });
    });

    it("should parse hex with leading zeros", () => {
      const result = parseBackgroundColor("#001122");

      expect(result).toEqual({ r: 0, g: 17, b: 34 });
    });
  });

  describe("invalid input", () => {
    it("should return default black for invalid hex length", () => {
      expect(parseBackgroundColor("#FFF")).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseBackgroundColor("#FFFFFFF")).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseBackgroundColor("")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("should return default black for invalid hex characters", () => {
      expect(parseBackgroundColor("#GGGGGG")).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseBackgroundColor("#ZZZZZZ")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("should return default black for partially invalid hex", () => {
      // "GG" is invalid hex but "00" and "FF" are valid
      // parseInt will return NaN for invalid hex
      expect(parseBackgroundColor("#GG00FF")).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe("return value independence", () => {
    it("should return a new object each time for undefined", () => {
      const result1 = parseBackgroundColor(undefined);
      const result2 = parseBackgroundColor(undefined);

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });
});
