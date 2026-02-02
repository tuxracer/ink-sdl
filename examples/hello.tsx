/**
 * Interactive demo for ink-sdl
 *
 * Run with: npx tsx examples/hello.tsx
 */

import React, { useState, useEffect } from "react";
import { render, Text, Box, useInput } from "ink";
import { createSdlStreams } from "../src";

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
      // Handle selection (just for demo, doesn't do anything)
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
    </Box>
  );
};

// Create SDL streams
const { stdin, stdout, window } = createSdlStreams({
  title: "ink-sdl Hello World",
  width: 640,
  height: 480,
});

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
