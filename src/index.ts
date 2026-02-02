/**
 * ink-sdl
 *
 * Render Ink TUI applications to an SDL window instead of the terminal.
 *
 * @example
 * ```typescript
 * import { render, Text, Box } from "ink";
 * import { createSdlStreams } from "ink-sdl";
 *
 * const App = () => (
 *   <Box flexDirection="column">
 *     <Text color="green">Hello from SDL!</Text>
 *   </Box>
 * );
 *
 * const { stdin, stdout, window } = createSdlStreams({
 *   title: "My App",
 *   width: 800,
 *   height: 600,
 * });
 *
 * render(<App />, { stdin, stdout });
 *
 * window.on("close", () => process.exit(0));
 * ```
 */

// Main API
export {
  createSdlStreams,
  type SdlStreamsOptions,
  type SdlStreams,
  SdlWindow,
  SdlOutputStream,
  SdlInputStream,
} from "./streams";

// SDL availability check
import { isSDL2Available, isSDL_ttfAvailable } from "./sdl";
export { isSDL2Available, isSDL_ttfAvailable };

/**
 * Check if SDL is available for rendering
 */
export const isSdlAvailable = (): boolean => {
  try {
    return isSDL2Available() && isSDL_ttfAvailable();
  } catch {
    return false;
  }
};

// Advanced exports for custom implementations
export { SdlUiRenderer, type SdlUiRendererOptions } from "./renderer";
export {
  AnsiParser,
  type Color,
  type DrawCommand,
} from "./renderer/ansi-parser";
export { TextRenderer } from "./renderer/text-renderer";
export { InputBridge, type InkKeyEvent } from "./input/input-bridge";

// SDL bindings (for advanced use)
export {
  getSDL2,
  getSDL_ttf,
  SDL2API,
  SDL_ttfAPI,
  createSDLRect,
  type SDLPointer,
  type SdlKeyEvent,
} from "./sdl";
