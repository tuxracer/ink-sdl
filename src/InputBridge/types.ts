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

/**
 * Track modifier key state
 */
export interface ModifierState {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
}
