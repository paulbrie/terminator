# Terminator

A macOS desktop terminal app optimized for working with multiple AI agents simultaneously. Built with Tauri v2, React, TypeScript, and xterm.js.

## Features

### Multi-Agent Terminal
- Run multiple agents side-by-side in split panes (shell, Claude, GPT, custom scripts)
- Each agent gets a real PTY with full terminal emulation via xterm.js
- Visual state indicators per agent: idle, running, streaming, done, error

### Split-Pane Layout
- Horizontal and vertical splits with draggable dividers
- Binary tree layout model (like tmux/VS Code)
- Drag-and-drop pane rearrangement — drag headers to reposition or swap panes
- Tab system for organizing workspace groups

### Command Bar & Broadcast
- Global command bar (`Cmd+K`) to send input to any agent
- Target modes: active pane, specific agent, or broadcast to all
- Command history with arrow key navigation

### Agent Pipes
- Connect agents together — pipe output from one agent as input to another
- Visual pipe indicators in pane headers
- Create/remove pipes via the Pipe modal (`Cmd+P`)

### Workspace Management
- Save and restore entire layouts with agent configurations
- Workspaces stored in `~/.terminator/workspaces/`

### Session History
- All sessions are logged automatically to `~/.terminator/sessions/`
- Browse past sessions with full terminal output logs
- Session metadata includes agent type, label, timestamps, and duration

### Terminal Search & Export
- Per-pane terminal search (`Cmd+F`) powered by xterm.js SearchAddon
- Export terminal buffer to file from any pane

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Rust** >= 1.88 (via rustup)
- **macOS** (primary target)

If your system Rust is outdated, use the rustup toolchain:

```bash
rustup update stable
export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH"
```

### Install

```bash
npm install
```

### Development

```bash
npx tauri dev
```

This starts the Vite dev server (with HMR) and the Tauri app pointing to it.

### Production Build

```bash
npx tauri build
```

The built app is at `src-tauri/target/release/terminator`.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+D` | Split horizontal (new shell) |
| `Cmd+Shift+D` | Split vertical (new shell) |
| `Cmd+N` | New agent (type picker) |
| `Cmd+T` | New tab |
| `Cmd+W` | Close active pane |
| `Cmd+K` | Toggle command bar |
| `Cmd+F` | Search in active terminal |
| `Cmd+P` | Pipe modal |
| `Cmd+S` | Workspace manager |
| `Cmd+H` | Session history |
| `Cmd+[` / `Cmd+]` | Cycle between panes |
| `Cmd+Shift+[` / `Cmd+Shift+]` | Cycle between tabs |

**Inside the command bar:**

| Key | Action |
|---|---|
| `Enter` | Send command |
| `Escape` | Close |
| `Tab` / `Shift+Tab` | Cycle target (active → broadcast → specific agent) |
| `Arrow Up` / `Down` | Command history |

## Architecture

```
terminator/
├── src/                            # React frontend (TypeScript)
│   ├── components/
│   │   ├── layout/                 # AppShell, SplitPane, TabBar, StatusBar, PaneContainer
│   │   ├── terminal/               # TerminalView, useTerminal hook, TerminalSearch
│   │   ├── agent/                  # AgentBadge, AgentStatusBar, AgentConfigModal
│   │   ├── input/                  # CommandBar, PipeModal, PipeIndicator
│   │   └── workspace/              # WorkspaceManager, SessionHistory, ExportDialog
│   ├── stores/                     # Zustand state management
│   │   ├── useWorkspaceStore.ts    # Layout tree, tabs, active pane
│   │   ├── useAgentStore.ts        # Agent sessions, lifecycle
│   │   └── usePipeStore.ts         # Agent-to-agent pipes
│   ├── lib/
│   │   ├── layout-engine.ts        # Binary split-tree operations
│   │   ├── tauri-commands.ts       # Typed wrappers for Tauri invoke()
│   │   ├── agent-registry.ts       # Agent type definitions
│   │   └── drag-manager.ts         # Drag-and-drop utilities
│   └── types/
│       ├── agent.ts                # AgentSession, AgentConfig, AgentState
│       └── layout.ts               # SplitNode, LeafNode, Tab
├── src-tauri/                      # Rust backend
│   ├── src/
│   │   ├── lib.rs                  # Tauri setup, command registration
│   │   ├── state.rs                # AppState (agent handles, PTY writers)
│   │   ├── agent/
│   │   │   └── process.rs          # PTY spawning, I/O streaming, resize
│   │   └── commands/
│   │       ├── workspace.rs        # Save/load workspaces, sessions, export
│   │       └── system.rs           # Shell detection
│   └── tauri.conf.json             # Tauri app config
└── package.json
```

### Key Design Decisions

**PTY via `portable-pty`** — Each agent spawns a real pseudo-terminal in Rust. This gives proper TTY behavior (colors, cursor control, line editing) that xterm.js expects.

**Tauri events for streaming, commands for control** — High-frequency PTY output flows via Tauri events (fire-and-forget). Control operations (spawn, kill, resize, send input) use Tauri commands (request-response).

**Binary split tree layout** — The pane layout is a recursive tree where each node is either a split (direction + ratio + two children) or a leaf (pane ID). Operations like split, close, resize, move, and swap are tree transformations.

**Zustand for state** — Lightweight stores with no boilerplate. `useWorkspaceStore` owns the layout tree, `useAgentStore` owns agent sessions, `usePipeStore` owns pipe connections.

**Session logging** — Terminal output is buffered (500ms) and appended to per-session `.log` files to avoid excessive IPC overhead.

## Agent Types

| Type | Icon | Default Command | Description |
|---|---|---|---|
| Shell | `>_` | `/bin/zsh -l` | Interactive shell session |
| Claude | `CL` | `claude` | Claude AI agent via CLI |
| GPT | `GP` | `chatgpt` | OpenAI GPT agent |
| Custom | `CS` | (configurable) | Any command or script |

New agent types can be added in `src/lib/agent-registry.ts`.

## Data Storage

| Path | Contents |
|---|---|
| `~/.terminator/workspaces/*.json` | Saved workspace layouts |
| `~/.terminator/sessions/*.json` | Session metadata |
| `~/.terminator/sessions/*.log` | Terminal output logs |

## License

ISC
