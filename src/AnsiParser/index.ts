/**
 * ANSI Parser for SDL UI Rendering
 *
 * Parses terminal ANSI escape sequences and converts them to draw commands
 * for rendering in an SDL window.
 */

import { COLOR_CHANNEL_MAX } from "../consts";
import {
  ANSI_STANDARD_COLOR_COUNT,
  ANSI_TAB_WIDTH,
  ANSI_ERASE_ENTIRE_SCREEN,
  ANSI_ERASE_TO_END_AND_BEYOND,
  ANSI_EXTENDED_COLOR_OFFSET_256,
  ANSI_EXTENDED_RGB_MIN_PARAMS,
  ANSI_EXTENDED_COLOR_OFFSET_RGB,
  ANSI_RGB_R_OFFSET,
  ANSI_RGB_G_OFFSET,
  ANSI_RGB_B_OFFSET,
  ANSI_CUBE_RED_MULTIPLIER,
  ANSI_CUBE_STEP,
  ANSI_CUBE_BASE,
  ANSI_256_COLOR_LEVELS,
  DEFAULT_FG,
  DEFAULT_BG,
  ANSI_COLORS_NORMAL,
  ANSI_COLORS_BRIGHT,
  SGR_RESET,
  SGR_BOLD,
  SGR_DIM,
  SGR_ITALIC,
  SGR_UNDERLINE,
  SGR_REVERSE,
  SGR_STRIKETHROUGH,
  SGR_NORMAL_INTENSITY,
  SGR_NO_ITALIC,
  SGR_NO_UNDERLINE,
  SGR_NO_REVERSE,
  SGR_NO_STRIKETHROUGH,
  SGR_FG_BASE,
  SGR_FG_END,
  SGR_FG_DEFAULT,
  SGR_BG_BASE,
  SGR_BG_END,
  SGR_BG_DEFAULT,
  SGR_FG_BRIGHT_BASE,
  SGR_FG_BRIGHT_END,
  SGR_BG_BRIGHT_BASE,
  SGR_BG_BRIGHT_END,
  SGR_EXTENDED,
  SGR_EXTENDED_BG,
  EXTENDED_256,
  EXTENDED_RGB,
  COLOR_CUBE_START,
  COLOR_CUBE_END,
  GRAYSCALE_START,
  GRAYSCALE_END,
  GRAYSCALE_STEP,
  GRAYSCALE_BASE,
} from "./consts";

import type { Color, DrawCommand } from "./types";

export * from "./types";

/**
 * Convert ANSI 256-color index to RGB
 */
const ansi256ToRgb = (index: number): Color => {
  // Standard 16 colors (0-15)
  if (index < COLOR_CUBE_START) {
    if (index < ANSI_STANDARD_COLOR_COUNT) {
      return ANSI_COLORS_NORMAL[index]!;
    }
    return ANSI_COLORS_BRIGHT[index - ANSI_STANDARD_COLOR_COUNT]!;
  }

  // 6x6x6 color cube (16-231)
  if (index <= COLOR_CUBE_END) {
    const cubeIndex = index - COLOR_CUBE_START;
    const r = Math.floor(cubeIndex / ANSI_CUBE_RED_MULTIPLIER);
    const g = Math.floor(
      (cubeIndex % ANSI_CUBE_RED_MULTIPLIER) / ANSI_256_COLOR_LEVELS
    );
    const b = cubeIndex % ANSI_256_COLOR_LEVELS;
    return {
      r: r > 0 ? r * ANSI_CUBE_STEP + ANSI_CUBE_BASE : 0,
      g: g > 0 ? g * ANSI_CUBE_STEP + ANSI_CUBE_BASE : 0,
      b: b > 0 ? b * ANSI_CUBE_STEP + ANSI_CUBE_BASE : 0,
    };
  }

  // Grayscale ramp (232-255)
  if (index <= GRAYSCALE_END) {
    const gray = (index - GRAYSCALE_START) * GRAYSCALE_STEP + GRAYSCALE_BASE;
    return { r: gray, g: gray, b: gray };
  }

  return DEFAULT_FG;
};

/**
 * ANSI sequence parser
 *
 * Parses ANSI escape sequences from terminal output and produces
 * draw commands for SDL rendering.
 */
export class AnsiParser {
  private cursorRow = 1;
  private cursorCol = 1;
  private fgColor: Color = { ...DEFAULT_FG };
  private bgColor: Color = { ...DEFAULT_BG };
  private bold = false;

  /**
   * Parse an ANSI string and return draw commands
   */
  parse(input: string): DrawCommand[] {
    const commands: DrawCommand[] = [];
    let i = 0;
    let textBuffer = "";

    const flushText = (): void => {
      if (textBuffer.length > 0) {
        commands.push({
          type: "text",
          text: textBuffer,
          row: this.cursorRow,
          col: this.cursorCol,
        });
        this.cursorCol += textBuffer.length;
        textBuffer = "";
      }
    };

    while (i < input.length) {
      const char = input[i];

      // Check for escape sequence
      if (char === "\x1b" && input[i + 1] === "[") {
        flushText();

        // Find end of escape sequence
        let j = i + 2;
        while (j < input.length && !/[A-Za-z]/.test(input[j]!)) {
          j++;
        }

        if (j < input.length) {
          const sequence = input.substring(i + 2, j);
          const command = input[j]!;
          this.processEscapeSequence(sequence, command, commands);
          i = j + 1;
        } else {
          i++;
        }
        continue;
      }

      // Handle newline
      if (char === "\n") {
        flushText();
        this.cursorRow++;
        this.cursorCol = 1;
        i++;
        continue;
      }

      // Handle carriage return
      if (char === "\r") {
        flushText();
        this.cursorCol = 1;
        i++;
        continue;
      }

      // Handle tab
      if (char === "\t") {
        flushText();
        const nextTab =
          Math.ceil(this.cursorCol / ANSI_TAB_WIDTH) * ANSI_TAB_WIDTH + 1;
        const spaces = nextTab - this.cursorCol;
        textBuffer = " ".repeat(spaces);
        flushText();
        i++;
        continue;
      }

      // Regular character
      textBuffer += char;
      i++;
    }

    flushText();
    return commands;
  }

  /**
   * Process an escape sequence and emit draw commands
   */
  private processEscapeSequence(
    params: string,
    command: string,
    commands: DrawCommand[]
  ): void {
    switch (command) {
      case "H": // Cursor Position (CUP)
      case "f": // Horizontal and Vertical Position (HVP)
        this.processCursorPosition(params, commands);
        break;

      case "J": // Erase in Display (ED)
        this.processEraseDisplay(params, commands);
        break;

      case "K": // Erase in Line (EL)
        this.processEraseLine(params, commands);
        break;

      case "m": // Select Graphic Rendition (SGR)
        this.processSGR(params, commands);
        break;

      case "A": // Cursor Up
        this.cursorRow = Math.max(1, this.cursorRow - (parseInt(params) || 1));
        break;

      case "B": // Cursor Down
        this.cursorRow += parseInt(params) || 1;
        break;

      case "C": // Cursor Forward
        this.cursorCol += parseInt(params) || 1;
        break;

      case "D": // Cursor Back
        this.cursorCol = Math.max(1, this.cursorCol - (parseInt(params) || 1));
        break;

      case "G": // Cursor Horizontal Absolute
        this.cursorCol = parseInt(params) || 1;
        break;

      case "s": // Save Cursor Position
      case "u": // Restore Cursor Position
        break;

      default:
        break;
    }
  }

  /**
   * Process cursor position sequence
   */
  private processCursorPosition(params: string, commands: DrawCommand[]): void {
    const parts = params.split(";");
    this.cursorRow = parseInt(parts[0] ?? "1") || 1;
    this.cursorCol = parseInt(parts[1] ?? "1") || 1;
    commands.push({
      type: "cursor_move",
      row: this.cursorRow,
      col: this.cursorCol,
    });
  }

  /**
   * Process erase display sequence
   */
  private processEraseDisplay(params: string, commands: DrawCommand[]): void {
    const mode = parseInt(params) || 0;
    if (
      mode === ANSI_ERASE_ENTIRE_SCREEN ||
      mode === ANSI_ERASE_TO_END_AND_BEYOND
    ) {
      commands.push({ type: "clear_screen" });
      this.cursorRow = 1;
      this.cursorCol = 1;
    }
  }

  /**
   * Process erase line sequence
   */
  private processEraseLine(params: string, commands: DrawCommand[]): void {
    const mode = parseInt(params) || 0;
    commands.push({
      type: "clear_line",
      row: this.cursorRow,
      col: mode === 0 ? this.cursorCol : 1,
    });
  }

  /**
   * Process SGR (Select Graphic Rendition) sequence
   */
  private processSGR(params: string, commands: DrawCommand[]): void {
    if (params === "" || params === "0") {
      this.resetStyle(commands);
      return;
    }

    const codes = params.split(";").map((s) => parseInt(s) || 0);
    let i = 0;

    while (i < codes.length) {
      const code = codes[i]!;

      if (code === SGR_RESET) {
        this.resetStyle(commands);
      } else if (code === SGR_BOLD) {
        this.bold = true;
        commands.push({ type: "set_bold", enabled: true });
      } else if (code === SGR_DIM) {
        commands.push({ type: "set_dim", enabled: true });
      } else if (code === SGR_ITALIC) {
        commands.push({ type: "set_italic", enabled: true });
      } else if (code === SGR_UNDERLINE) {
        commands.push({ type: "set_underline", enabled: true });
      } else if (code === SGR_REVERSE) {
        commands.push({ type: "set_reverse", enabled: true });
      } else if (code === SGR_STRIKETHROUGH) {
        commands.push({ type: "set_strikethrough", enabled: true });
      } else if (code === SGR_NORMAL_INTENSITY) {
        this.bold = false;
        commands.push({ type: "set_bold", enabled: false });
        commands.push({ type: "set_dim", enabled: false });
      } else if (code === SGR_NO_ITALIC) {
        commands.push({ type: "set_italic", enabled: false });
      } else if (code === SGR_NO_UNDERLINE) {
        commands.push({ type: "set_underline", enabled: false });
      } else if (code === SGR_NO_REVERSE) {
        commands.push({ type: "set_reverse", enabled: false });
      } else if (code === SGR_NO_STRIKETHROUGH) {
        commands.push({ type: "set_strikethrough", enabled: false });
      } else if (code >= SGR_FG_BASE && code <= SGR_FG_END) {
        const colorIndex = code - SGR_FG_BASE;
        this.fgColor = this.bold
          ? { ...ANSI_COLORS_BRIGHT[colorIndex]! }
          : { ...ANSI_COLORS_NORMAL[colorIndex]! };
        commands.push({ type: "set_fg", color: { ...this.fgColor } });
      } else if (code === SGR_FG_DEFAULT) {
        this.fgColor = { ...DEFAULT_FG };
        commands.push({ type: "set_fg", color: { ...this.fgColor } });
      } else if (code >= SGR_BG_BASE && code <= SGR_BG_END) {
        const colorIndex = code - SGR_BG_BASE;
        this.bgColor = { ...ANSI_COLORS_NORMAL[colorIndex]! };
        commands.push({ type: "set_bg", color: { ...this.bgColor } });
      } else if (code === SGR_BG_DEFAULT) {
        this.bgColor = { ...DEFAULT_BG };
        commands.push({ type: "set_bg", color: { ...this.bgColor } });
      } else if (code >= SGR_FG_BRIGHT_BASE && code <= SGR_FG_BRIGHT_END) {
        const colorIndex = code - SGR_FG_BRIGHT_BASE;
        this.fgColor = { ...ANSI_COLORS_BRIGHT[colorIndex]! };
        commands.push({ type: "set_fg", color: { ...this.fgColor } });
      } else if (code >= SGR_BG_BRIGHT_BASE && code <= SGR_BG_BRIGHT_END) {
        const colorIndex = code - SGR_BG_BRIGHT_BASE;
        this.bgColor = { ...ANSI_COLORS_BRIGHT[colorIndex]! };
        commands.push({ type: "set_bg", color: { ...this.bgColor } });
      } else if (code === SGR_EXTENDED) {
        const result = this.parseExtendedColor(codes, i + 1);
        if (result.color) {
          this.fgColor = result.color;
          commands.push({ type: "set_fg", color: { ...this.fgColor } });
        }
        i = result.nextIndex - 1;
      } else if (code === SGR_EXTENDED_BG) {
        const result = this.parseExtendedColor(codes, i + 1);
        if (result.color) {
          this.bgColor = result.color;
          commands.push({ type: "set_bg", color: { ...this.bgColor } });
        }
        i = result.nextIndex - 1;
      }

      i++;
    }
  }

  /**
   * Parse extended color (256-color or 24-bit)
   */
  private parseExtendedColor(
    codes: number[],
    startIndex: number
  ): { color: Color | null; nextIndex: number } {
    if (startIndex >= codes.length) {
      return { color: null, nextIndex: startIndex };
    }

    const mode = codes[startIndex];

    if (
      mode === EXTENDED_256 &&
      startIndex + ANSI_RGB_R_OFFSET < codes.length
    ) {
      const colorIndex = codes[startIndex + ANSI_RGB_R_OFFSET]!;
      return {
        color: ansi256ToRgb(colorIndex),
        nextIndex: startIndex + ANSI_EXTENDED_COLOR_OFFSET_256,
      };
    }

    if (
      mode === EXTENDED_RGB &&
      startIndex + ANSI_EXTENDED_RGB_MIN_PARAMS < codes.length
    ) {
      return {
        color: {
          r: Math.min(
            COLOR_CHANNEL_MAX,
            Math.max(0, codes[startIndex + ANSI_RGB_R_OFFSET]!)
          ),
          g: Math.min(
            COLOR_CHANNEL_MAX,
            Math.max(0, codes[startIndex + ANSI_RGB_G_OFFSET]!)
          ),
          b: Math.min(
            COLOR_CHANNEL_MAX,
            Math.max(0, codes[startIndex + ANSI_RGB_B_OFFSET]!)
          ),
        },
        nextIndex: startIndex + ANSI_EXTENDED_COLOR_OFFSET_RGB,
      };
    }

    return { color: null, nextIndex: startIndex + 1 };
  }

  /**
   * Reset all styles to default
   */
  private resetStyle(commands: DrawCommand[]): void {
    this.fgColor = { ...DEFAULT_FG };
    this.bgColor = { ...DEFAULT_BG };
    this.bold = false;
    commands.push({ type: "reset_style" });
    commands.push({ type: "set_fg", color: { ...this.fgColor } });
    commands.push({ type: "set_bg", color: { ...this.bgColor } });
  }

  /**
   * Get current cursor position
   */
  getCursor(): { row: number; col: number } {
    return { row: this.cursorRow, col: this.cursorCol };
  }

  /**
   * Get current foreground color
   */
  getFgColor(): Color {
    return { ...this.fgColor };
  }

  /**
   * Get current background color
   */
  getBgColor(): Color {
    return { ...this.bgColor };
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.cursorRow = 1;
    this.cursorCol = 1;
    this.fgColor = { ...DEFAULT_FG };
    this.bgColor = { ...DEFAULT_BG };
    this.bold = false;
  }
}

// Re-export consts
export * from "./consts";
