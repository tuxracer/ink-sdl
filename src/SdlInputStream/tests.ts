/**
 * Tests for SdlInputStream
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { describe, it, expect, beforeEach } from "vitest";
import { SdlInputStream } from ".";

describe("SdlInputStream", () => {
  let stream: SdlInputStream;

  beforeEach(() => {
    stream = new SdlInputStream();
  });

  describe("TTY interface", () => {
    it("should expose isTTY as true", () => {
      expect(stream.isTTY).toBe(true);
    });

    it("should expose isRaw as true", () => {
      expect(stream.isRaw).toBe(true);
    });

    it("should return this from setRawMode", () => {
      expect(stream.setRawMode(true)).toBe(stream);
      expect(stream.setRawMode(false)).toBe(stream);
    });

    it("should return this from ref", () => {
      expect(stream.ref()).toBe(stream);
    });

    it("should return this from unref", () => {
      expect(stream.unref()).toBe(stream);
    });
  });

  describe("pushKey", () => {
    it("should buffer key sequences", () => {
      stream.pushKey("a");
      stream.pushKey("b");

      expect(stream.hasData()).toBe(true);
    });

    it("should report no data when buffer is empty", () => {
      expect(stream.hasData()).toBe(false);
    });
  });

  describe("reading data", () => {
    it("should emit pushed data when read", async () => {
      const chunks: string[] = [];

      const promise = new Promise<void>((resolve) => {
        stream.on("data", (chunk: string) => {
          chunks.push(chunk);
          if (chunks.length === 2) {
            resolve();
          }
        });
      });

      stream.pushKey("hello");
      stream.pushKey("world");

      await promise;
      expect(chunks).toEqual(["hello", "world"]);
    });

    it("should handle reading when no data is available", async () => {
      const promise = new Promise<string>((resolve) => {
        stream.on("data", (chunk: string) => {
          resolve(chunk);
        });
      });

      // Simulate async data arrival
      setTimeout(() => {
        stream.pushKey("delayed");
      }, 10);

      const chunk = await promise;
      expect(chunk).toBe("delayed");
    });
  });

  describe("clear", () => {
    it("should clear buffered data", () => {
      stream.pushKey("a");
      stream.pushKey("b");
      expect(stream.hasData()).toBe(true);

      stream.clear();
      expect(stream.hasData()).toBe(false);
    });
  });

  describe("close", () => {
    it("should end the stream", async () => {
      // Need to consume the stream for "end" event to fire
      const promise = new Promise<void>((resolve) => {
        stream.on("end", () => {
          resolve();
        });
        // Start consuming the stream
        stream.resume();
      });

      stream.close();
      await promise;
    });
  });
});
