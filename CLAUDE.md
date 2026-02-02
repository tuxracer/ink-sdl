# Ink SDL

A library for rendering [Ink](https://github.com/vadimdemedes/ink) TUI applications to an SDL window instead of the terminal. This enables building graphical applications using React/Ink's declarative paradigm with SDL's windowing and rendering capabilities.

See [README.md](README.md) for installation prerequisites, API documentation, and usage examples. See [docs/TRD.md](docs/TRD.md) for technical details including architecture, ANSI sequence support, and keyboard input mapping.

## Source Structure

Each module is a directory named after its primary export, containing `index.ts` and optionally `consts.ts` for module-specific constants:

- `src/SdlWindow/` - Main API (`createSdlStreams`, `SdlWindow`)
- `src/SdlInputStream/` - Readable stream for keyboard input
- `src/SdlOutputStream/` - Writable stream for ANSI output
- `src/SdlUiRenderer/` - SDL window and rendering management
- `src/AnsiParser/` - ANSI escape sequence parsing
- `src/TextRenderer/` - TTF font loading and glyph caching
- `src/InputBridge/` - SDL keycodes → terminal sequences
- `src/Sdl2/` - FFI bindings to SDL2 via koffi
- `src/SdlTtf/` - FFI bindings to SDL2_ttf via koffi
- `src/consts.ts` - Shared constants used across modules
- `fonts/` - Bundled Cozette font
- `examples/` - Example applications

## Commands

```bash
pnpm dev        # Run in development mode (tsx)
pnpm build      # Build for production (tsup → dist/)
pnpm start      # Run built version
pnpm test       # Run tests (vitest)
pnpm check      # Format, lint, and typecheck (run before commits)
```

**Important**: Always run `pnpm run check` before commits to ensure code is properly formatted, linted, and type-safe. Do not run formatting, linting, or typechecking separately.

**Documentation**: When making major changes (architecture, new modules, API changes, file structure), update [docs/TRD.md](docs/TRD.md) to keep the technical reference accurate.

## Tech Stack

- **Runtime**: Node.js 24+
- **Language**: TypeScript 5.9 (strict mode)
- **Build**: tsup (ESM output)
- **TUI Framework**: [Ink](https://github.com/vadimdemedes/ink) with [Ink UI](https://github.com/vadimdemedes/ink-ui) - React for the terminal. If you've worked with React, you'll feel right at home: components, hooks, JSX, and the familiar declarative paradigm all work here

## Coding Standards

- **Package manager**: Use `pnpm` for all package management (install, add, remove, etc.)
- **ESM imports only**: Always use `import` syntax, never `require()`. This is an ESM project and `require` will throw `ReferenceError: require is not defined`
- **Arrow functions**: Use `const foo = () => { ... }` (enforced by ESLint, auto-fixable)
- **Named imports**: Use `import { pipe, filter } from 'remeda'` not `import * as R` (tree-shaking)
- **Remeda utilities**: Prefer for array/object manipulation over manual loops
- **Named constants**: Use `const HEADER_SIZE = 16` not magic numbers
- **Numeric separators**: Use underscore separators for numbers 1000 and above for readability (`1_500`, `44_100`, `100_000`)
- **Module structure**: Always create modules as directories with `index.ts`, never as single `moduleName.ts` files. Name the directory after the primary export (class, function, or concept). This provides a consistent location for related files:

  ```
  # GOOD - directory structure allows for growth
  src/
    TitleScreen/
      index.ts       # exports showTitleScreen()
      index.test.ts  # tests for the module
      consts.ts      # LOGO, PROMPT_TEXT, etc.
    Game/
      index.ts       # exports Game class
      consts.ts      # TICK_RATE, MAX_SPEED, etc.
      types.ts       # GameState, GameConfig interfaces

  # BAD - single files have nowhere for related code to go
  src/
    TitleScreen.ts
    Game.ts
  ```

  Standard files within a module directory:
  - `index.ts` - Main module implementation and exports
  - `index.test.ts` - Tests for the module
  - `consts.ts` - Module-specific constants
  - `types.ts` - Module-specific type definitions (if needed)

- **Avoid re-exports**: Don't re-export from index.ts or create barrel files. Re-exports obscure where code actually lives, create unnecessary coupling between modules, and make it harder to trace imports. Import directly from the source file:

  ```typescript
  // GOOD - import directly from source
  import { TICK_RATE } from "../Game/consts";
  import { showTitleScreen } from "../TitleScreen";

  // BAD - re-exporting creates indirection and coupling
  // In Game/index.ts:
  export { TICK_RATE } from "./consts"; // Don't do this
  ```

- **JSDoc**: Skip `@param`/`@returns` tags (TypeScript provides types); use inline comments if needed
- **Loading indicators**: Delay by ~1 second to avoid flash for fast operations
- **Intl API**: Prefer `Intl.DateTimeFormat`, `Intl.NumberFormat`, etc. over manual formatting for dates, numbers, and currencies
- **Explicit conditionals for derived values**: When a value like `useTrueColor` is derived from another value like `limitColors`, use the source value in conditionals, not the derived value. This makes the logic clearer and avoids confusion:

  ```typescript
  // GOOD - explicit about what each branch handles
  if (this.limitColors === 16) {
    /* ANSI 16 */
  } else if (this.limitColors === 256) {
    /* ANSI 256 */
  } else {
    /* True color (limitColors === 0) */
  }

  // BAD - confusing because useTrueColor is derived from limitColors
  if (this.limitColors === 16) {
    /* ANSI 16 */
  } else if (this.useTrueColor) {
    /* True color */
  } else {
    /* ANSI 256 */
  }
  ```

- **Type guards over type assertions**: Never use `as` type assertions on values with unknown runtime types. Use type guards from Remeda (`isString`, `isNumber`, `isBoolean`, `isPlainObject`), existing custom guards from `src/utils/type-guards.ts`, or create a new custom type guard if none exist:

  ```typescript
  // GOOD - type guard validates at runtime
  import { isString } from "remeda";

  if (isString(value)) {
    config.name = value;
  }

  // BAD - blind cast assumes type without validation
  config.name = value as string;
  ```

  For union types (e.g., `"kitty" | "terminal" | "ascii"`), create a type guard that validates the actual values, not just the primitive type:

  ```typescript
  // GOOD - validates the value is one of the allowed options
  import { isPostProcessingMode } from "../../utils/type-guards";

  if (isPostProcessingMode(value)) {
    config.video_postprocessing_mode = value; // No cast needed
  }

  // BAD - isString only checks primitive type, not valid union values
  if (isString(value)) {
    config.video_postprocessing_mode = value as PostProcessingMode; // Still a blind cast!
  }
  ```

  When creating type guards for union types, use the named type in the return type annotation - don't hardcode the union:

  ```typescript
  // GOOD - uses the named type
  import type { VideoDriver } from "../frontend/config";

  const VIDEO_DRIVERS: readonly VideoDriver[] = [
    "kitty",
    "terminal",
    "ascii",
    "emoji",
  ];

  export const isVideoDriver = (value: unknown): value is VideoDriver => {
    return isString(value) && VIDEO_DRIVERS.includes(value as VideoDriver);
  };

  // BAD - hardcodes the union type (duplicates the type definition)
  export const isVideoDriver = (
    value: unknown
  ): value is "kitty" | "terminal" | "ascii" | "emoji" => {
    // ...
  };
  ```

- **Tests verify behavior, not implementation**: Tests should verify that code works correctly, not enshrine implementation details. Never write tests that just check constant values - if a constant matters, test the behavior it affects:

  ```typescript
  // BAD - tests implementation detail, provides no value
  it("should have expected default value", () => {
    expect(MAX_FRAMES_BEHIND).toBe(60);
  });

  // GOOD - tests actual behavior that depends on the constant
  it("should trigger catchup when too far behind", () => {
    // Simulate being far behind and verify the sync behavior
    for (let i = 0; i < 70; i++) {
      syncManager.advanceFrame();
    }
    expect(syncManager.needsCatchup).toBe(true);
  });
  ```
