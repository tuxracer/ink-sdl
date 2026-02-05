/**
 * Tests for InputBridge
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InputBridge } from ".";
import {
  SDLK_RETURN,
  SDLK_ESCAPE,
  SDLK_UP,
  SDLK_DOWN,
  SDLK_LEFT,
  SDLK_RIGHT,
  SDLK_LCTRL,
  SDLK_LSHIFT,
  SDLK_LALT,
  ASCII_A_LOWER,
} from "../Sdl2/consts";

describe("InputBridge", () => {
  let bridge: InputBridge;

  beforeEach(() => {
    bridge = new InputBridge();
  });

  describe("special keys", () => {
    it("should convert Enter to carriage return", () => {
      const result = bridge.processKeyEvent({
        keycode: SDLK_RETURN,
        pressed: true,
        repeat: false,
      });

      expect(result).toBe("\r");
    });

    it("should convert Escape to escape sequence", () => {
      const result = bridge.processKeyEvent({
        keycode: SDLK_ESCAPE,
        pressed: true,
        repeat: false,
      });

      expect(result).toBe("\x1b");
    });

    it("should convert arrow keys to ANSI sequences", () => {
      expect(
        bridge.processKeyEvent({
          keycode: SDLK_UP,
          pressed: true,
          repeat: false,
        })
      ).toBe("\x1b[A");

      expect(
        bridge.processKeyEvent({
          keycode: SDLK_DOWN,
          pressed: true,
          repeat: false,
        })
      ).toBe("\x1b[B");

      expect(
        bridge.processKeyEvent({
          keycode: SDLK_RIGHT,
          pressed: true,
          repeat: false,
        })
      ).toBe("\x1b[C");

      expect(
        bridge.processKeyEvent({
          keycode: SDLK_LEFT,
          pressed: true,
          repeat: false,
        })
      ).toBe("\x1b[D");
    });
  });

  describe("modifier keys", () => {
    it("should not emit sequence for modifier key alone", () => {
      const result = bridge.processKeyEvent({
        keycode: SDLK_LCTRL,
        pressed: true,
        repeat: false,
      });

      expect(result).toBeNull();
    });

    it("should track ctrl modifier state", () => {
      bridge.processKeyEvent({
        keycode: SDLK_LCTRL,
        pressed: true,
        repeat: false,
      });

      const modifiers = bridge.getModifiers();
      expect(modifiers.ctrl).toBe(true);
    });

    it("should generate Ctrl+C sequence", () => {
      // Press Ctrl
      bridge.processKeyEvent({
        keycode: SDLK_LCTRL,
        pressed: true,
        repeat: false,
      });

      // Press 'c'
      const result = bridge.processKeyEvent({
        keycode: 99, // 'c'
        pressed: true,
        repeat: false,
      });

      expect(result).toBe("\x03"); // Ctrl+C = 0x03
    });

    it("should apply shift to letters", () => {
      // Press Shift
      bridge.processKeyEvent({
        keycode: SDLK_LSHIFT,
        pressed: true,
        repeat: false,
      });

      // Press 'a'
      const result = bridge.processKeyEvent({
        keycode: ASCII_A_LOWER,
        pressed: true,
        repeat: false,
      });

      expect(result).toBe("A");
    });
  });

  describe("printable characters", () => {
    it("should pass through lowercase letters", () => {
      const result = bridge.processKeyEvent({
        keycode: ASCII_A_LOWER,
        pressed: true,
        repeat: false,
      });

      expect(result).toBe("a");
    });
  });

  describe("key release", () => {
    it("should not emit sequence on key release", () => {
      const result = bridge.processKeyEvent({
        keycode: SDLK_RETURN,
        pressed: false,
        repeat: false,
      });

      expect(result).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset modifier state", () => {
      bridge.processKeyEvent({
        keycode: SDLK_LCTRL,
        pressed: true,
        repeat: false,
      });

      bridge.reset();

      const modifiers = bridge.getModifiers();
      expect(modifiers.ctrl).toBe(false);
      expect(modifiers.shift).toBe(false);
      expect(modifiers.alt).toBe(false);
    });

    it("should reset all modifier keys when multiple are pressed", () => {
      // Press all modifiers
      bridge.processKeyEvent({
        keycode: SDLK_LCTRL,
        pressed: true,
        repeat: false,
      });
      bridge.processKeyEvent({
        keycode: SDLK_LSHIFT,
        pressed: true,
        repeat: false,
      });
      bridge.processKeyEvent({
        keycode: SDLK_LALT,
        pressed: true,
        repeat: false,
      });

      // Verify all are set
      let modifiers = bridge.getModifiers();
      expect(modifiers.ctrl).toBe(true);
      expect(modifiers.shift).toBe(true);
      expect(modifiers.alt).toBe(true);

      // Reset (simulating focus loss)
      bridge.reset();

      // Verify all are cleared
      modifiers = bridge.getModifiers();
      expect(modifiers.ctrl).toBe(false);
      expect(modifiers.shift).toBe(false);
      expect(modifiers.alt).toBe(false);
    });
  });
});
