/**
 * Simple hello world example for ink-sdl
 *
 * Run with: npx tsx examples/hello.tsx
 */

import React, { useState, useEffect } from "react";
import { render, Text, Box } from "ink";
import { createSdlStreams } from "../src";

const App = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

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
      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C or close window to exit</Text>
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
