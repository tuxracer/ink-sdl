/**
 * SDL_ttf Constants
 */

/** SDL2_ttf library paths by platform */
export const SDL_TTF_LIB_PATHS: Record<string, string[]> = {
  darwin: [
    "/opt/homebrew/lib/libSDL2_ttf.dylib", // Homebrew ARM
    "/usr/local/lib/libSDL2_ttf.dylib", // Homebrew Intel
    "/opt/local/lib/libSDL2_ttf.dylib", // MacPorts
    "libSDL2_ttf.dylib", // System path
  ],
  linux: [
    "/usr/lib/x86_64-linux-gnu/libSDL2_ttf-2.0.so.0", // Debian/Ubuntu x64
    "/usr/lib/aarch64-linux-gnu/libSDL2_ttf-2.0.so.0", // Debian/Ubuntu ARM64
    "/usr/lib64/libSDL2_ttf-2.0.so.0", // Fedora/RHEL
    "/usr/lib/libSDL2_ttf-2.0.so.0", // Arch
    "libSDL2_ttf-2.0.so.0", // System path
  ],
  win32: ["SDL2_ttf.dll", "C:\\Windows\\System32\\SDL2_ttf.dll"],
};

// TTF Style constants
export const TTF_STYLE_NORMAL = 0x00;
export const TTF_STYLE_BOLD = 0x01;
export const TTF_STYLE_ITALIC = 0x02;
export const TTF_STYLE_UNDERLINE = 0x04;
export const TTF_STYLE_STRIKETHROUGH = 0x08;
