# ink-sdl

Render [Ink](https://github.com/vadimdemedes/ink) TUI applications to an SDL window instead of the terminal.

## Features

- Full ANSI color support (16, 256, and 24-bit true color)
- Keyboard input with modifier keys (Ctrl, Shift, Alt)
- Window resizing with automatic terminal dimension updates
- HiDPI/Retina display support
- Glyph caching for efficient text rendering
- Bundled monospace font (Cozette) with system font option
- Emoji support via platform font fallback

## Prerequisites

You need SDL2 and SDL2_ttf installed on your system:

**macOS:**

```bash
brew install sdl2 sdl2_ttf
```

**Ubuntu/Debian:**

```bash
apt install libsdl2-2.0-0 libsdl2-ttf-2.0-0
```

**Fedora:**

```bash
dnf install SDL2 SDL2_ttf
```

**Windows:**
Download SDL2.dll and SDL2_ttf.dll from [libsdl.org](https://libsdl.org) and place them in your system path.

## Installation

```bash
npm install ink-sdl
# or
pnpm add ink-sdl
```

## Demo

Run the built-in demo to see ink-sdl in action:

```bash
npx ink-sdl
# or
pnpm dlx ink-sdl
```

The demo showcases text styles, colors, box layouts, and dynamic updates. Use `--help` to see all available options:

```bash
npx ink-sdl --help
```

**Example commands:**

```bash
# Custom font size
npx ink-sdl --font-size 20

# Dark background with system font
npx ink-sdl --background "#1a1a2e" --system-font

# Borderless fullscreen mode
npx ink-sdl --fullscreen desktop

# Use a specific font
npx ink-sdl --font-name Menlo
```

| Flag             | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `--title`        | Window title                                                |
| `--width`        | Window width in pixels                                      |
| `--height`       | Window height in pixels                                     |
| `--font`         | Path to a custom TTF font file                              |
| `--font-name`    | Font name to find in system directories                     |
| `--font-size`    | Font size in points                                         |
| `--scale-factor` | Scale factor (omit for auto-detect)                         |
| `--system-font`  | Use system monospace font instead of Cozette                |
| `--background`   | Background color as hex (e.g., "#1a1a2e")                   |
| `--fullscreen`   | Enable fullscreen mode ("true" or "desktop" for borderless) |
| `--borderless`   | Remove window decorations                                   |
| `--min-width`    | Minimum window width in pixels                              |
| `--min-height`   | Minimum window height in pixels                             |

> **Note:** This project uses [pnpm](https://pnpm.io/) for development. You can install and use ink-sdl in your own project with npm or pnpm, but if you're contributing to the library itself, use pnpm.

**For local development**, run the demo directly from source:

```bash
pnpm demo
```

## Usage

```tsx
import React, { useState, useEffect } from "react";
import { render, Text, Box } from "ink";
import { createSdlStreams } from "ink-sdl";

const App = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green" bold>
        Hello from SDL!
      </Text>
      <Text>
        Counter: <Text color="cyan">{count}</Text>
      </Text>
    </Box>
  );
};

// Create SDL streams
const { stdin, stdout, window } = createSdlStreams({
  title: "My App",
  width: 800,
  height: 600,
});

// Render the Ink app
render(<App />, { stdin, stdout });

// Handle window close
window.on("close", () => process.exit(0));
```

## API

### `createSdlStreams(options?)`

Creates stdin/stdout streams and a window for use with Ink.

#### Options

| Option            | Type                                 | Default     | Description                                                |
| ----------------- | ------------------------------------ | ----------- | ---------------------------------------------------------- |
| `title`           | `string`                             | `"ink-sdl"` | Window title                                               |
| `width`           | `number`                             | `800`       | Window width in pixels                                     |
| `height`          | `number`                             | `600`       | Window height in pixels                                    |
| `vsync`           | `boolean`                            | `true`      | Enable vertical sync                                       |
| `fontSize`        | `number`                             | `16`        | Font size in points                                        |
| `scaleFactor`     | `number \| null`                     | `null`      | Override scale factor (null = auto-detect)                 |
| `systemFont`      | `boolean`                            | `false`     | Use system monospace font instead of Cozette               |
| `fontPath`        | `string`                             | `undefined` | Path to a custom TTF font file                             |
| `fontName`        | `string`                             | `undefined` | Font name to find in system directories                    |
| `backgroundColor` | `[number, number, number] \| string` | `[0, 0, 0]` | Background color as RGB tuple or hex string "#RRGGBB"      |
| `fullscreen`      | `boolean \| "desktop"`               | `undefined` | Fullscreen mode (true = exclusive, "desktop" = borderless) |
| `borderless`      | `boolean`                            | `false`     | Remove window decorations (title bar, borders)             |
| `minWidth`        | `number`                             | `undefined` | Minimum window width in pixels                             |
| `minHeight`       | `number`                             | `undefined` | Minimum window height in pixels                            |

#### Returns

```typescript
{
  stdin: SdlInputStream; // Readable stream for keyboard input
  stdout: SdlOutputStream; // Writable stream for ANSI output
  window: SdlWindow; // Window wrapper with events
  renderer: SdlUiRenderer; // UI renderer (for advanced use)
}
```

### `SdlWindow`

Event emitter for window events.

#### Events

- `close` - Emitted when the window is closed
- `key` - Emitted on keyboard events

#### Methods

- `getDimensions()` - Returns `{ columns, rows }` for terminal size
- `setTitle(title)` - Set the window title
- `clear()` - Clear the screen
- `close()` - Close the window
- `isClosed()` - Check if window is closed

### `isSdlAvailable()`

Check if SDL is available on the system.

```typescript
import { isSdlAvailable } from "ink-sdl";

if (isSdlAvailable()) {
  // Use SDL rendering
} else {
  // Fall back to terminal rendering
}
```

## Advanced Usage

For more control, you can use the lower-level components directly:

```typescript
import {
  SdlUiRenderer,
  AnsiParser,
  TextRenderer,
  InputBridge,
  getSdl2,
  getSdlTtf,
} from "ink-sdl";
```

## Keyboard Support

The following keys are mapped to terminal sequences:

- Arrow keys (Up, Down, Left, Right)
- Enter, Escape, Backspace, Tab, Delete
- Home, End, Page Up, Page Down
- Function keys (F1-F12)
- Ctrl+A through Ctrl+Z
- Shift for uppercase letters

## License

MIT
