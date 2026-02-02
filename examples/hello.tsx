/**
 * Comprehensive demo for ink-sdl
 *
 * Tests various Ink components and ANSI rendering capabilities:
 * - Text styles: bold, dim, italic, underline, strikethrough, inverse
 * - Colors: ANSI 16, ANSI 256, RGB true color
 * - Box layouts: flexDirection, padding, margin, borders
 * - Dynamic updates: timers, counters, progress bars
 * - User input: keyboard navigation, tab switching
 *
 * Run with: npx tsx examples/hello.tsx
 * CLI options:
 *   --title <string>        Window title
 *   --width <number>        Window width in pixels
 *   --height <number>       Window height in pixels
 *   --font-size <number>    Font size in points
 *   --scale-factor <number> Scale factor (omit for auto-detect)
 */

import { parseArgs } from "node:util";
import React, { useState, useEffect } from "react";
import { render, Text, Box, useInput, Spacer, Newline } from "ink";
import { createSdlStreams } from "../src";

const { values: args } = parseArgs({
  options: {
    title: { type: "string" },
    width: { type: "string" },
    height: { type: "string" },
    "font-size": { type: "string" },
    "scale-factor": { type: "string" },
  },
});

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
        {[196, 208, 226, 46, 51, 21, 129, 201].map((code) => (
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
        {"RAINBOW".split("").map((char, i) => {
          const colors = [
            "#ff0000",
            "#ff7f00",
            "#ffff00",
            "#00ff00",
            "#0000ff",
            "#4b0082",
            "#9400d3",
          ];
          return (
            <Text key={i} color={colors[i]}>
              {char}
            </Text>
          );
        })}
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
  width = 20,
  color = "green",
}: {
  value: number;
  width?: number;
  color?: string;
}) => {
  const filled = Math.round((value / 100) * width);
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
            <ProgressBar value={(progress * 0.7 + 30) % 100} color="blue" />
          </Box>
          <Box gap={1}>
            <Text>DSK:</Text>
            <ProgressBar value={(progress * 0.4 + 60) % 100} color="yellow" />
          </Box>
        </Box>

        <Newline />
        <Text>Animation:</Text>
        <Box paddingLeft={1}>
          <Text color="cyan">
            {"●".padStart((elapsed % 10) + 1, " ").padEnd(10, " ")}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

/** Main menu items */
const MENU_ITEMS = [
  { id: "styles", label: "Text Styles", component: TextStylesTab },
  { id: "colors", label: "Basic Colors", component: BasicColorsTab },
  { id: "extended", label: "Extended Colors", component: ExtendedColorsTab },
  { id: "layout", label: "Layouts", component: LayoutTab },
  { id: "dynamic", label: "Dynamic", component: null }, // Special handling
];

// ============================================================================
// Main App
// ============================================================================

const App = ({
  scaleFactor,
  cacheStats,
}: {
  scaleFactor: number;
  cacheStats: { size: number; maxSize: number } | null;
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      setProgress((p) => (p + 2) % 100);
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (key.leftArrow || input === "h") {
      setSelectedTab((t) => (t > 0 ? t - 1 : MENU_ITEMS.length - 1));
    } else if (key.rightArrow || input === "l") {
      setSelectedTab((t) => (t < MENU_ITEMS.length - 1 ? t + 1 : 0));
    } else if (key.tab) {
      setSelectedTab((t) => (t + 1) % MENU_ITEMS.length);
    }
  });

  const CurrentTab = MENU_ITEMS[selectedTab]?.component;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="double" borderColor="cyan" paddingX={2}>
        <Text bold color="cyan">
          ink-sdl Comprehensive Demo
        </Text>
        <Spacer />
        <Text dimColor>
          Scale: {scaleFactor.toFixed(2)}x | Cache:{" "}
          {cacheStats ? `${cacheStats.size}/${cacheStats.maxSize}` : "N/A"}
        </Text>
      </Box>

      {/* Tab bar */}
      <Box marginY={1} gap={1}>
        {MENU_ITEMS.map((item, i) => (
          <Box
            key={item.id}
            borderStyle={i === selectedTab ? "round" : "single"}
            borderColor={i === selectedTab ? "cyan" : "gray"}
            paddingX={1}
          >
            <Text color={i === selectedTab ? "cyan" : undefined} bold={i === selectedTab}>
              {item.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Content area */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        padding={1}
        minHeight={15}
      >
        {CurrentTab ? (
          <CurrentTab />
        ) : (
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

// ============================================================================
// Setup and Render
// ============================================================================

const { stdin, stdout, window, renderer } = createSdlStreams({
  title: args.title ?? "ink-sdl Demo",
  width: args.width ? parseInt(args.width, 10) : 800,
  height: args.height ? parseInt(args.height, 10) : 600,
  fontSize: args["font-size"] ? parseInt(args["font-size"], 10) : undefined,
  scaleFactor: args["scale-factor"]
    ? parseFloat(args["scale-factor"])
    : undefined,
});

const scaleFactor = renderer.getScaleFactor();
const cacheStats = window.getCacheStats();

render(<App scaleFactor={scaleFactor} cacheStats={cacheStats} />, {
  stdin,
  stdout,
});

window.on("close", () => {
  process.exit(0);
});

window.on("blur", () => {
  // Could show a "paused" indicator here
});

process.on("SIGINT", () => {
  window.close();
  process.exit(0);
});
