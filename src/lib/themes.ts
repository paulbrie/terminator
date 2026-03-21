export interface TerminalTheme {
  name: string;
  // UI chrome colors
  bg: string;
  bgAlt: string;
  fg: string;
  fgMuted: string;
  border: string;
  accent: string;
  // xterm terminal colors
  terminal: {
    background: string;
    foreground: string;
    cursor: string;
    selectionBackground: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
}

export const THEMES: TerminalTheme[] = [
  {
    name: "Tokyo Night",
    bg: "#1a1b26", bgAlt: "#16161e", fg: "#a9b1d6", fgMuted: "#565f89",
    border: "#292e42", accent: "#7aa2f7",
    terminal: {
      background: "#1a1b26", foreground: "#a9b1d6", cursor: "#c0caf5", selectionBackground: "#33467c",
      black: "#15161e", red: "#f7768e", green: "#9ece6a", yellow: "#e0af68",
      blue: "#7aa2f7", magenta: "#bb9af7", cyan: "#7dcfff", white: "#a9b1d6",
      brightBlack: "#414868", brightRed: "#f7768e", brightGreen: "#9ece6a", brightYellow: "#e0af68",
      brightBlue: "#7aa2f7", brightMagenta: "#bb9af7", brightCyan: "#7dcfff", brightWhite: "#c0caf5",
    },
  },
  {
    name: "Dracula",
    bg: "#282a36", bgAlt: "#21222c", fg: "#f8f8f2", fgMuted: "#6272a4",
    border: "#44475a", accent: "#bd93f9",
    terminal: {
      background: "#282a36", foreground: "#f8f8f2", cursor: "#f8f8f2", selectionBackground: "#44475a",
      black: "#21222c", red: "#ff5555", green: "#50fa7b", yellow: "#f1fa8c",
      blue: "#bd93f9", magenta: "#ff79c6", cyan: "#8be9fd", white: "#f8f8f2",
      brightBlack: "#6272a4", brightRed: "#ff6e6e", brightGreen: "#69ff94", brightYellow: "#ffffa5",
      brightBlue: "#d6acff", brightMagenta: "#ff92df", brightCyan: "#a4ffff", brightWhite: "#ffffff",
    },
  },
  {
    name: "One Dark",
    bg: "#282c34", bgAlt: "#21252b", fg: "#abb2bf", fgMuted: "#5c6370",
    border: "#3e4452", accent: "#61afef",
    terminal: {
      background: "#282c34", foreground: "#abb2bf", cursor: "#528bff", selectionBackground: "#3e4452",
      black: "#1e2127", red: "#e06c75", green: "#98c379", yellow: "#d19a66",
      blue: "#61afef", magenta: "#c678dd", cyan: "#56b6c2", white: "#abb2bf",
      brightBlack: "#5c6370", brightRed: "#e06c75", brightGreen: "#98c379", brightYellow: "#d19a66",
      brightBlue: "#61afef", brightMagenta: "#c678dd", brightCyan: "#56b6c2", brightWhite: "#ffffff",
    },
  },
  {
    name: "Nord",
    bg: "#2e3440", bgAlt: "#272c36", fg: "#d8dee9", fgMuted: "#4c566a",
    border: "#3b4252", accent: "#88c0d0",
    terminal: {
      background: "#2e3440", foreground: "#d8dee9", cursor: "#d8dee9", selectionBackground: "#434c5e",
      black: "#3b4252", red: "#bf616a", green: "#a3be8c", yellow: "#ebcb8b",
      blue: "#81a1c1", magenta: "#b48ead", cyan: "#88c0d0", white: "#e5e9f0",
      brightBlack: "#4c566a", brightRed: "#bf616a", brightGreen: "#a3be8c", brightYellow: "#ebcb8b",
      brightBlue: "#81a1c1", brightMagenta: "#b48ead", brightCyan: "#8fbcbb", brightWhite: "#eceff4",
    },
  },
  {
    name: "Catppuccin Mocha",
    bg: "#1e1e2e", bgAlt: "#181825", fg: "#cdd6f4", fgMuted: "#585b70",
    border: "#313244", accent: "#89b4fa",
    terminal: {
      background: "#1e1e2e", foreground: "#cdd6f4", cursor: "#f5e0dc", selectionBackground: "#45475a",
      black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af",
      blue: "#89b4fa", magenta: "#f5c2e7", cyan: "#94e2d5", white: "#bac2de",
      brightBlack: "#585b70", brightRed: "#f38ba8", brightGreen: "#a6e3a1", brightYellow: "#f9e2af",
      brightBlue: "#89b4fa", brightMagenta: "#f5c2e7", brightCyan: "#94e2d5", brightWhite: "#a6adc8",
    },
  },
  {
    name: "Gruvbox Dark",
    bg: "#282828", bgAlt: "#1d2021", fg: "#ebdbb2", fgMuted: "#928374",
    border: "#3c3836", accent: "#fabd2f",
    terminal: {
      background: "#282828", foreground: "#ebdbb2", cursor: "#ebdbb2", selectionBackground: "#504945",
      black: "#282828", red: "#cc241d", green: "#98971a", yellow: "#d79921",
      blue: "#458588", magenta: "#b16286", cyan: "#689d6a", white: "#a89984",
      brightBlack: "#928374", brightRed: "#fb4934", brightGreen: "#b8bb26", brightYellow: "#fabd2f",
      brightBlue: "#83a598", brightMagenta: "#d3869b", brightCyan: "#8ec07c", brightWhite: "#ebdbb2",
    },
  },
  {
    name: "Solarized Dark",
    bg: "#002b36", bgAlt: "#00212b", fg: "#839496", fgMuted: "#586e75",
    border: "#073642", accent: "#268bd2",
    terminal: {
      background: "#002b36", foreground: "#839496", cursor: "#839496", selectionBackground: "#073642",
      black: "#073642", red: "#dc322f", green: "#859900", yellow: "#b58900",
      blue: "#268bd2", magenta: "#d33682", cyan: "#2aa198", white: "#eee8d5",
      brightBlack: "#586e75", brightRed: "#cb4b16", brightGreen: "#859900", brightYellow: "#b58900",
      brightBlue: "#268bd2", brightMagenta: "#6c71c4", brightCyan: "#2aa198", brightWhite: "#fdf6e3",
    },
  },
  {
    name: "Monokai Pro",
    bg: "#2d2a2e", bgAlt: "#221f22", fg: "#fcfcfa", fgMuted: "#727072",
    border: "#403e41", accent: "#ffd866",
    terminal: {
      background: "#2d2a2e", foreground: "#fcfcfa", cursor: "#fcfcfa", selectionBackground: "#403e41",
      black: "#403e41", red: "#ff6188", green: "#a9dc76", yellow: "#ffd866",
      blue: "#fc9867", magenta: "#ab9df2", cyan: "#78dce8", white: "#fcfcfa",
      brightBlack: "#727072", brightRed: "#ff6188", brightGreen: "#a9dc76", brightYellow: "#ffd866",
      brightBlue: "#fc9867", brightMagenta: "#ab9df2", brightCyan: "#78dce8", brightWhite: "#fcfcfa",
    },
  },
  {
    name: "Ayu Dark",
    bg: "#0a0e14", bgAlt: "#050709", fg: "#b3b1ad", fgMuted: "#5c6773",
    border: "#1d2433", accent: "#e6b450",
    terminal: {
      background: "#0a0e14", foreground: "#b3b1ad", cursor: "#e6b450", selectionBackground: "#273747",
      black: "#01060e", red: "#ea6c73", green: "#91b362", yellow: "#f9af4f",
      blue: "#53bdfa", magenta: "#fae994", cyan: "#90e1c6", white: "#c7c7c7",
      brightBlack: "#686868", brightRed: "#f07178", brightGreen: "#c2d94c", brightYellow: "#ffb454",
      brightBlue: "#59c2ff", brightMagenta: "#ffee99", brightCyan: "#95e6cb", brightWhite: "#ffffff",
    },
  },
  {
    name: "GitHub Dark",
    bg: "#0d1117", bgAlt: "#010409", fg: "#c9d1d9", fgMuted: "#484f58",
    border: "#21262d", accent: "#58a6ff",
    terminal: {
      background: "#0d1117", foreground: "#c9d1d9", cursor: "#c9d1d9", selectionBackground: "#264f78",
      black: "#0d1117", red: "#ff7b72", green: "#3fb950", yellow: "#d29922",
      blue: "#58a6ff", magenta: "#bc8cff", cyan: "#39c5cf", white: "#b1bac4",
      brightBlack: "#484f58", brightRed: "#ffa198", brightGreen: "#56d364", brightYellow: "#e3b341",
      brightBlue: "#79c0ff", brightMagenta: "#d2a8ff", brightCyan: "#56d4dd", brightWhite: "#f0f6fc",
    },
  },
  {
    name: "Palenight",
    bg: "#292d3e", bgAlt: "#232738", fg: "#a6accd", fgMuted: "#676e95",
    border: "#3a3f58", accent: "#82aaff",
    terminal: {
      background: "#292d3e", foreground: "#a6accd", cursor: "#ffcb6b", selectionBackground: "#3a3f58",
      black: "#292d3e", red: "#f07178", green: "#c3e88d", yellow: "#ffcb6b",
      blue: "#82aaff", magenta: "#c792ea", cyan: "#89ddff", white: "#d0d0d0",
      brightBlack: "#676e95", brightRed: "#f07178", brightGreen: "#c3e88d", brightYellow: "#ffcb6b",
      brightBlue: "#82aaff", brightMagenta: "#c792ea", brightCyan: "#89ddff", brightWhite: "#ffffff",
    },
  },
  {
    name: "Kanagawa",
    bg: "#1f1f28", bgAlt: "#16161d", fg: "#dcd7ba", fgMuted: "#727169",
    border: "#2a2a37", accent: "#7e9cd8",
    terminal: {
      background: "#1f1f28", foreground: "#dcd7ba", cursor: "#c8c093", selectionBackground: "#2d4f67",
      black: "#090618", red: "#c34043", green: "#76946a", yellow: "#c0a36e",
      blue: "#7e9cd8", magenta: "#957fb8", cyan: "#6a9589", white: "#c8c093",
      brightBlack: "#727169", brightRed: "#e82424", brightGreen: "#98bb6c", brightYellow: "#e6c384",
      brightBlue: "#7fb4ca", brightMagenta: "#938aa9", brightCyan: "#7aa89f", brightWhite: "#dcd7ba",
    },
  },
  {
    name: "Rosé Pine",
    bg: "#191724", bgAlt: "#1f1d2e", fg: "#e0def4", fgMuted: "#6e6a86",
    border: "#26233a", accent: "#c4a7e7",
    terminal: {
      background: "#191724", foreground: "#e0def4", cursor: "#524f67", selectionBackground: "#2a283e",
      black: "#26233a", red: "#eb6f92", green: "#31748f", yellow: "#f6c177",
      blue: "#9ccfd8", magenta: "#c4a7e7", cyan: "#ebbcba", white: "#e0def4",
      brightBlack: "#6e6a86", brightRed: "#eb6f92", brightGreen: "#31748f", brightYellow: "#f6c177",
      brightBlue: "#9ccfd8", brightMagenta: "#c4a7e7", brightCyan: "#ebbcba", brightWhite: "#e0def4",
    },
  },
  {
    name: "Everforest Dark",
    bg: "#2d353b", bgAlt: "#272e33", fg: "#d3c6aa", fgMuted: "#859289",
    border: "#374145", accent: "#a7c080",
    terminal: {
      background: "#2d353b", foreground: "#d3c6aa", cursor: "#d3c6aa", selectionBackground: "#3d484d",
      black: "#343f44", red: "#e67e80", green: "#a7c080", yellow: "#dbbc7f",
      blue: "#7fbbb3", magenta: "#d699b6", cyan: "#83c092", white: "#d3c6aa",
      brightBlack: "#859289", brightRed: "#e67e80", brightGreen: "#a7c080", brightYellow: "#dbbc7f",
      brightBlue: "#7fbbb3", brightMagenta: "#d699b6", brightCyan: "#83c092", brightWhite: "#d3c6aa",
    },
  },
  {
    name: "Synthwave '84",
    bg: "#262335", bgAlt: "#1e1a2b", fg: "#f0eff1", fgMuted: "#848bbd",
    border: "#34294f", accent: "#ff7edb",
    terminal: {
      background: "#262335", foreground: "#f0eff1", cursor: "#72f1b8", selectionBackground: "#34294f",
      black: "#262335", red: "#fe4450", green: "#72f1b8", yellow: "#fede5d",
      blue: "#36f9f6", magenta: "#ff7edb", cyan: "#36f9f6", white: "#f0eff1",
      brightBlack: "#848bbd", brightRed: "#fe4450", brightGreen: "#72f1b8", brightYellow: "#fff951",
      brightBlue: "#36f9f6", brightMagenta: "#ff7edb", brightCyan: "#36f9f6", brightWhite: "#ffffff",
    },
  },
  {
    name: "Cyberpunk",
    bg: "#0c0c1d", bgAlt: "#080816", fg: "#00ff9c", fgMuted: "#3d5c5c",
    border: "#1a1a3e", accent: "#ff2079",
    terminal: {
      background: "#0c0c1d", foreground: "#00ff9c", cursor: "#ff2079", selectionBackground: "#1a1a3e",
      black: "#000000", red: "#ff2079", green: "#00ff9c", yellow: "#ffcc00",
      blue: "#00aeff", magenta: "#cc00ff", cyan: "#00ffff", white: "#d0d0d0",
      brightBlack: "#3d5c5c", brightRed: "#ff6e9c", brightGreen: "#69ffb3", brightYellow: "#ffdb4d",
      brightBlue: "#69c8ff", brightMagenta: "#e066ff", brightCyan: "#66ffff", brightWhite: "#ffffff",
    },
  },
  {
    name: "Solarized Light",
    bg: "#fdf6e3", bgAlt: "#eee8d5", fg: "#657b83", fgMuted: "#93a1a1",
    border: "#eee8d5", accent: "#268bd2",
    terminal: {
      background: "#fdf6e3", foreground: "#657b83", cursor: "#586e75", selectionBackground: "#eee8d5",
      black: "#073642", red: "#dc322f", green: "#859900", yellow: "#b58900",
      blue: "#268bd2", magenta: "#d33682", cyan: "#2aa198", white: "#eee8d5",
      brightBlack: "#93a1a1", brightRed: "#cb4b16", brightGreen: "#859900", brightYellow: "#b58900",
      brightBlue: "#268bd2", brightMagenta: "#6c71c4", brightCyan: "#2aa198", brightWhite: "#fdf6e3",
    },
  },
  {
    name: "Night Owl",
    bg: "#011627", bgAlt: "#001122", fg: "#d6deeb", fgMuted: "#637777",
    border: "#122d42", accent: "#82aaff",
    terminal: {
      background: "#011627", foreground: "#d6deeb", cursor: "#80a4c2", selectionBackground: "#1d3b53",
      black: "#011627", red: "#ef5350", green: "#22da6e", yellow: "#addb67",
      blue: "#82aaff", magenta: "#c792ea", cyan: "#21c7a8", white: "#ffffff",
      brightBlack: "#575656", brightRed: "#ef5350", brightGreen: "#22da6e", brightYellow: "#ffeb95",
      brightBlue: "#82aaff", brightMagenta: "#c792ea", brightCyan: "#7fdbca", brightWhite: "#ffffff",
    },
  },
  {
    name: "Horizon",
    bg: "#1c1e26", bgAlt: "#16161c", fg: "#d5d8da", fgMuted: "#6c6f93",
    border: "#2e303e", accent: "#e95678",
    terminal: {
      background: "#1c1e26", foreground: "#d5d8da", cursor: "#d5d8da", selectionBackground: "#2e303e",
      black: "#16161c", red: "#e95678", green: "#29d398", yellow: "#fab795",
      blue: "#26bbd9", magenta: "#ee64ae", cyan: "#59e3e3", white: "#d5d8da",
      brightBlack: "#6c6f93", brightRed: "#ec6a88", brightGreen: "#3fdaa4", brightYellow: "#fbc3a7",
      brightBlue: "#3fc6de", brightMagenta: "#f075b7", brightCyan: "#6be6e6", brightWhite: "#d5d8da",
    },
  },
];

export function getThemeByName(name: string): TerminalTheme {
  return THEMES.find((t) => t.name === name) ?? THEMES[0];
}

/** Apply a theme's UI colors as CSS custom properties on documentElement */
export function applyThemeToDOM(theme: TerminalTheme) {
  const root = document.documentElement;
  root.style.setProperty("--t-bg", theme.bg);
  root.style.setProperty("--t-bg-alt", theme.bgAlt);
  root.style.setProperty("--t-fg", theme.fg);
  root.style.setProperty("--t-fg-muted", theme.fgMuted);
  root.style.setProperty("--t-border", theme.border);
  root.style.setProperty("--t-accent", theme.accent);
}
