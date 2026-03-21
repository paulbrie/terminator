import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { sendInput, resizePty } from "../../lib/tauri-commands";
import { $termFontSize, $termFontFamily, $themeName, loadGoogleFont } from "../../stores/useSettingsStore";
import { setPtyActivity, setAgentTitle, setAgentCwd } from "../../stores/useAgentStore";
import { getThemeByName } from "../../lib/themes";

// Cache terminal buffer content keyed by paneId so it survives unmount/remount
// (e.g. when detaching a pane to a floating window).
const bufferCache = new Map<string, string>();

interface UseTerminalOptions {
  agentBackendId: string | null;
  paneId?: string;
  agentType?: string;
  onData?: (data: string) => void;
  onOutput?: (data: string) => void;
  onExit?: () => void;
}

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseTerminalOptions
) {
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const unlistenOutputRef = useRef<UnlistenFn | null>(null);
  const unlistenExitRef = useRef<UnlistenFn | null>(null);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || termRef.current) return;

    // Ensure Google Font is loaded if one is selected
    const savedFamily = $termFontFamily.getValue();
    const googleMatch = savedFamily.match(/^'([^']+)'/);
    if (googleMatch && !savedFamily.includes("SF Mono") && !savedFamily.includes("Menlo")) {
      loadGoogleFont(googleMatch[1]);
    }

    const currentTheme = getThemeByName($themeName.getValue());

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: $termFontSize.getValue(),
      fontFamily: savedFamily,
      theme: currentTheme.terminal,
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);

    // Listen for OSC 7 (current working directory) updates from the shell.
    // Format: \x1b]7;file://hostname/path\x07
    terminal.parser.registerOscHandler(7, (data) => {
      try {
        const url = new URL(data);
        if (url.protocol === "file:") {
          const cwd = decodeURIComponent(url.pathname);
          if (cwd && options.paneId) {
            setAgentCwd(options.paneId, cwd);
          }
        }
      } catch {
        // ignore malformed OSC 7
      }
      return false; // allow default handling
    });

    terminal.open(container);

    fitAddon.fit();

    // Prevent the macOS webview from intercepting Delete/Backspace
    // (which otherwise inserts a space instead of deleting)
    terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
      }
      return true;
    });

    termRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Observe container size changes (debounced to avoid resize thrashing)
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitAddon.fit();
      }, 50);
    });
    resizeObserver.observe(container);

    // Replay cached buffer content from a previous mount (e.g. after detach to floating)
    if (options.paneId) {
      const cached = bufferCache.get(options.paneId);
      if (cached) {
        bufferCache.delete(options.paneId);
        terminal.write(cached);
      }
    }

    return () => {
      // Save buffer content before dispose so it can be replayed on remount
      if (options.paneId) {
        const lines: string[] = [];
        const buf = terminal.buffer.active;
        for (let i = 0; i < buf.length; i++) {
          const line = buf.getLine(i);
          if (line) lines.push(line.translateToString(false));
        }
        // Trim trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
          lines.pop();
        }
        if (lines.length > 0) {
          bufferCache.set(options.paneId, lines.join("\r\n") + "\r\n");
        }
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      terminal.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
  }, [containerRef]);

  // React to font size changes
  useEffect(() => {
    const subscription = $termFontSize.subscribe((size) => {
      if (termRef.current) {
        termRef.current.options.fontSize = size;
        fitAddonRef.current?.fit();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // React to font family changes
  useEffect(() => {
    const subscription = $termFontFamily.subscribe((family) => {
      if (termRef.current) {
        const match = family.match(/^'([^']+)'/);
        if (match && !family.includes("SF Mono") && !family.includes("Menlo")) {
          loadGoogleFont(match[1]);
        }
        termRef.current.options.fontFamily = family;
        fitAddonRef.current?.fit();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // React to theme changes
  useEffect(() => {
    const subscription = $themeName.subscribe((name) => {
      if (termRef.current) {
        const theme = getThemeByName(name);
        termRef.current.options.theme = theme.terminal;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Wire up PTY input/output when backendId is available
  useEffect(() => {
    const terminal = termRef.current;
    const backendId = options.agentBackendId;
    if (!terminal || !backendId) return;

    // Forward terminal input to PTY (recentOutput cleared below after declaration)
    const dataDisposable = terminal.onData((data) => {
      sendInput(backendId, data).catch(console.error);
      // Clear recent output buffer on user input so the prompt detection resets
      recentOutput = "";
      options.onData?.(data);
    });

    // Forward terminal resize to PTY
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      resizePty(backendId, cols, rows).catch(console.error);
    });

    // Listen for terminal title changes (shells send OSC sequences with current command)
    const titleDisposable = terminal.onTitleChange((title) => {
      if (options.paneId && title) {
        setAgentTitle(options.paneId, title);
      }
    });

    // Send initial size to PTY so the shell gets correct dimensions before first prompt
    const { cols, rows } = terminal;
    if (cols && rows) {
      resizePty(backendId, cols, rows).catch(() => {});
    }

    // Listen for PTY output
    let cancelled = false;
    let promptTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const paneId = options.paneId;
    // Rolling buffer of recent output for detecting interactive prompts
    let recentOutput = "";
    const RECENT_OUTPUT_MAX = 2000;

    const updateActivity = (activity: "busy" | "prompt" | "idle" | "waiting_input") => {
      if (paneId) setPtyActivity(paneId, activity);
    };

    /** Detect Claude-style interactive prompts that need user input */
    const detectsUserInputPrompt = (text: string): boolean => {
      // Strip ANSI escape sequences for pattern matching
      const clean = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
      // Claude permission / confirmation prompts
      if (/Do you want to\b/.test(clean)) return true;
      if (/\bEsc to cancel\b/.test(clean)) return true;
      // Numbered choice menus (❯ 1. Yes / 2. No style)
      if (/[❯›>]\s*1\.\s/.test(clean) && /\b(Yes|No)\b/.test(clean)) return true;
      // "Allow" / "Deny" permission prompts
      if (/\b(Allow|Deny|Approve|Reject)\b/.test(clean) && /\?\s*$/.test(clean.trimEnd())) return true;
      return false;
    };

    const scheduleActivityTimers = (data: string) => {
      if (promptTimer) clearTimeout(promptTimer);
      if (idleTimer) clearTimeout(idleTimer);

      // Append to rolling buffer
      recentOutput += data;
      if (recentOutput.length > RECENT_OUTPUT_MAX) {
        recentOutput = recentOutput.slice(-RECENT_OUTPUT_MAX);
      }

      // Check for interactive input prompts (Claude agent only)
      if (options.agentType === "claude" && detectsUserInputPrompt(recentOutput)) {
        updateActivity("waiting_input");
        // Still set idle timer to avoid getting stuck
        idleTimer = setTimeout(() => {
          if (!cancelled) updateActivity("idle");
        }, 120000);
        return;
      }

      updateActivity("busy");
      promptTimer = setTimeout(() => {
        if (!cancelled) updateActivity("prompt");
      }, 1000);
      idleTimer = setTimeout(() => {
        if (!cancelled) updateActivity("idle");
      }, 30000);
    };

    listen<{ data: string }>(`agent:output:${backendId}`, (event) => {
      if (!cancelled) {
        terminal.write(event.payload.data);
        scheduleActivityTimers(event.payload.data);
        options.onOutput?.(event.payload.data);
      }
    }).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        unlistenOutputRef.current = unlisten;
      }
    });

    listen<{ code: number | null }>(`agent:exit:${backendId}`, () => {
      if (!cancelled) {
        terminal.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
        options.onExit?.();
      }
    }).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        unlistenExitRef.current = unlisten;
      }
    });

    // Initial state: shell just started, it will emit prompt output shortly
    scheduleActivityTimers("");

    return () => {
      cancelled = true;
      if (promptTimer) clearTimeout(promptTimer);
      if (idleTimer) clearTimeout(idleTimer);
      dataDisposable.dispose();
      resizeDisposable.dispose();
      titleDisposable.dispose();
      unlistenOutputRef.current?.();
      unlistenExitRef.current?.();
      unlistenOutputRef.current = null;
      unlistenExitRef.current = null;
    };
  }, [options.agentBackendId]);

  return {
    terminal: termRef,
    searchAddon: searchAddonRef,
    fit,
  };
}
