/**
 * Tests for SdlOutputStream
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SdlOutputStream } from ".";
import type { SdlUiRenderer } from "../SdlUiRenderer";

/** Create a mock SdlUiRenderer */
const createMockRenderer = (): SdlUiRenderer => {
  return {
    processAnsi: vi.fn(),
    present: vi.fn(),
    clear: vi.fn(),
    getDimensions: vi.fn().mockReturnValue({ columns: 80, rows: 24 }),
    getCursorPos: vi.fn().mockReturnValue({ x: 1, y: 1 }),
  } as unknown as SdlUiRenderer;
};

describe("SdlOutputStream", () => {
  let stream: SdlOutputStream;
  let mockRenderer: ReturnType<typeof createMockRenderer>;

  beforeEach(() => {
    mockRenderer = createMockRenderer();
    stream = new SdlOutputStream(mockRenderer);
  });

  describe("TTY interface", () => {
    it("should expose isTTY as true", () => {
      expect(stream.isTTY).toBe(true);
    });

    it("should return columns from renderer", () => {
      expect(stream.columns).toBe(80);
    });

    it("should return rows from renderer", () => {
      expect(stream.rows).toBe(24);
    });
  });

  describe("write", () => {
    it("should pass string data to renderer", async () => {
      await new Promise<void>((resolve) => {
        stream.write("Hello, World!", () => {
          expect(mockRenderer.processAnsi).toHaveBeenCalledWith(
            "Hello, World!"
          );
          expect(mockRenderer.present).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it("should convert Buffer to string", async () => {
      await new Promise<void>((resolve) => {
        stream.write(Buffer.from("Buffer text"), () => {
          expect(mockRenderer.processAnsi).toHaveBeenCalledWith("Buffer text");
          resolve();
        });
      });
    });

    it("should handle ANSI sequences", async () => {
      const ansi = "\x1b[31mRed text\x1b[0m";
      await new Promise<void>((resolve) => {
        stream.write(ansi, () => {
          expect(mockRenderer.processAnsi).toHaveBeenCalledWith(ansi);
          resolve();
        });
      });
    });
  });

  describe("writeSync", () => {
    it("should write directly to renderer", () => {
      stream.writeSync("Sync text");

      expect(mockRenderer.processAnsi).toHaveBeenCalledWith("Sync text");
      expect(mockRenderer.present).toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("should call renderer clear", () => {
      stream.clear();

      expect(mockRenderer.clear).toHaveBeenCalled();
    });
  });

  describe("notifyResize", () => {
    it("should emit resize event", async () => {
      const promise = new Promise<void>((resolve) => {
        stream.on("resize", () => {
          resolve();
        });
      });

      stream.notifyResize();
      await promise;
    });
  });

  describe("getRenderer", () => {
    it("should return the underlying renderer", () => {
      expect(stream.getRenderer()).toBe(mockRenderer);
    });
  });

  describe("getCursorPos", () => {
    it("should delegate to renderer", () => {
      const pos = stream.getCursorPos();

      expect(pos).toEqual({ x: 1, y: 1 });
      expect(mockRenderer.getCursorPos).toHaveBeenCalled();
    });
  });

  describe("default dimensions", () => {
    it("should use defaults when renderer returns zero", () => {
      vi.mocked(mockRenderer.getDimensions).mockReturnValue({
        columns: 0,
        rows: 0,
      });

      // Default columns is 80, rows is 24
      expect(stream.columns).toBe(80);
      expect(stream.rows).toBe(24);
    });
  });

  describe("error handling", () => {
    it("should pass errors to callback", async () => {
      const error = new Error("Render failed");
      vi.mocked(mockRenderer.processAnsi).mockImplementation(() => {
        throw error;
      });

      // Prevent unhandled error event from crashing the test
      stream.on("error", () => {
        // Expected error, ignore
      });

      await new Promise<void>((resolve) => {
        stream.write("text", (err) => {
          expect(err).toBe(error);
          resolve();
        });
      });
    });
  });
});
