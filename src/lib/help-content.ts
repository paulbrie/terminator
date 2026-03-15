export interface HelpEntry {
  id: string;
  category: string;
  title: string;
  shortcut?: string;
  description: string;
}

export const HELP_ENTRIES: HelpEntry[] = [
  // Panes
  {
    id: "split-h",
    category: "Panes",
    title: "Split Horizontal",
    shortcut: "⌘D",
    description: "Split the active pane horizontally, spawning a new shell on the right.",
  },
  {
    id: "split-v",
    category: "Panes",
    title: "Split Vertical",
    shortcut: "⇧⌘D",
    description: "Split the active pane vertically, spawning a new shell below.",
  },
  {
    id: "close-pane",
    category: "Panes",
    title: "Close Pane",
    shortcut: "⌘W",
    description: "Close the active pane and kill its agent process.",
  },
  {
    id: "cycle-panes",
    category: "Panes",
    title: "Cycle Panes",
    shortcut: "⌘[ / ⌘]",
    description: "Move focus between panes in the current tab.",
  },
  {
    id: "drag-panes",
    category: "Panes",
    title: "Drag & Drop",
    description:
      "Drag a pane by its header to rearrange. Drop on edges to split, drop on center to swap.",
  },
  {
    id: "resize-panes",
    category: "Panes",
    title: "Resize Splits",
    description: "Drag the divider between panes to resize. Dividers highlight blue on hover.",
  },

  // Agents
  {
    id: "new-agent",
    category: "Agents",
    title: "New Agent",
    shortcut: "⌘N",
    description:
      "Open the agent picker to spawn a Shell, Claude, GPT, or custom agent in a new split.",
  },
  {
    id: "agent-types",
    category: "Agents",
    title: "Agent Types",
    description:
      "Shell (>_): interactive zsh session. Claude (CL): Claude CLI agent. GPT (GP): OpenAI agent. Custom (CS): any command or script.",
  },
  {
    id: "agent-states",
    category: "Agents",
    title: "Agent States",
    description:
      "Each agent shows its state: green dot = running, blue = streaming, gray = idle/done, red = error. The dot pulses when active.",
  },

  // Tabs
  {
    id: "new-tab",
    category: "Tabs",
    title: "New Tab",
    shortcut: "⌘T",
    description: "Create a new tab with a fresh shell session.",
  },
  {
    id: "cycle-tabs",
    category: "Tabs",
    title: "Cycle Tabs",
    shortcut: "⇧⌘[ / ⇧⌘]",
    description: "Switch between tabs.",
  },

  // Command Bar
  {
    id: "cmd-bar",
    category: "Command Bar",
    title: "Toggle Command Bar",
    shortcut: "⌘K",
    description:
      "Open a floating input bar to send commands to agents. Tab cycles the target between active pane, broadcast (all agents), or a specific agent.",
  },
  {
    id: "broadcast",
    category: "Command Bar",
    title: "Broadcast Mode",
    description:
      "When target is set to 'All', your input is sent to every running agent simultaneously. The bar turns red as a safety indicator.",
  },
  {
    id: "cmd-history",
    category: "Command Bar",
    title: "Command History",
    description: "Arrow Up/Down to navigate through your last 100 commands.",
  },

  // Pipes
  {
    id: "pipe-agents",
    category: "Pipes",
    title: "Pipe Output",
    shortcut: "⌘P",
    description:
      "Connect two agents: output from the source is automatically forwarded as input to the target. Useful for chaining agents together.",
  },
  {
    id: "pipe-indicators",
    category: "Pipes",
    title: "Pipe Indicators",
    description:
      "Active pipes show as colored badges in the pane header (→ for outgoing, ← for incoming). Click a badge to disconnect.",
  },

  // Terminal
  {
    id: "search",
    category: "Terminal",
    title: "Search",
    shortcut: "⌘F",
    description:
      "Search within the active terminal. Enter = next match, Shift+Enter = previous, Esc = close.",
  },
  {
    id: "export",
    category: "Terminal",
    title: "Export Output",
    description:
      "Click the ↓ button in any pane header to save the full terminal buffer to a file.",
  },
  {
    id: "font-size",
    category: "Terminal",
    title: "Font Size",
    shortcut: "⌘+ / ⌘-",
    description:
      "Increase or decrease font size for both the UI and terminal. Fine-tune in Settings (⌘,).",
  },

  // Workspace
  {
    id: "workspaces",
    category: "Workspaces",
    title: "Workspace Manager",
    shortcut: "⌘S",
    description:
      "Save the current layout and agent configuration to disk. Restore saved workspaces to rebuild your setup instantly.",
  },
  {
    id: "session-history",
    category: "Workspaces",
    title: "Session History",
    shortcut: "⌘H",
    description:
      "Browse past agent sessions with full terminal output logs. Sessions are recorded automatically.",
  },
  {
    id: "settings",
    category: "Workspaces",
    title: "Settings",
    shortcut: "⌘,",
    description: "Adjust UI and terminal font sizes with sliders.",
  },
];

export const CATEGORIES = [...new Set(HELP_ENTRIES.map((e) => e.category))];

export function getHelpForContext(contextId: string): HelpEntry | undefined {
  return HELP_ENTRIES.find((e) => e.id === contextId);
}

export function searchHelp(query: string): HelpEntry[] {
  const q = query.toLowerCase();
  return HELP_ENTRIES.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.shortcut && e.shortcut.toLowerCase().includes(q))
  );
}
