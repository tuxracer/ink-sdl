#!/usr/bin/env node
/**
 * CLI entry point for ink-sdl
 *
 * Run with: pnpm dlx ink-sdl
 *
 * This demonstrates ink-sdl's capabilities. For library usage,
 * import { createSdlStreams } from "ink-sdl" in your own project.
 */

import { parseArgs } from "node:util";
import { createSdlStreams } from ".";
import { render } from "ink";
import { DemoApp } from "./Demo";

// ============================================================================
// Constants
// ============================================================================

/** Default window width in pixels */
const DEFAULT_WIDTH = 800;

/** Default window height in pixels */
const DEFAULT_HEIGHT = 600;

// ============================================================================
// CLI Setup
// ============================================================================

const { values: args } = parseArgs({
  options: {
    title: { type: "string" },
    width: { type: "string" },
    height: { type: "string" },
    font: { type: "string" },
    "font-name": { type: "string" },
    "font-size": { type: "string" },
    "scale-factor": { type: "string" },
    "system-font": { type: "boolean", default: false },
    background: { type: "string" },
    fullscreen: { type: "string" },
    borderless: { type: "boolean", default: false },
    "min-width": { type: "string" },
    "min-height": { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(`
ink-sdl - Render Ink apps in SDL windows

Usage: pnpm dlx ink-sdl [options]

Options:
  --title <string>        Window title
  --width <number>        Window width in pixels (default: 800)
  --height <number>       Window height in pixels (default: 600)
  --font <path>           Path to a custom TTF font file
  --font-name <name>      Font name to find in system directories
  --font-size <number>    Font size in points (default: 16)
  --scale-factor <number> Override scale factor (auto-detect if omitted)
  --system-font           Use system monospace font instead of Cozette
  --background <hex>      Background color (e.g., "#1a1a2e")
  --fullscreen <mode>     Fullscreen mode ("true" or "desktop")
  --borderless            Remove window decorations
  --min-width <number>    Minimum window width in pixels
  --min-height <number>   Minimum window height in pixels
  -h, --help              Show this help message

For library usage, see: https://github.com/anthropics/ink-sdl
`);
  process.exit(0);
}

// ============================================================================
// Setup
// ============================================================================

const parseFullscreen = (
  value: string | undefined
): boolean | "desktop" | undefined => {
  if (value === "true") {
    return true;
  }
  if (value === "desktop") {
    return "desktop";
  }
  return undefined;
};

const sdlOptions = {
  title: args.title ?? "ink-sdl Demo",
  width: args.width ? parseInt(args.width, 10) : DEFAULT_WIDTH,
  height: args.height ? parseInt(args.height, 10) : DEFAULT_HEIGHT,
  systemFont: args["system-font"],
  borderless: args.borderless,
  ...(args.font && { fontPath: args.font }),
  ...(args["font-name"] && { fontName: args["font-name"] }),
  ...(args["font-size"] && { fontSize: parseInt(args["font-size"], 10) }),
  ...(args["scale-factor"] && {
    scaleFactor: parseFloat(args["scale-factor"]),
  }),
  ...(args.background && { backgroundColor: args.background }),
  ...(args.fullscreen && { fullscreen: parseFullscreen(args.fullscreen) }),
  ...(args["min-width"] && { minWidth: parseInt(args["min-width"], 10) }),
  ...(args["min-height"] && { minHeight: parseInt(args["min-height"], 10) }),
};

const { stdin, stdout, window, renderer } = createSdlStreams(sdlOptions);

const scaleFactor = renderer.getScaleFactor();
const cacheStats = window.getCacheStats();

// Type assertions needed because ink's types expect tty.ReadStream/WriteStream
// but our SDL streams are compatible at runtime
render(<DemoApp scaleFactor={scaleFactor} cacheStats={cacheStats} />, {
  stdin: stdin as unknown as NodeJS.ReadStream,
  stdout: stdout as unknown as NodeJS.WriteStream,
});

window.on("close", () => process.exit(0));
process.on("SIGINT", () => {
  window.close();
  process.exit(0);
});
