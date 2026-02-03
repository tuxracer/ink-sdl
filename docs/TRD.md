# Technical Requirements Document: ink-sdl

## Overview

**ink-sdl** is a standalone npm package that enables developers using [Ink](https://github.com/vadimdemedes/ink) (the React-based TUI framework) to optionally render their terminal UI to an SDL window instead of the terminal.

### Problem Statement

Ink applications are limited to terminal rendering, which presents challenges for certain use cases:

- **Graphics protocol overhead**: Terminal image protocols (Kitty, iTerm2) require base64 encoding, escape sequence wrapping, and PTY transit—making 60fps graphics impractical even with GPU-accelerated terminals
- **Mixed rendering**: Applications needing both high-framerate graphics (emulators, games, video) and Ink UI cannot efficiently share a terminal window
- **Inconsistent rendering**: Different terminal emulators vary in ANSI support, color accuracy, and font rendering
- **Limited control**: Applications cannot directly control HiDPI scaling, window decorations, or minimum window size

### Solution

ink-sdl provides a drop-in replacement for Ink's stdout/stdin streams that redirect rendering to an SDL2 window while maintaining full compatibility with existing Ink applications.

### Goals

1. **Zero application changes**: Existing Ink apps work by swapping stream configuration
2. **Full ANSI support**: Parse and render all ANSI sequences Ink produces
3. **Cross-platform**: macOS, Linux, and Windows support
4. **No native compilation**: Use FFI bindings to avoid build complexity
5. **HiDPI support**: Crisp text rendering on Retina/HiDPI displays
6. **Performance**: Glyph caching and efficient rendering pipeline

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                    Ink Application                       │
│                   (React Components)                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Ink Runtime                         │
│              (Renders to ANSI sequences)                 │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│   process.stdout    │    │      ink-sdl streams        │
│   (Terminal)        │    │                             │
└─────────────────────┘    │  ┌─────────────────────┐    │
                           │  │  SdlOutputStream    │    │
                           │  │  (Writable stream)  │    │
                           │  └─────────────────────┘    │
                           │            │                 │
                           │            ▼                 │
                           │  ┌─────────────────────┐    │
                           │  │    AnsiParser       │    │
                           │  │  (ANSI → Commands)  │    │
                           │  └─────────────────────┘    │
                           │            │                 │
                           │            ▼                 │
                           │  ┌─────────────────────┐    │
                           │  │   SdlUiRenderer     │    │
                           │  │  (Commands → SDL)   │    │
                           │  └─────────────────────┘    │
                           │            │                 │
                           │            ▼                 │
                           │  ┌─────────────────────┐    │
                           │  │   TextRenderer      │    │
                           │  │  (TTF rendering)    │    │
                           │  └─────────────────────┘    │
                           │            │                 │
                           │            ▼                 │
                           │  ┌─────────────────────┐    │
                           │  │   SDL2 Window       │    │
                           │  └─────────────────────┘    │
                           │                             │
                           │  ┌─────────────────────┐    │
                           │  │  SdlInputStream     │    │
                           │  │  (Readable stream)  │    │
                           │  └─────────────────────┘    │
                           │            ▲                 │
                           │            │                 │
                           │  ┌─────────────────────┐    │
                           │  │   InputBridge       │    │
                           │  │  (SDL → Terminal)   │    │
                           │  └─────────────────────┘    │
                           └─────────────────────────────┘
```

### Core Components

#### 1. SdlOutputStream

A Node.js Writable stream that:

- Implements the TTY interface Ink expects (`isTTY`, `columns`, `rows`)
- Receives ANSI escape sequence output from Ink
- Passes data to the ANSI parser
- Triggers SDL frame presentation after each write

#### 2. SdlInputStream

A Node.js Readable stream that:

- Implements TTY interface (`setRawMode()`, `isTTY`)
- Buffers keyboard input from SDL events
- Converts SDL keycodes to terminal escape sequences
- Provides input to Ink's key handling system

#### 3. AnsiParser

Parses ANSI escape sequences and produces draw commands:

- Cursor positioning (absolute and relative)
- Colors: 16-color, 256-color, and 24-bit RGB
- Styles: bold, dim, reverse video
- Screen/line clearing
- Special characters (newline, tab, carriage return)

#### 4. SdlUiRenderer

The main rendering coordinator:

- Manages SDL window and renderer lifecycle
- Maintains cursor position and style state
- Processes draw commands from the parser
- Handles window resize and HiDPI scaling
- Coordinates with TextRenderer for glyph output

#### 5. TextRenderer

TrueType font rendering with caching:

- Loads and manages TTF fonts via SDL2_ttf
- Maintains LRU glyph cache (character + color → texture)
- Handles HiDPI scaling (font size × scale factor)
- Provides character metrics for grid calculations

#### 6. InputBridge

Converts SDL keyboard events to terminal sequences:

- Arrow keys → ANSI cursor sequences
- Special keys → terminal control codes
- Printable characters → direct pass-through
- Modifier key handling (Ctrl, Alt, Shift)

#### 7. SDL Bindings

FFI bindings to SDL2 and SDL2_ttf:

- Uses koffi for dynamic library loading
- Cross-platform library path resolution
- No native compilation required
- Exposes minimal required SDL2 API surface

## API Design

### Primary API

```typescript
import { createSdlStreams, SdlWindow } from "ink-sdl";

// Create SDL streams for Ink
const { stdin, stdout, window } = createSdlStreams({
  // Window configuration
  width: 800,           // Logical width in pixels
  height: 600,          // Logical height in pixels
  title: "My App",      // Window title
  fullscreen: false,    // "desktop" for borderless fullscreen
  borderless: false,    // Remove window decorations
  minWidth: 400,        // Minimum window width
  minHeight: 300,       // Minimum window height

  // Rendering configuration
  fontSize: 16,         // Font size in points
  fontPath: undefined,  // Custom TTF font path
  fontName: undefined,  // Font name to find in system dirs
  systemFont: false,    // Use system monospace font
  scaleFactor: null,    // null = auto-detect HiDPI
  backgroundColor: [0, 0, 0], // RGB tuple or "#RRGGBB" hex

  // SDL options
  vsync: true,          // Enable VSync
});

// Use with Ink's render function
import { render } from "ink";
import App from "./App.js";

render(<App />, { stdin, stdout });

// Clean up when done
window.destroy();
```

### Window Management API

```typescript
interface SdlWindow {
  // Dimensions
  readonly width: number;
  readonly height: number;
  readonly columns: number; // Character columns
  readonly rows: number; // Character rows

  // Lifecycle
  destroy(): void;

  // Events
  on(event: "resize", handler: (cols: number, rows: number) => void): void;
  on(event: "close", handler: () => void): void;
}
```

### Stream Interfaces

```typescript
interface SdlOutputStream extends Writable {
  readonly isTTY: true;
  readonly columns: number;
  readonly rows: number;

  // Resize event for Ink
  on(event: "resize", handler: () => void): this;
}

interface SdlInputStream extends Readable {
  readonly isTTY: true;
  isRaw: boolean;

  setRawMode(mode: boolean): this;
  ref(): this;
  unref(): this;
}
```

### Configuration Options

```typescript
interface SdlStreamsOptions {
  // Window
  width?: number; // Default: 800
  height?: number; // Default: 600
  title?: string; // Default: "ink-sdl"
  fullscreen?: boolean | "desktop"; // Fullscreen mode (true = exclusive, "desktop" = borderless)
  borderless?: boolean; // Remove window decorations
  minWidth?: number; // Minimum window width in pixels
  minHeight?: number; // Minimum window height in pixels

  // Rendering
  fontSize?: number; // Default: 16
  fontPath?: string; // Path to custom TTF font file
  fontName?: string; // Font name to find in system directories
  systemFont?: boolean; // Use system monospace font instead of Cozette
  scaleFactor?: number | null; // null = auto-detect HiDPI
  backgroundColor?: [number, number, number] | string; // RGB tuple or hex "#RRGGBB"

  // Behavior
  vsync?: boolean; // Default: true

  // Advanced: Use existing SDL window/renderer
  existing?: {
    window: SDLPointer; // Existing SDL window
    renderer: SDLPointer; // Existing SDL renderer
  };
}
```

### Using Existing SDL Window/Renderer

For applications that need to share a single SDL window between ink-sdl and custom rendering (e.g., an emulator with a menu UI), you can pass existing SDL resources:

```typescript
import { createSdlStreams, getSdl2, type SDLPointer } from "ink-sdl";

// Create your own SDL window and renderer
const sdl = getSdl2();
sdl.init(SDL_INIT_VIDEO | SDL_INIT_EVENTS);

const myWindow = sdl.createWindow("My App", x, y, width, height, flags);
const myRenderer = sdl.createRenderer(myWindow, -1, rendererFlags);

// Use them with ink-sdl for the UI
const streams = createSdlStreams({
  existing: { window: myWindow, renderer: myRenderer },
  fontSize: 16,
});

render(<MenuApp />, { stdin: streams.stdin, stdout: streams.stdout });

// When switching to custom rendering (e.g., game mode):
streams.window.close(); // Cleans up ink-sdl resources, but NOT the window/renderer

// Now you can render directly to the same window
SDL_RenderClear(myRenderer);
// ... your custom rendering ...
SDL_RenderPresent(myRenderer);

// When switching back to UI mode, create new streams with the same window
const newStreams = createSdlStreams({
  existing: { window: myWindow, renderer: myRenderer },
});

// When completely done, destroy the window/renderer yourself
sdl.destroyRenderer(myRenderer);
sdl.destroyWindow(myWindow);
```

**Ownership rules:**

- When `existing` is provided, ink-sdl does NOT own the window/renderer
- `destroy()` / `close()` will NOT destroy the provided window/renderer
- The caller retains ownership and must destroy them when done
- Window options (width, height, title, fullscreen, borderless) are ignored when using existing resources
- Rendering options (fontSize, scaleFactor, etc.) still apply

## ANSI Sequence Support

### Required Sequences

| Category | Sequences                          | Description                            |
| -------- | ---------------------------------- | -------------------------------------- |
| Cursor   | `CSI H`, `CSI ;H`, `CSI row;colH`  | Absolute positioning                   |
| Cursor   | `CSI A/B/C/D`                      | Relative movement (up/down/left/right) |
| Colors   | `SGR 30-37`, `SGR 90-97`           | Foreground colors (normal/bright)      |
| Colors   | `SGR 40-47`, `SGR 100-107`         | Background colors (normal/bright)      |
| Colors   | `SGR 38;5;N`, `SGR 48;5;N`         | 256-color mode                         |
| Colors   | `SGR 38;2;R;G;B`, `SGR 48;2;R;G;B` | 24-bit RGB                             |
| Styles   | `SGR 0`                            | Reset all attributes                   |
| Styles   | `SGR 1`                            | Bold                                   |
| Styles   | `SGR 2`                            | Dim                                    |
| Styles   | `SGR 7`                            | Reverse video                          |
| Styles   | `SGR 22`                           | Normal intensity                       |
| Styles   | `SGR 27`                           | Reverse off                            |
| Styles   | `SGR 39`, `SGR 49`                 | Default fg/bg color                    |
| Erase    | `CSI 2J`                           | Clear entire screen                    |
| Erase    | `CSI K`, `CSI 0K`                  | Clear to end of line                   |
| Erase    | `CSI 1K`                           | Clear to beginning of line             |
| Erase    | `CSI 2K`                           | Clear entire line                      |
| Screen   | `CSI ?1049h`                       | Switch to alt screen buffer            |
| Screen   | `CSI ?1049l`                       | Switch to main screen buffer           |
| Screen   | `CSI ?1047h/l`, `CSI ?47h/l`       | Alt screen buffer variants             |

### Control Characters

| Character       | Code        | Behavior                      |
| --------------- | ----------- | ----------------------------- |
| Newline         | `\n` (0x0A) | Move to next line, column 1   |
| Carriage Return | `\r` (0x0D) | Move to column 1              |
| Tab             | `\t` (0x09) | Move to next 8-space tab stop |
| Backspace       | `\b` (0x08) | Move cursor left one column   |

### Alt Screen Buffer

The alt screen buffer allows applications to switch to a separate screen buffer, preserving the main buffer's contents. This is commonly used by full-screen applications like vim, less, and htop.

**Supported sequences:**

- `\x1b[?1049h` - Enter alt screen (saves cursor, switches buffer, clears screen)
- `\x1b[?1049l` - Leave alt screen (restores buffer and cursor)
- `\x1b[?1047h/l` and `\x1b[?47h/l` - Alt screen variants (also supported)

**Behavior:**

1. When entering alt screen: cursor position is saved, alt buffer is activated and cleared
2. When leaving alt screen: main buffer is restored, cursor position is restored
3. Each buffer maintains its own render target texture
4. Window resize recreates both buffer textures

## Keyboard Input Mapping

### Special Keys

| SDL Key     | Terminal Sequence     |
| ----------- | --------------------- |
| Arrow Up    | `\x1b[A`              |
| Arrow Down  | `\x1b[B`              |
| Arrow Right | `\x1b[C`              |
| Arrow Left  | `\x1b[D`              |
| Home        | `\x1b[H`              |
| End         | `\x1b[F`              |
| Page Up     | `\x1b[5~`             |
| Page Down   | `\x1b[6~`             |
| Insert      | `\x1b[2~`             |
| Delete      | `\x1b[3~`             |
| F1-F12      | `\x1bOP` - `\x1b[24~` |
| Enter       | `\r`                  |
| Tab         | `\t`                  |
| Escape      | `\x1b`                |
| Backspace   | `\x7f`                |

### Modifier Combinations

| Modifier       | Behavior                                      |
| -------------- | --------------------------------------------- |
| Ctrl + Letter  | Sends control character (e.g., Ctrl+C → 0x03) |
| Alt + Letter   | Sends `\x1b` + letter                         |
| Shift + Letter | Sends uppercase letter                        |

## Dependencies

### Runtime Dependencies

| Package | Purpose                                      |
| ------- | -------------------------------------------- |
| koffi   | FFI bindings to SDL2 (no native compilation) |

### System Dependencies

Users must have SDL2 and SDL2_ttf installed:

**macOS (Homebrew)**:

```bash
brew install sdl2 sdl2_ttf
```

**Ubuntu/Debian**:

```bash
sudo apt install libsdl2-2.0-0 libsdl2-ttf-2.0-0
```

**Fedora/RHEL**:

```bash
sudo dnf install SDL2 SDL2_ttf
```

**Windows**:
SDL2.dll and SDL2_ttf.dll must be in PATH or application directory.

### Bundled Assets

- **Cozette font** (CozetteVector.ttf): Default monospace pixel font with excellent Unicode coverage

## Cross-Platform Considerations

### Library Resolution

The package automatically searches for SDL2 libraries in standard locations:

**macOS**:

- `/opt/homebrew/lib/` (Apple Silicon Homebrew)
- `/usr/local/lib/` (Intel Homebrew)
- `/opt/local/lib/` (MacPorts)
- System frameworks

**Linux**:

- `/usr/lib/x86_64-linux-gnu/` (Debian/Ubuntu)
- `/usr/lib64/` (Fedora/RHEL)
- `/usr/lib/` (Arch)
- Standard library paths

**Windows**:

- Application directory
- System PATH

### HiDPI Handling

1. Window created with `SDL_WINDOW_ALLOW_HIGHDPI` flag
2. Scale factor detected by comparing renderer output size to window size
3. Font size multiplied by scale factor for crisp rendering
4. All coordinates scaled appropriately for physical pixels
5. Display change events trigger scale factor recalculation

## Performance Considerations

### Glyph Caching

- LRU cache stores rendered glyph textures
- Cache key: character + foreground color
- Default capacity: 1,024 glyphs
- Eviction: removes oldest 25% when full
- Significantly reduces SDL2_ttf rendering calls

### Rendering Pipeline

1. Ink writes ANSI output to SdlOutputStream
2. AnsiParser converts to draw commands (minimal allocations)
3. SdlUiRenderer applies commands to character grid
4. Only changed cells are re-rendered
5. Single `SDL_RenderPresent()` call per frame

### Frame Rate

- VSync enabled by default (matches display refresh rate)
- No artificial frame limiting needed
- Ink's own debouncing applies to updates

## Error Handling

### SDL Initialization Failures

```typescript
try {
  const { stdin, stdout, window } = createSdlStreams();
} catch (error) {
  if (error.code === "SDL_NOT_FOUND") {
    console.error("SDL2 not installed. Please install SDL2 and SDL2_ttf.");
    process.exit(1);
  }
  throw error;
}
```

### Graceful Degradation

If SDL is unavailable, the package should provide clear error messages with installation instructions for each platform.

## Testing Strategy

### Unit Tests

- AnsiParser: Comprehensive sequence parsing tests
- InputBridge: Key mapping verification
- TextRenderer: Glyph metrics and caching behavior
- Color conversion: 256-color and RGB accuracy

### Integration Tests

- Stream interface compatibility with Ink
- Window lifecycle (create, resize, destroy)
- Full render pipeline with sample Ink components

### Visual Tests

- Reference screenshots for regression testing
- HiDPI rendering verification
- Unicode character rendering

## Package Structure

Each module is a directory named after its primary export, containing `index.ts` and optionally `consts.ts` for module-specific constants:

```
ink-sdl/
├── src/
│   ├── index.ts                # Public API exports
│   ├── cli.tsx                 # CLI entry point (npx ink-sdl)
│   ├── consts.ts               # Shared constants
│   ├── Demo/
│   │   └── index.tsx           # Shared demo components (DemoApp)
│   ├── SdlWindow/
│   │   ├── index.ts            # createSdlStreams(), SdlWindow
│   │   └── consts.ts
│   ├── SdlOutputStream/
│   │   └── index.ts            # Writable stream for ANSI output
│   ├── SdlInputStream/
│   │   └── index.ts            # Readable stream for keyboard input
│   ├── SdlUiRenderer/
│   │   ├── index.ts            # SDL window and rendering management
│   │   └── consts.ts
│   ├── AnsiParser/
│   │   ├── index.ts            # ANSI escape sequence parsing
│   │   ├── index.test.ts
│   │   └── consts.ts
│   ├── TextRenderer/
│   │   ├── index.ts            # TTF font loading and glyph caching
│   │   └── consts.ts
│   ├── InputBridge/
│   │   ├── index.ts            # SDL keycodes → terminal sequences
│   │   ├── index.test.ts
│   │   └── consts.ts
│   ├── Sdl2/
│   │   ├── index.ts            # FFI bindings to SDL2 via koffi
│   │   ├── consts.ts
│   │   └── types.ts
│   └── SdlTtf/
│       └── index.ts            # FFI bindings to SDL2_ttf via koffi
├── fonts/
│   └── CozetteVector.ttf       # Bundled font
├── docs/
│   └── TRD.md
├── package.json
├── tsconfig.json
└── README.md
```

## CLI Demo

The package includes a built-in demo that can be run directly:

```bash
# Run the demo (installs and executes)
npx ink-sdl
# or
pnpm dlx ink-sdl

# With options
npx ink-sdl --font-size 20 --background "#1a1a2e"
npx ink-sdl --fullscreen desktop
npx ink-sdl --font-name Menlo
```

For local development:

```bash
pnpm demo
```

The demo showcases text styles, colors (16, 256, and RGB), box layouts, and dynamic updates.

## Usage Examples

### Basic Usage

```typescript
import React from "react";
import { render, Text, Box } from "ink";
import { createSdlStreams } from "ink-sdl";

const App = () => (
  <Box flexDirection="column">
    <Text color="green">Hello from SDL!</Text>
    <Text>Press 'q' to quit</Text>
  </Box>
);

const { stdin, stdout, window } = createSdlStreams({
  title: "My Ink App",
  width: 640,
  height: 480,
});

const { unmount } = render(<App />, { stdin, stdout });

// Handle window close
window.on("close", () => {
  unmount();
  window.destroy();
  process.exit(0);
});
```

### Conditional SDL/Terminal

```typescript
import { render } from "ink";
import { createSdlStreams, isSdlAvailable } from "ink-sdl";

const useSDL = process.argv.includes("--sdl") && isSdlAvailable();

const streams = useSDL
  ? createSdlStreams({ title: "My App" })
  : { stdin: process.stdin, stdout: process.stdout };

render(<App />, streams);
```

### Custom Font

```typescript
const { stdin, stdout } = createSdlStreams({
  fontPath: "/path/to/my/font.ttf",
  fontSize: 18,
});
```

### Shared Window (Emulator Pattern)

For applications like emulators that switch between ink-sdl UI and custom rendering:

```typescript
import { render, Text, Box } from "ink";
import { createSdlStreams, getSdl2 } from "ink-sdl";

// Create a single window for the entire application
const sdl = getSdl2();
sdl.init(0x20 | 0x4000); // SDL_INIT_VIDEO | SDL_INIT_EVENTS

const window = sdl.createWindow("Emulator", 100, 100, 800, 600, 0x4);
const renderer = sdl.createRenderer(window, -1, 0x2);

let uiStreams: ReturnType<typeof createSdlStreams> | null = null;

// Enter UI mode
const enterUIMode = () => {
  uiStreams = createSdlStreams({
    existing: { window, renderer },
    fontSize: 16,
  });

  render(<MenuApp onSelectGame={enterGameMode} />, {
    stdin: uiStreams.stdin,
    stdout: uiStreams.stdout,
  });
};

// Enter game mode
const enterGameMode = (rom: string) => {
  // Clean up ink-sdl (doesn't destroy our window)
  uiStreams?.window.close();
  uiStreams = null;

  // Now render the game directly to the same window
  runEmulator(renderer, rom, {
    onExit: enterUIMode, // Return to menu when game exits
  });
};

// Start in UI mode
enterUIMode();
```

## Future Considerations

### Potential Enhancements

1. **Mouse support**: Map SDL mouse events to terminal mouse sequences
2. **Clipboard integration**: SDL clipboard ↔ terminal paste
3. **Multiple windows**: Support for multi-window Ink applications
4. **Custom cursor styles**: Block, underline, bar cursor options
5. **Screen recording**: Built-in GIF/video capture
6. **Accessibility**: Screen reader integration

### Out of Scope (v1)

- Image rendering (Kitty/iTerm2 graphics protocols)
- GPU-accelerated effects/shaders
- Custom widget rendering (non-Ink components)
- Sound/audio integration

## Success Criteria

1. **Compatibility**: Works with any Ink application without code changes
2. **Performance**: 60fps rendering with complex UIs
3. **Cross-platform**: Verified on macOS, Ubuntu, and Windows
4. **Documentation**: Clear setup instructions and API reference
5. **Reliability**: Proper cleanup on exit, no resource leaks
