/**
 * Terminal-style key event for Ink
 */
export interface InkKeyEvent {
  sequence: string;
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}
