#!/usr/bin/env node
/**
 * Terminator MCP Server
 * Exposes Terminator's browser API as MCP tools over stdio.
 * No dependencies — implements JSON-RPC / MCP protocol directly.
 *
 * Reads the API port from ~/.terminator/api.port (or ~/.terminator-dev/api.port)
 * and proxies tool calls to the local HTTP API.
 */

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createInterface } from "readline";
import http from "http";

// --- Port discovery ---

function readApiPort() {
  for (const folder of [".terminator", ".terminator-dev"]) {
    try {
      const port = readFileSync(join(homedir(), folder, "api.port"), "utf8").trim();
      if (port) return parseInt(port, 10);
    } catch { /* ignore */ }
  }
  return null;
}

// --- HTTP helpers ---

function apiRequest(method, path, body) {
  const port = readApiPort();
  if (!port) return Promise.reject(new Error("Terminator is not running (no api.port file)"));

  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: data
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
          : undefined,
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(chunks));
          } catch {
            resolve({ raw: chunks });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// --- MCP Tool definitions ---

const TOOLS = [
  {
    name: "browser_open",
    description:
      "Open a new Chromium browser window in Terminator. Use this to launch a browser for testing web apps, inspecting pages, or any task that needs a real browser. The browser opens as a detached OS window. Returns the browser label for use with other browser tools.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Initial URL to open (defaults to https://www.google.com)",
        },
      },
      required: [],
    },
  },
  {
    name: "browser_list",
    description: "List all open browser panes in Terminator",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "browser_navigate",
    description: "Navigate a browser pane to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to navigate to" },
        label: { type: "string", description: "Browser pane label (optional, defaults to first open browser)" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_eval",
    description: "Execute JavaScript in a browser pane and return the result",
    inputSchema: {
      type: "object",
      properties: {
        js: { type: "string", description: "JavaScript code to evaluate" },
        label: { type: "string", description: "Browser pane label (optional)" },
      },
      required: ["js"],
    },
  },
  {
    name: "browser_back",
    description: "Navigate back in browser history",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Browser pane label (optional)" },
      },
      required: [],
    },
  },
  {
    name: "browser_forward",
    description: "Navigate forward in browser history",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Browser pane label (optional)" },
      },
      required: [],
    },
  },
  {
    name: "browser_reload",
    description: "Reload the current page in a browser pane",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Browser pane label (optional)" },
      },
      required: [],
    },
  },
  {
    name: "browser_url",
    description: "Get the current URL of a browser pane",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Browser pane label (optional)" },
      },
      required: [],
    },
  },
];

// --- Tool handlers ---

async function handleToolCall(name, args) {
  switch (name) {
    case "browser_open": {
      const body = {};
      if (args.url) body.url = args.url;
      const res = await apiRequest("POST", "/browser/open", body);
      return `Browser opened${args.url ? ` at ${args.url}` : ""}. Label: ${res.label}\nYou can now use browser_navigate, browser_eval, browser_url, etc. to interact with it.`;
    }
    case "browser_list": {
      const res = await apiRequest("GET", "/browser/list");
      return JSON.stringify(res, null, 2);
    }
    case "browser_navigate": {
      const body = { url: args.url };
      if (args.label) body.label = args.label;
      await apiRequest("POST", "/browser/navigate", body);
      return `Navigated to ${args.url}`;
    }
    case "browser_eval": {
      const body = { js: args.js };
      if (args.label) body.label = args.label;
      const res = await apiRequest("POST", "/browser/eval", body);
      return JSON.stringify(res, null, 2);
    }
    case "browser_back": {
      const body = args.label ? { label: args.label } : {};
      await apiRequest("POST", "/browser/back", body);
      return "Navigated back";
    }
    case "browser_forward": {
      const body = args.label ? { label: args.label } : {};
      await apiRequest("POST", "/browser/forward", body);
      return "Navigated forward";
    }
    case "browser_reload": {
      const body = args.label ? { label: args.label } : {};
      await apiRequest("POST", "/browser/reload", body);
      return "Page reloaded";
    }
    case "browser_url": {
      const body = args.label ? { label: args.label } : {};
      const res = await apiRequest("POST", "/browser/url", body);
      return JSON.stringify(res, null, 2);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- JSON-RPC / MCP protocol ---

function jsonRpcResponse(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      return jsonRpcResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: {
          name: "terminator-browser",
          version: "0.1.0",
          description:
            "Terminator is a desktop terminal app with built-in Chromium browser panes. " +
            "Use browser_open to launch a real browser window for testing web apps, then " +
            "interact with it via browser_navigate, browser_eval (run JS), browser_url, etc. " +
            "This is ideal for end-to-end testing, visual verification, and web scraping.",
        },
      });

    case "notifications/initialized":
      return null; // no response for notifications

    case "tools/list":
      return jsonRpcResponse(id, { tools: TOOLS });

    case "tools/call": {
      const { name, arguments: args } = params;
      try {
        const result = await handleToolCall(name, args || {});
        return jsonRpcResponse(id, {
          content: [{ type: "text", text: result }],
        });
      } catch (err) {
        return jsonRpcResponse(id, {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        });
      }
    }

    case "ping":
      return jsonRpcResponse(id, {});

    default:
      if (id !== undefined) {
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
      }
      return null; // ignore unknown notifications
  }
}

// --- stdio transport ---

function send(obj) {
  const json = JSON.stringify(obj);
  process.stdout.write(`${json}\n`);
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on("line", async (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    const response = await handleMessage(msg);
    if (response) send(response);
  } catch (err) {
    send(jsonRpcError(null, -32700, `Parse error: ${err.message}`));
  }
});

rl.on("close", () => process.exit(0));
