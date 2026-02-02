# ink-sdl

Render [Ink](https://github.com/vadimdemedes/ink) TUI applications to an SDL window instead of the terminal.

## Features

- Full ANSI color support (16, 256, and 24-bit true color)
- Keyboard input with modifier keys (Ctrl, Shift, Alt)
- Window resizing with automatic terminal dimension updates
- HiDPI/Retina display support
- Glyph caching for efficient text rendering
- Bundled monospace font (Cozette)

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

To run the included example:

```bash
git clone https://github.com/anthropics/ink-sdl.git
cd ink-sdl
pnpm install
pnpm exec tsx examples/hello.tsx
```

The example supports CLI flags for testing different display settings:

```bash
# Custom font size
pnpm exec tsx examples/hello.tsx --font-size 20

# Override scale factor (useful for HiDPI testing)
pnpm exec tsx examples/hello.tsx --scale-factor 2.0

# All options
pnpm exec tsx examples/hello.tsx --title "Test" --width 800 --height 600 --font-size 18 --scale-factor 1.5
```

| Flag             | Description                         |
| ---------------- | ----------------------------------- |
| `--title`        | Window title                        |
| `--width`        | Window width in pixels              |
| `--height`       | Window height in pixels             |
| `--font-size`    | Font size in points                 |
| `--scale-factor` | Scale factor (omit for auto-detect) |

> **Note:** This project uses [pnpm](https://pnpm.io/) for development. You can install and use ink-sdl in your own project with npm or pnpm, but if you're contributing to the library itself, use pnpm.

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

| Option        | Type             | Default     | Description                                |
| ------------- | ---------------- | ----------- | ------------------------------------------ |
| `title`       | `string`         | `"ink-sdl"` | Window title                               |
| `width`       | `number`         | `800`       | Window width in pixels                     |
| `height`      | `number`         | `600`       | Window height in pixels                    |
| `vsync`       | `boolean`        | `true`      | Enable vertical sync                       |
| `fontSize`    | `number`         | `16`        | Font size in points                        |
| `scaleFactor` | `number \| null` | `null`      | Override scale factor (null = auto-detect) |

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
  getSDL2,
  getSDL_ttf,
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
