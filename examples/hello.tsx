/**
 * Interactive demo for ink-sdl
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
import { render, Text, Box, useInput } from "ink";
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

const MENU_ITEMS = [
  { label: "New Game", description: "Start a new adventure" },
  { label: "Load Game", description: "Continue your journey" },
  { label: "Settings", description: "Configure options" },
  { label: "High Scores", description: "View the leaderboard" },
  { label: "Credits", description: "See who made this" },
  { label: "Exit", description: "Quit the application" },
];

const App = () => {
  const [count, setCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, 1_000);

    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : MENU_ITEMS.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => (i < MENU_ITEMS.length - 1 ? i + 1 : 0));
    } else if (key.return) {
      const selected = MENU_ITEMS[selectedIndex];
      if (selected?.label === "Exit") {
        window.close();
        process.exit(0);
      }
    }
  });

  const selectedItem = MENU_ITEMS[selectedIndex];

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green" bold>
        Hello from SDL!
      </Text>
      <Text>
        Timer: <Text color="cyan">{count}s</Text>
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold underline>
          Menu
        </Text>
        {MENU_ITEMS.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Text key={item.label}>
              <Text color={isSelected ? "cyan" : undefined}>
                {isSelected ? "> " : "  "}
                {item.label}
              </Text>
            </Text>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>{selectedItem?.description}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Use arrow keys to navigate, Ctrl+C to exit</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Scale: {scaleFactor.toFixed(2)}x | Font:{" "}
          {args["font-size"] ?? "default"}pt
        </Text>
      </Box>
    </Box>
  );
};

// Create SDL streams with CLI options
const { stdin, stdout, window, renderer } = createSdlStreams({
  title: args.title ?? "ink-sdl Hello World",
  width: args.width ? parseInt(args.width, 10) : 640,
  height: args.height ? parseInt(args.height, 10) : 480,
  fontSize: args["font-size"] ? parseInt(args["font-size"], 10) : undefined,
  scaleFactor: args["scale-factor"]
    ? parseFloat(args["scale-factor"])
    : undefined,
});

const scaleFactor = renderer.getScaleFactor();

// Render the app
render(<App />, { stdin, stdout });

// Handle window close
window.on("close", () => {
  process.exit(0);
});

// Handle Ctrl+C
process.on("SIGINT", () => {
  window.close();
  process.exit(0);
});
