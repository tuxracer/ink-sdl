/** RGB color value */
export interface Color {
  r: number;
  g: number;
  b: number;
}

/** Types of draw commands */
export type DrawCommandType =
  | "text"
  | "clear_screen"
  | "clear_line"
  | "cursor_move"
  | "set_fg"
  | "set_bg"
  | "reset_style"
  | "set_bold"
  | "set_dim"
  | "set_italic"
  | "set_underline"
  | "set_strikethrough"
  | "set_reverse";

/** A single draw command from parsed ANSI output */
export interface DrawCommand {
  type: DrawCommandType;
  text?: string;
  row?: number;
  col?: number;
  color?: Color;
  enabled?: boolean;
}
