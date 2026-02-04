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

// Enable ANSI color output for chalk/Ink.
// This must be set before chalk is imported (via Ink) for colors to work.
// If ink-sdl is imported before ink, this will enable colors automatically.
// Otherwise, users should set FORCE_COLOR=3 in their environment.
if (process.env["FORCE_COLOR"] === undefined) {
  process.env["FORCE_COLOR"] = "3";
}

// Main API
export {
  createSdlStreams,
  type SdlStreamsOptions,
  type SdlStreams,
  SdlWindow,
} from "./SdlWindow";
export { SdlOutputStream } from "./SdlOutputStream";
export { SdlInputStream } from "./SdlInputStream";

// SDL availability check
import { isSdl2Available } from "./Sdl2";
import { isSdlTtfAvailable } from "./SdlTtf";
export { isSdl2Available };
export { isSdlTtfAvailable };

/**
 * Check if SDL is available for rendering
 */
export const isSdlAvailable = (): boolean => {
  try {
    return isSdl2Available() && isSdlTtfAvailable();
  } catch {
    return false;
  }
};

// Advanced exports for custom implementations
export {
  SdlUiRenderer,
  type SdlUiRendererOptions,
  type ExistingSdlResources,
} from "./SdlUiRenderer";
export { AnsiParser, type Color, type DrawCommand } from "./AnsiParser";
export { TextRenderer } from "./TextRenderer";
export { InputBridge, type InkKeyEvent } from "./InputBridge";

// SDL bindings (for advanced use)
export {
  getSdl2,
  Sdl2,
  createSDLRect,
  type SDLPointer,
  type SdlKeyEvent,
} from "./Sdl2";
export { getSdlTtf, SdlTtf } from "./SdlTtf";

// Error handling and dependency installation
export {
  SdlDependencyError,
  isSdlDependencyError,
} from "./utils/SdlDependencyError";
export {
  installMissingDependencies,
  InstallError,
  isInstallError,
  type InstallErrorCode,
} from "./utils/installSdlDependency";
export { SdlError, isSdlError, type SdlErrorCode } from "./utils/SdlError";
export { FontError, isFontError, type FontErrorCode } from "./utils/FontError";
