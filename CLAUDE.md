# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Terminator is a macOS desktop terminal app for running multiple AI agents (shell, Claude, GPT, custom) in split-pane layouts. Built with Tauri v2 (Rust backend) + React 19 + TypeScript + xterm.js.

## Development Commands

```bash
npm run dev        # Start Vite dev server + Tauri dev mode (HMR on :1420/:1421)
npm run build      # TypeScript type-check + Vite production build
npm tauri build    # Full production desktop build
```

No test framework or linter is configured.

## Architecture

### Frontend (src/)

**State management** uses Subjecto (reactive Observable-based library with Zustand-like API). Four stores:
- `useWorkspaceStore` — layout tree, tabs, active pane/tab, floating panes, view mode. Auto-persists to localStorage (debounced 500ms).
- `useAgentStore` — active agent PTY sessions, their configs and lifecycle state.
- `usePipeStore` — inter-agent pipes (source → target output forwarding). Memory only.
- `useSettingsStore` — font sizes, font family, theme. Persists to localStorage.

**Layout model** is a binary split tree (like tmux/VS Code). Core operations in `src/lib/layout-engine.ts`: split, remove, move, swap, ratio adjustment. Each leaf node holds a `paneId`. Tabs each have their own root layout tree.

**Terminal integration** via xterm.js with WebGL renderer. `useTerminal.ts` hook manages the xterm lifecycle, PTY event binding, and theme application. Agent output streams via Tauri events (`agent:output:{id}`, `agent:exit:{id}`).

**Theme system** in `src/lib/themes.ts` — 20+ color schemes (Tokyo Night default). Themes define both UI CSS variables and xterm color palettes, applied via `applyThemeToDOM()`.

### Backend (src-tauri/src/)

Rust with Tauri v2 and tokio async runtime:
- `agent/process.rs` — PTY spawning via `portable-pty`, reader thread emits Tauri events for output, commands for input/resize/kill.
- `commands/workspace.rs` — file I/O for workspaces (`~/.terminator/workspaces/*.json`) and sessions (`~/.terminator/sessions/`).
- `state.rs` — `AppState` holding a HashMap of `AgentHandle`s (PTY process + reader/writer).

**IPC pattern**: High-frequency PTY output uses Tauri events (fire-and-forget). Control operations (spawn, input, resize, kill) use Tauri commands (request-response). Frontend wrappers in `src/lib/tauri-commands.ts`.

### Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts).

## Task Management

Use the `terminator` CLI to manage project tasks:

```bash
terminator tasks list Terminator           # List all tasks
terminator tasks add Terminator "<title>"  # Add a task
terminator tasks done Terminator <N>       # Mark task N as done
terminator tasks remove Terminator <N>     # Remove task N
```

## Key Keyboard Shortcuts

Cmd+D / Cmd+Shift+D — split horizontal/vertical, Cmd+K — command bar, Cmd+P — pipe modal, Cmd+S — save workspace, Cmd+W — close pane, Cmd+? — help overlay.
