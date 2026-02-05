/**
 * SDL Input Bridge
 *
 * Maps SDL keyboard events to terminal escape sequences for Ink compatibility.
 */

import { isNonNullish } from "remeda";
import {
  SDLK_RETURN,
  SDLK_ESCAPE,
  SDLK_SPACE,
  SDLK_UP,
  SDLK_DOWN,
  SDLK_LEFT,
  SDLK_RIGHT,
  SDLK_BACKSPACE,
  SDLK_TAB,
  SDLK_DELETE,
  SDLK_HOME,
  SDLK_END,
  SDLK_PAGEUP,
  SDLK_PAGEDOWN,
  SDLK_F1,
  SDLK_F12,
  SDLK_LSHIFT,
  SDLK_RSHIFT,
  SDLK_LCTRL,
  SDLK_RCTRL,
  SDLK_LALT,
  SDLK_RALT,
  ASCII_A_LOWER,
  ASCII_Z_LOWER,
} from "../Sdl2";
import type { SdlKeyEvent } from "../Sdl2";
import {
  ASCII_PRINTABLE_START,
  ASCII_PRINTABLE_END,
  CTRL_KEY_OFFSET,
  ASCII_BRACKET_OPEN,
  ASCII_BACKSLASH,
  ASCII_BRACKET_CLOSE,
  ASCII_CARET,
  ASCII_UNDERSCORE,
  FUNCTION_KEY_OFFSET_3,
  FUNCTION_KEY_OFFSET_4,
  FUNCTION_KEY_OFFSET_5,
  FUNCTION_KEY_OFFSET_6,
  FUNCTION_KEY_OFFSET_7,
  FUNCTION_KEY_OFFSET_8,
  FUNCTION_KEY_OFFSET_9,
  FUNCTION_KEY_OFFSET_10,
} from "./consts";

import type { InkKeyEvent } from "./types";

export * from "./types";

/**
 * Track modifier key state
 */
interface ModifierState {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
}

/**
 * SDL to Terminal Input Bridge
 *
 * Converts SDL keyboard events to terminal-compatible sequences
 * that Ink can understand.
 */
export class InputBridge {
  private modifiers: ModifierState = {
    shift: false,
    ctrl: false,
    alt: false,
  };

  /**
   * Process an SDL key event and return terminal sequence
   */
  processKeyEvent(event: SdlKeyEvent): string | null {
    const { keycode, pressed } = event;

    // Update modifier state
    if (this.isModifierKey(keycode)) {
      this.updateModifierState(keycode, pressed);
      return null;
    }

    // Only emit sequences on key press
    if (!pressed) {
      return null;
    }

    // Handle special keys
    const specialSequence = this.getSpecialKeySequence(keycode);
    if (isNonNullish(specialSequence)) {
      return specialSequence;
    }

    // Handle Ctrl+key combinations
    if (this.modifiers.ctrl) {
      const ctrlSequence = this.getCtrlSequence(keycode);
      if (isNonNullish(ctrlSequence)) {
        return ctrlSequence;
      }
    }

    // Handle printable characters
    if (keycode >= ASCII_PRINTABLE_START && keycode <= ASCII_PRINTABLE_END) {
      let char = String.fromCharCode(keycode);

      // Apply shift for letters
      if (
        this.modifiers.shift &&
        keycode >= ASCII_A_LOWER &&
        keycode <= ASCII_Z_LOWER
      ) {
        char = char.toUpperCase();
      }

      return char;
    }

    return null;
  }

  /**
   * Check if a keycode is a modifier key
   */
  private isModifierKey(keycode: number): boolean {
    return (
      keycode === SDLK_LSHIFT ||
      keycode === SDLK_RSHIFT ||
      keycode === SDLK_LCTRL ||
      keycode === SDLK_RCTRL ||
      keycode === SDLK_LALT ||
      keycode === SDLK_RALT
    );
  }

  /**
   * Update modifier key state
   */
  private updateModifierState(keycode: number, pressed: boolean): void {
    if (keycode === SDLK_LSHIFT || keycode === SDLK_RSHIFT) {
      this.modifiers.shift = pressed;
    } else if (keycode === SDLK_LCTRL || keycode === SDLK_RCTRL) {
      this.modifiers.ctrl = pressed;
    } else if (keycode === SDLK_LALT || keycode === SDLK_RALT) {
      this.modifiers.alt = pressed;
    }
  }

  /**
   * Get terminal escape sequence for special keys
   */
  private getSpecialKeySequence(keycode: number): string | null {
    switch (keycode) {
      // Navigation keys
      case SDLK_UP:
        return "\x1b[A";
      case SDLK_DOWN:
        return "\x1b[B";
      case SDLK_RIGHT:
        return "\x1b[C";
      case SDLK_LEFT:
        return "\x1b[D";
      case SDLK_HOME:
        return "\x1b[H";
      case SDLK_END:
        return "\x1b[F";
      case SDLK_PAGEUP:
        return "\x1b[5~";
      case SDLK_PAGEDOWN:
        return "\x1b[6~";

      // Control keys
      case SDLK_RETURN:
        return "\r";
      case SDLK_ESCAPE:
        return "\x1b";
      case SDLK_BACKSPACE:
        return "\x7f";
      case SDLK_TAB:
        return this.modifiers.shift ? "\x1b[Z" : "\t";
      case SDLK_DELETE:
        return "\x1b[3~";
      case SDLK_SPACE:
        return " ";

      // Function keys
      case SDLK_F1:
        return "\x1bOP";
      case SDLK_F1 + 1:
        return "\x1bOQ";
      case SDLK_F1 + 2:
        return "\x1bOR";
      case SDLK_F1 + FUNCTION_KEY_OFFSET_3:
        return "\x1bOS";
      case SDLK_F1 + FUNCTION_KEY_OFFSET_4:
        return "\x1b[15~";
      case SDLK_F1 + FUNCTION_KEY_OFFSET_5:
        return "\x1b[17~";
      case SDLK_F1 + FUNCTION_KEY_OFFSET_6:
        return "\x1b[18~";
      case SDLK_F1 + FUNCTION_KEY_OFFSET_7:
        return "\x1b[19~";
      case SDLK_F1 + FUNCTION_KEY_OFFSET_8:
        return "\x1b[20~";
      case SDLK_F1 + FUNCTION_KEY_OFFSET_9:
        return "\x1b[21~";
      case SDLK_F1 + FUNCTION_KEY_OFFSET_10:
        return "\x1b[23~";
      case SDLK_F12:
        return "\x1b[24~";

      default:
        return null;
    }
  }

  /**
   * Get Ctrl+key sequence
   */
  private getCtrlSequence(keycode: number): string | null {
    // Ctrl+A through Ctrl+Z (a-z keys)
    if (keycode >= ASCII_A_LOWER && keycode <= ASCII_Z_LOWER) {
      const ctrlCode = keycode - CTRL_KEY_OFFSET;
      return String.fromCharCode(ctrlCode);
    }

    // Ctrl+special keys
    switch (keycode) {
      case SDLK_SPACE:
        return "\x00"; // Ctrl+Space = NUL
      case ASCII_BRACKET_OPEN: // [
        return "\x1b"; // Ctrl+[ = Escape
      case ASCII_BACKSLASH: // \
        return "\x1c"; // Ctrl+\ = FS
      case ASCII_BRACKET_CLOSE: // ]
        return "\x1d"; // Ctrl+] = GS
      case ASCII_CARET: // ^
        return "\x1e"; // Ctrl+^ = RS
      case ASCII_UNDERSCORE: // _
        return "\x1f"; // Ctrl+_ = US
      default:
        return null;
    }
  }

  /**
   * Convert SDL key event to Ink-style key event
   */
  toInkKeyEvent(event: SdlKeyEvent): InkKeyEvent | null {
    const sequence = this.processKeyEvent(event);
    if (!isNonNullish(sequence)) {
      return null;
    }

    // Determine key name
    let name = "";
    if (sequence.length === 1 && sequence >= " " && sequence <= "~") {
      name = sequence;
    } else {
      name = this.getKeyName(event.keycode);
    }

    return {
      sequence,
      name,
      ctrl: this.modifiers.ctrl,
      meta: this.modifiers.alt,
      shift: this.modifiers.shift,
    };
  }

  /**
   * Get human-readable key name
   */
  private getKeyName(keycode: number): string {
    switch (keycode) {
      case SDLK_UP:
        return "up";
      case SDLK_DOWN:
        return "down";
      case SDLK_LEFT:
        return "left";
      case SDLK_RIGHT:
        return "right";
      case SDLK_RETURN:
        return "return";
      case SDLK_ESCAPE:
        return "escape";
      case SDLK_BACKSPACE:
        return "backspace";
      case SDLK_TAB:
        return "tab";
      case SDLK_DELETE:
        return "delete";
      case SDLK_HOME:
        return "home";
      case SDLK_END:
        return "end";
      case SDLK_PAGEUP:
        return "pageup";
      case SDLK_PAGEDOWN:
        return "pagedown";
      default:
        if (keycode >= SDLK_F1 && keycode <= SDLK_F12) {
          return `f${keycode - SDLK_F1 + 1}`;
        }
        return "unknown";
    }
  }

  /**
   * Reset modifier state
   */
  reset(): void {
    this.modifiers = {
      shift: false,
      ctrl: false,
      alt: false,
    };
  }

  /**
   * Get current modifier state
   */
  getModifiers(): ModifierState {
    return { ...this.modifiers };
  }
}

// Re-export consts and types
export * from "./consts";
export type { SdlKeyEvent } from "../Sdl2";
