/**
 * Demo App for ink-sdl
 *
 * Showcases ink-sdl capabilities including text styles, colors,
 * layouts, and dynamic updates. Run with `pnpm demo`.
 */

import { useState, useEffect } from "react";
import { Text, Box, useInput, Spacer, Newline } from "ink";

// ============================================================================
// Constants
// ============================================================================

/** Timer interval for dynamic updates (1 second) */
const TIMER_INTERVAL_MS = 1_000;

/** Maximum percentage value */
const PERCENT_MAX = 100;

/** Default progress bar width */
const DEFAULT_PROGRESS_WIDTH = 20;

/** Decimal places for scale factor display */
const SCALE_DECIMAL_PLACES = 2;

/** Progress bar multipliers for variety */
const PROGRESS_MEM_MULTIPLIER = 0.7;
const PROGRESS_MEM_OFFSET = 30;
const PROGRESS_DSK_MULTIPLIER = 0.4;
const PROGRESS_DSK_OFFSET = 60;

/** Animation width for bouncing dot */
const ANIMATION_WIDTH = 10;

/** Sample ANSI 256 color codes for demo (rainbow spectrum) */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const ANSI_256_SAMPLE_COLORS = [196, 208, 226, 46, 51, 21, 129, 201];

// ============================================================================
// Tab Components
// ============================================================================

/** Demonstrates text styling options */
const TextStylesTab = () => (
  <Box flexDirection="column" gap={1}>
    <Text bold>Text Styles</Text>
    <Box flexDirection="column" paddingLeft={1}>
      <Text>Normal text</Text>
      <Text bold>Bold text</Text>
      <Text dimColor>Dim text</Text>
      <Text italic>Italic text</Text>
      <Text underline>Underlined text</Text>
      <Text strikethrough>Strikethrough text</Text>
      <Text inverse>Inverse text</Text>
      <Text bold italic underline>
        Combined: bold + italic + underline
      </Text>
    </Box>

    <Text bold>Emoji</Text>
    <Box flexDirection="column" paddingLeft={1}>
      <Text>Smileys: 😀 😎 🥳 😍 🤔 😴</Text>
      <Text>Hands: 👋 👍 👎 👏 🙌 ✌️</Text>
      <Text>Animals: 🐱 🐶 🦊 🐻 🐼 🦁</Text>
      <Text>Food: 🍎 🍕 🍔 🌮 🍣 🍩</Text>
      <Text>Objects: ⭐ 🔥 💡 🎉 🚀 💻</Text>
    </Box>
  </Box>
);

/** Demonstrates ANSI 16 basic colors */
const BasicColorsTab = () => (
  <Box flexDirection="column" gap={1}>
    <Text bold>ANSI 16 Colors</Text>
    <Box flexDirection="column" paddingLeft={1}>
      <Text>Foreground:</Text>
      <Box gap={1} flexWrap="wrap">
        <Text color="black" backgroundColor="white">
          black
        </Text>
        <Text color="red">red</Text>
        <Text color="green">green</Text>
        <Text color="yellow">yellow</Text>
        <Text color="blue">blue</Text>
        <Text color="magenta">magenta</Text>
        <Text color="cyan">cyan</Text>
        <Text color="white">white</Text>
      </Box>
      <Box gap={1} flexWrap="wrap" marginTop={1}>
        <Text color="blackBright">gray</Text>
        <Text color="redBright">redBright</Text>
        <Text color="greenBright">greenBright</Text>
        <Text color="yellowBright">yellowBright</Text>
        <Text color="blueBright">blueBright</Text>
        <Text color="magentaBright">magentaBright</Text>
        <Text color="cyanBright">cyanBright</Text>
        <Text color="whiteBright">whiteBright</Text>
      </Box>
      <Newline />
      <Text>Background:</Text>
      <Box gap={1} flexWrap="wrap">
        <Text backgroundColor="red"> red </Text>
        <Text backgroundColor="green"> green </Text>
        <Text backgroundColor="yellow" color="black">
          {" "}
          yellow{" "}
        </Text>
        <Text backgroundColor="blue"> blue </Text>
        <Text backgroundColor="magenta"> magenta </Text>
        <Text backgroundColor="cyan" color="black">
          {" "}
          cyan{" "}
        </Text>
      </Box>
    </Box>
  </Box>
);

/** Demonstrates ANSI 256 and RGB colors */
const ExtendedColorsTab = () => (
  <Box flexDirection="column" gap={1}>
    <Text bold>Extended Colors</Text>
    <Box flexDirection="column" paddingLeft={1}>
      <Text>ANSI 256 (color codes):</Text>
      <Box gap={1}>
        {ANSI_256_SAMPLE_COLORS.map((code) => (
          <Text key={code} color={`ansi256-${code}` as never}>
            #{code}
          </Text>
        ))}
      </Box>

      <Newline />
      <Text>RGB True Color (hex):</Text>
      <Box gap={1}>
        <Text color="#ff6b6b">#ff6b6b</Text>
        <Text color="#ffd93d">#ffd93d</Text>
        <Text color="#6bcb77">#6bcb77</Text>
        <Text color="#4d96ff">#4d96ff</Text>
        <Text color="#9b5de5">#9b5de5</Text>
        <Text color="#f15bb5">#f15bb5</Text>
      </Box>

      <Newline />
      <Text>Gradient effect:</Text>
      <Box>
        {(
          [
            { char: "R", color: "#ff0000" },
            { char: "A", color: "#ff7f00" },
            { char: "I", color: "#ffff00" },
            { char: "N", color: "#00ff00" },
            { char: "B", color: "#0000ff" },
            { char: "O", color: "#4b0082" },
            { char: "W", color: "#9400d3" },
          ] as const
        ).map(({ char, color }) => (
          <Text key={char} color={color}>
            {char}
          </Text>
        ))}
      </Box>
    </Box>
  </Box>
);

/** Demonstrates box layouts and borders */
const LayoutTab = () => (
  <Box flexDirection="column" gap={1}>
    <Text bold>Box Layouts & Borders</Text>
    <Box gap={2} paddingLeft={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
      >
        <Text>Single</Text>
        <Text>Border</Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="yellow"
        paddingX={1}
      >
        <Text>Double</Text>
        <Text>Border</Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="green"
        paddingX={1}
      >
        <Text>Round</Text>
        <Text>Border</Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="bold"
        borderColor="magenta"
        paddingX={1}
      >
        <Text>Bold</Text>
        <Text>Border</Text>
      </Box>
    </Box>

    <Box paddingLeft={1} marginTop={1}>
      <Box
        borderStyle="single"
        borderColor="blue"
        padding={1}
        flexDirection="column"
        width={40}
      >
        <Box justifyContent="space-between">
          <Text>Left</Text>
          <Text>Right</Text>
        </Box>
        <Box justifyContent="center" marginY={1}>
          <Text color="cyan">Centered content</Text>
        </Box>
        <Box>
          <Text dimColor>Nested box with padding</Text>
        </Box>
      </Box>
    </Box>
  </Box>
);

/** Progress bar component */
const ProgressBar = ({
  value,
  width = DEFAULT_PROGRESS_WIDTH,
  color = "green",
}: {
  value: number;
  width?: number;
  color?: string;
}) => {
  const filled = Math.round((value / PERCENT_MAX) * width);
  const empty = width - filled;
  return (
    <Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(empty)}</Text>
      <Text> {value.toFixed(0)}%</Text>
    </Text>
  );
};

/** Demonstrates dynamic updates */
const DynamicTab = ({
  elapsed,
  progress,
}: {
  elapsed: number;
  progress: number;
}) => {
  const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const spinnerFrame = spinnerFrames[elapsed % spinnerFrames.length];

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Dynamic Updates</Text>
      <Box flexDirection="column" paddingLeft={1}>
        <Text>
          Elapsed: <Text color="cyan">{elapsed}s</Text>
        </Text>
        <Text>
          Spinner: <Text color="yellow">{spinnerFrame}</Text> Loading...
        </Text>

        <Newline />
        <Text>Progress bars:</Text>
        <Box flexDirection="column" paddingLeft={1}>
          <Box gap={1}>
            <Text>CPU:</Text>
            <ProgressBar value={progress} color="green" />
          </Box>
          <Box gap={1}>
            <Text>MEM:</Text>
            <ProgressBar
              value={
                (progress * PROGRESS_MEM_MULTIPLIER + PROGRESS_MEM_OFFSET) %
                PERCENT_MAX
              }
              color="blue"
            />
          </Box>
          <Box gap={1}>
            <Text>DSK:</Text>
            <ProgressBar
              value={
                (progress * PROGRESS_DSK_MULTIPLIER + PROGRESS_DSK_OFFSET) %
                PERCENT_MAX
              }
              color="yellow"
            />
          </Box>
        </Box>

        <Newline />
        <Text>Animation:</Text>
        <Box paddingLeft={1}>
          <Text color="cyan">
            {"●"
              .padStart((elapsed % ANIMATION_WIDTH) + 1, " ")
              .padEnd(ANIMATION_WIDTH, " ")}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

// ============================================================================
// Menu Configuration
// ============================================================================

/** Tab index constants */
const TAB_STYLES = 0;
const TAB_COLORS = 1;
const TAB_EXTENDED = 2;
const TAB_LAYOUT = 3;
const TAB_DYNAMIC = 4;

/** Main menu items */
const MENU_ITEMS = [
  { id: "styles", label: "Text Styles" },
  { id: "colors", label: "Basic Colors" },
  { id: "extended", label: "Extended Colors" },
  { id: "layout", label: "Layouts" },
  { id: "dynamic", label: "Dynamic" },
];

// ============================================================================
// Main App
// ============================================================================

export interface DemoAppProps {
  /** Current scale factor for display */
  scaleFactor: number;
  /** Initial frame rate */
  initialFrameRate: number;
  /** Callback to subscribe to frame rate changes */
  onFrameRateChange?: (callback: (frameRate: number) => void) => () => void;
  /** Glyph cache statistics (optional) */
  cacheStats?: { size: number; maxSize: number } | null;
}

/**
 * Demo App component
 *
 * A comprehensive demo showcasing ink-sdl capabilities including
 * text styles, colors, layouts, and dynamic updates.
 */
export const DemoApp = ({
  scaleFactor,
  initialFrameRate,
  onFrameRateChange,
  cacheStats,
}: DemoAppProps) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [frameRate, setFrameRate] = useState(initialFrameRate);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      setProgress((p) => (p + 2) % PERCENT_MAX);
    }, TIMER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!onFrameRateChange) {return;}
    return onFrameRateChange(setFrameRate);
  }, [onFrameRateChange]);

  useInput((input, key) => {
    if (key.leftArrow || input === "h") {
      setSelectedTab((t) => (t > 0 ? t - 1 : MENU_ITEMS.length - 1));
    } else if (key.rightArrow || input === "l") {
      setSelectedTab((t) => (t < MENU_ITEMS.length - 1 ? t + 1 : 0));
    } else if (key.tab) {
      setSelectedTab((t) => (t + 1) % MENU_ITEMS.length);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="double" borderColor="cyan" paddingX={2}>
        <Text bold color="cyan">
          ink-sdl Demo
        </Text>
        <Spacer />
        <Text dimColor>
          Scale: {scaleFactor.toFixed(SCALE_DECIMAL_PLACES)}x | {frameRate} fps
          {cacheStats
            ? ` | Cache: ${cacheStats.size}/${cacheStats.maxSize}`
            : ""}
        </Text>
      </Box>

      {/* Tab bar */}
      <Box marginY={1} gap={1}>
        {MENU_ITEMS.map((item, i) =>
          i === selectedTab ? (
            <Box
              key={item.id}
              borderStyle="round"
              borderColor="cyan"
              paddingX={1}
            >
              <Text color="cyan" bold>
                {item.label}
              </Text>
            </Box>
          ) : (
            <Box
              key={item.id}
              borderStyle="single"
              borderColor="gray"
              paddingX={1}
            >
              <Text>{item.label}</Text>
            </Box>
          )
        )}
      </Box>

      {/* Content area */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        padding={1}
        minHeight={15}
      >
        {selectedTab === TAB_STYLES && <TextStylesTab />}
        {selectedTab === TAB_COLORS && <BasicColorsTab />}
        {selectedTab === TAB_EXTENDED && <ExtendedColorsTab />}
        {selectedTab === TAB_LAYOUT && <LayoutTab />}
        {selectedTab === TAB_DYNAMIC && (
          <DynamicTab elapsed={elapsed} progress={progress} />
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          ← → or h/l to switch tabs | Tab to cycle | Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
};
