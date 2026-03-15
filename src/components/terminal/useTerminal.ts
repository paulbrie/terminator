import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebglAddon } from "@xterm/addon-webgl";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { sendInput, resizePty } from "../../lib/tauri-commands";
import { termFontSize$ } from "../../stores/useSettingsStore";

interface UseTerminalOptions {
  agentBackendId: string | null;
  paneId?: string;
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

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: termFontSize$.getValue(),
      fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
        selectionBackground: "#33467c",
        black: "#15161e",
        red: "#f7768e",
        green: "#9ece6a",
        yellow: "#e0af68",
        blue: "#7aa2f7",
        magenta: "#bb9af7",
        cyan: "#7dcfff",
        white: "#a9b1d6",
        brightBlack: "#414868",
        brightRed: "#f7768e",
        brightGreen: "#9ece6a",
        brightYellow: "#e0af68",
        brightBlue: "#7aa2f7",
        brightMagenta: "#bb9af7",
        brightCyan: "#7dcfff",
        brightWhite: "#c0caf5",
      },
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);

    terminal.open(container);

    // Try WebGL renderer, fall back silently
    try {
      const webglAddon = new WebglAddon();
      terminal.loadAddon(webglAddon);
    } catch {
      // DOM renderer is fine
    }

    fitAddon.fit();

    termRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Observe container size changes
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
  }, [containerRef]);

  // React to font size changes
  useEffect(() => {
    const subscription = termFontSize$.subscribe((size) => {
      if (termRef.current) {
        termRef.current.options.fontSize = size;
        fitAddonRef.current?.fit();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Wire up PTY input/output when backendId is available
  useEffect(() => {
    const terminal = termRef.current;
    const backendId = options.agentBackendId;
    if (!terminal || !backendId) return;

    // Forward terminal input to PTY
    const dataDisposable = terminal.onData((data) => {
      sendInput(backendId, data).catch(console.error);
      options.onData?.(data);
    });

    // Forward terminal resize to PTY
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      resizePty(backendId, cols, rows).catch(console.error);
    });

    // Listen for PTY output
    let cancelled = false;

    listen<{ data: string }>(`agent:output:${backendId}`, (event) => {
      if (!cancelled) {
        terminal.write(event.payload.data);
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

    return () => {
      cancelled = true;
      dataDisposable.dispose();
      resizeDisposable.dispose();
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
