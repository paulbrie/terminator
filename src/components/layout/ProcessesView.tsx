import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { RefreshCw, X, Search, Wifi, Cpu, GitBranch, ChevronRight, ChevronDown } from "lucide-react";
import {
  listProcesses,
  killProcess,
  type ProcessInfo,
  type ListeningPort,
  type SystemSnapshot,
} from "../../lib/tauri-commands";

type Tab = "processes" | "tree" | "ports";
type SortField = "name" | "cpu" | "memory" | "pid" | "ports";
type SortDir = "asc" | "desc";

export function ProcessesView({ onClose }: { onClose: () => void }) {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<Tab>("processes");
  const [sortField, setSortField] = useState<SortField>("cpu");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirmKill, setConfirmKill] = useState<number | null>(null);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listProcesses();
      setSnapshot(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refresh]);

  const handleKill = async (pid: number) => {
    try {
      await killProcess(pid);
      setConfirmKill(null);
      setTimeout(refresh, 500);
    } catch (e) {
      setError(`Failed to kill PID ${pid}: ${e}`);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" || field === "pid" ? "asc" : "desc");
    }
  };

  const includes = (haystack: string, needle: string) =>
    caseSensitive ? haystack.includes(needle) : haystack.toLowerCase().includes(needle.toLowerCase());

  const filteredProcesses = (snapshot?.processes ?? []).filter((p) => {
    if (!filter) return true;
    return (
      includes(p.name, filter) ||
      includes(p.command, filter) ||
      includes(p.pid.toString(), filter) ||
      p.ports.some((port) => includes(port.toString(), filter))
    );
  });

  const sortedProcesses = [...filteredProcesses].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "cpu":
        return dir * (a.cpu_usage - b.cpu_usage);
      case "memory":
        return dir * (a.memory_bytes - b.memory_bytes);
      case "pid":
        return dir * (a.pid - b.pid);
      case "ports":
        return dir * (a.ports.length - b.ports.length);
      default:
        return 0;
    }
  });

  const filteredPorts = (snapshot?.listening_ports ?? []).filter((p) => {
    if (!filter) return true;
    return (
      includes(p.port.toString(), filter) ||
      includes(p.process_name ?? "", filter) ||
      includes(p.pid?.toString() ?? "", filter)
    );
  });

  const matchCount = tab === "ports" ? filteredPorts.length : filteredProcesses.length;
  const totalCount = tab === "ports"
    ? (snapshot?.listening_ports.length ?? 0)
    : (snapshot?.processes.length ?? 0);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1a1b26",
        color: "#a9b1d6",
        fontFamily: "monospace",
        fontSize: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          gap: 8,
          borderBottom: "1px solid #292e42",
          backgroundColor: "#16161e",
        }}
      >
        {/* Tabs */}
        <TabBtn active={tab === "processes"} onClick={() => setTab("processes")}>
          <Cpu size={13} /> Processes
          {snapshot && <span style={{ color: "#565f89", marginLeft: 4 }}>({snapshot.processes.length})</span>}
        </TabBtn>
        <TabBtn active={tab === "tree"} onClick={() => setTab("tree")}>
          <GitBranch size={13} /> Tree
        </TabBtn>
        <TabBtn active={tab === "ports"} onClick={() => setTab("ports")}>
          <Wifi size={13} /> Ports
          {snapshot && <span style={{ color: "#565f89", marginLeft: 4 }}>({snapshot.listening_ports.length})</span>}
        </TabBtn>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={13} style={{ position: "absolute", left: 6, color: "#565f89" }} />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              style={{
                width: 180,
                padding: "4px 6px 4px 24px",
                backgroundColor: "#1a1b26",
                border: "1px solid #292e42",
                borderRadius: 4,
                color: "#a9b1d6",
                fontSize: 12,
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={() => setCaseSensitive((v) => !v)}
            title="Case sensitive"
            style={{
              padding: "2px 5px",
              backgroundColor: caseSensitive ? "#292e42" : "transparent",
              border: caseSensitive ? "1px solid #7aa2f7" : "1px solid #292e42",
              borderRadius: 3,
              color: caseSensitive ? "#7aa2f7" : "#565f89",
              fontSize: 11,
              fontFamily: "monospace",
              fontWeight: 700,
              cursor: "pointer",
              lineHeight: 1.2,
            }}
          >
            Aa
          </button>
          {filter && (
            <span style={{ fontSize: 11, color: "#565f89", fontFamily: "monospace", whiteSpace: "nowrap" }}>
              {matchCount}/{totalCount}
            </span>
          )}
        </div>

        {/* Auto-refresh toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            color: autoRefresh ? "#7aa2f7" : "#565f89",
            fontSize: 11,
          }}
        >
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ display: "none" }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              border: `1px solid ${autoRefresh ? "#7aa2f7" : "#565f89"}`,
              backgroundColor: autoRefresh ? "#7aa2f7" : "transparent",
            }}
          />
          Auto
        </label>

        <button onClick={refresh} style={iconBtnStyle} title="Refresh">
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />
        </button>
        <button onClick={onClose} style={iconBtnStyle} title="Close">
          <X size={14} />
        </button>
      </div>

      {error && (
        <div style={{ padding: "6px 12px", backgroundColor: "#331111", color: "#f7768e", fontSize: 11 }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "processes" ? (
          <ProcessTable
            processes={sortedProcesses}
            filter={filter}
            caseSensitive={caseSensitive}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            confirmKill={confirmKill}
            onConfirmKill={setConfirmKill}
            onKill={handleKill}
          />
        ) : tab === "tree" ? (
          <ProcessTree
            processes={filteredProcesses}
            filter={filter}
            caseSensitive={caseSensitive}
            confirmKill={confirmKill}
            onConfirmKill={setConfirmKill}
            onKill={handleKill}
          />
        ) : (
          <PortTable ports={filteredPorts} filter={filter} caseSensitive={caseSensitive} onKill={(pid) => { setConfirmKill(pid); setTab("processes"); }} />
        )}
      </div>
    </div>
  );
}

/** Highlights occurrences of `query` within `text` with a yellow background */
function Highlight({ text, query, caseSensitive = false }: { text: string; query: string; caseSensitive?: boolean }) {
  if (!query) return <>{text}</>;
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    if (idx > lastIdx) parts.push(text.slice(lastIdx, idx));
    parts.push(
      <span key={idx} style={{ backgroundColor: "#e0af68", color: "#1a1b26", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + needle.length)}
      </span>
    );
    lastIdx = idx + needle.length;
    idx = haystack.indexOf(needle, lastIdx);
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return <>{parts}</>;
}

function ProcessTable({
  processes,
  filter,
  caseSensitive,
  sortField,
  sortDir,
  onSort,
  confirmKill,
  onConfirmKill,
  onKill,
}: {
  processes: ProcessInfo[];
  filter: string;
  caseSensitive: boolean;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  confirmKill: number | null;
  onConfirmKill: (pid: number | null) => void;
  onKill: (pid: number) => void;
}) {
  const sortArrow = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #292e42", position: "sticky", top: 0, backgroundColor: "#16161e" }}>
          <SortTh onClick={() => onSort("pid")} style={{ width: 70 }}>PID{sortArrow("pid")}</SortTh>
          <SortTh onClick={() => onSort("name")}>Name{sortArrow("name")}</SortTh>
          <SortTh onClick={() => onSort("cpu")} style={{ width: 80, textAlign: "right" }}>CPU%{sortArrow("cpu")}</SortTh>
          <SortTh onClick={() => onSort("memory")} style={{ width: 90, textAlign: "right" }}>Memory{sortArrow("memory")}</SortTh>
          <SortTh onClick={() => onSort("ports")} style={{ width: 120 }}>Ports{sortArrow("ports")}</SortTh>
          <th style={{ ...thStyle, width: 60 }} />
        </tr>
      </thead>
      <tbody>
        {processes.map((p) => (
          <tr
            key={p.pid}
            style={{
              borderBottom: "1px solid #1e2030",
              backgroundColor: p.ports.length > 0 ? "#1a1f36" : undefined,
            }}
          >
            <td style={{ ...cellStyle, color: "#565f89" }}><Highlight text={String(p.pid)} query={filter} caseSensitive={caseSensitive} /></td>
            <td style={cellStyle}>
              <div style={{ color: p.ports.length > 0 ? "#7aa2f7" : "#a9b1d6" }}><Highlight text={p.name} query={filter} caseSensitive={caseSensitive} /></div>
              <div
                style={{
                  color: "#414868",
                  fontSize: 10,
                  maxWidth: 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={p.command}
              >
                <Highlight text={p.command} query={filter} caseSensitive={caseSensitive} />
              </div>
            </td>
            <td style={{ ...cellStyle, textAlign: "right", color: cpuColor(p.cpu_usage) }}>
              {p.cpu_usage.toFixed(1)}
            </td>
            <td style={{ ...cellStyle, textAlign: "right" }}>{formatBytes(p.memory_bytes)}</td>
            <td style={cellStyle}>
              {p.ports.map((port) => (
                <span key={port} style={portBadgeStyle}>
                  <Highlight text={`:${port}`} query={filter} caseSensitive={caseSensitive} />
                </span>
              ))}
            </td>
            <td style={{ ...cellStyle, textAlign: "center" }}>
              {confirmKill === p.pid ? (
                <span style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => onKill(p.pid)} style={killConfirmBtn}>Kill</button>
                  <button onClick={() => onConfirmKill(null)} style={cancelBtn}>×</button>
                </span>
              ) : (
                <button
                  onClick={() => onConfirmKill(p.pid)}
                  style={killBtn}
                  title={`Kill PID ${p.pid}`}
                >
                  ×
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PortTable({
  ports,
  filter,
  caseSensitive,
  onKill,
}: {
  ports: ListeningPort[];
  filter: string;
  caseSensitive: boolean;
  onKill: (pid: number) => void;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #292e42", position: "sticky", top: 0, backgroundColor: "#16161e" }}>
          <th style={{ ...thStyle, width: 80 }}>Port</th>
          <th style={thStyle}>Process</th>
          <th style={{ ...thStyle, width: 70 }}>PID</th>
          <th style={{ ...thStyle, width: 70 }}>Proto</th>
          <th style={{ ...thStyle, width: 60 }} />
        </tr>
      </thead>
      <tbody>
        {ports.map((p, i) => (
          <tr key={`${p.port}-${p.pid}-${i}`} style={{ borderBottom: "1px solid #1e2030" }}>
            <td style={{ ...cellStyle, color: "#7aa2f7", fontWeight: 600 }}><Highlight text={`:${p.port}`} query={filter} caseSensitive={caseSensitive} /></td>
            <td style={cellStyle}><Highlight text={p.process_name ?? "—"} query={filter} caseSensitive={caseSensitive} /></td>
            <td style={{ ...cellStyle, color: "#565f89" }}><Highlight text={p.pid != null ? String(p.pid) : "—"} query={filter} caseSensitive={caseSensitive} /></td>
            <td style={{ ...cellStyle, color: "#565f89" }}>{p.protocol}</td>
            <td style={{ ...cellStyle, textAlign: "center" }}>
              {p.pid && (
                <button onClick={() => onKill(p.pid!)} style={killBtn} title={`Kill PID ${p.pid}`}>
                  ×
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface TreeNode {
  process: ProcessInfo;
  children: TreeNode[];
}

function buildProcessTree(processes: ProcessInfo[]): TreeNode[] {
  const pidSet = new Set(processes.map((p) => p.pid));
  const nodes = new Map<number, TreeNode>();

  for (const p of processes) {
    const node: TreeNode = { process: p, children: [] };
    nodes.set(p.pid, node);
  }

  const roots: TreeNode[] = [];

  for (const p of processes) {
    const node = nodes.get(p.pid)!;
    if (p.ppid !== null && pidSet.has(p.ppid)) {
      const parentNode = nodes.get(p.ppid)!;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by CPU desc
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => b.process.cpu_usage - a.process.cpu_usage);
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

function ProcessTree({
  processes,
  filter,
  caseSensitive,
  confirmKill,
  onConfirmKill,
  onKill,
}: {
  processes: ProcessInfo[];
  filter: string;
  caseSensitive: boolean;
  confirmKill: number | null;
  onConfirmKill: (pid: number | null) => void;
  onKill: (pid: number) => void;
}) {
  const tree = useMemo(() => buildProcessTree(processes), [processes]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggleCollapse = (pid: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode[] => {
    const p = node.process;
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(p.pid);
    const indent = depth * 20;

    const rows: React.ReactNode[] = [];
    rows.push(
      <tr
        key={p.pid}
        style={{
          borderBottom: "1px solid #1e2030",
          backgroundColor: p.ports.length > 0 ? "#1a1f36" : undefined,
        }}
      >
        <td style={{ ...cellStyle, paddingLeft: 10 + indent, whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {hasChildren ? (
              <button
                onClick={() => toggleCollapse(p.pid)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#565f89",
                  cursor: "pointer",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
            ) : (
              <span style={{ width: 12, display: "inline-block" }} />
            )}
            <span style={{ color: p.ports.length > 0 ? "#7aa2f7" : "#a9b1d6" }}><Highlight text={p.name} query={filter} caseSensitive={caseSensitive} /></span>
            <span style={{ color: "#565f89", fontSize: 10 }}>(<Highlight text={String(p.pid)} query={filter} caseSensitive={caseSensitive} />)</span>
          </span>
        </td>
        <td style={{ ...cellStyle, textAlign: "right", color: cpuColor(p.cpu_usage) }}>
          {p.cpu_usage.toFixed(1)}
        </td>
        <td style={{ ...cellStyle, textAlign: "right" }}>{formatBytes(p.memory_bytes)}</td>
        <td style={cellStyle}>
          {p.ports.map((port) => (
            <span key={port} style={portBadgeStyle}><Highlight text={`:${port}`} query={filter} caseSensitive={caseSensitive} /></span>
          ))}
        </td>
        <td style={{ ...cellStyle, textAlign: "center" }}>
          {confirmKill === p.pid ? (
            <span style={{ display: "flex", gap: 4, justifyContent: "center" }}>
              <button onClick={() => onKill(p.pid)} style={killConfirmBtn}>Kill</button>
              <button onClick={() => onConfirmKill(null)} style={cancelBtn}>x</button>
            </span>
          ) : (
            <button onClick={() => onConfirmKill(p.pid)} style={killBtn} title={`Kill PID ${p.pid}`}>
              x
            </button>
          )}
        </td>
      </tr>
    );

    if (hasChildren && !isCollapsed) {
      for (const child of node.children) {
        rows.push(...renderNode(child, depth + 1));
      }
    }

    return rows;
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #292e42", position: "sticky", top: 0, backgroundColor: "#16161e" }}>
          <th style={thStyle}>Process</th>
          <th style={{ ...thStyle, width: 80, textAlign: "right" }}>CPU%</th>
          <th style={{ ...thStyle, width: 90, textAlign: "right" }}>Memory</th>
          <th style={{ ...thStyle, width: 120 }}>Ports</th>
          <th style={{ ...thStyle, width: 60 }} />
        </tr>
      </thead>
      <tbody>
        {tree.flatMap((node) => renderNode(node, 0))}
      </tbody>
    </table>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        backgroundColor: active ? "#292e42" : "transparent",
        border: active ? "1px solid #7aa2f7" : "1px solid transparent",
        borderRadius: 4,
        color: active ? "#7aa2f7" : "#565f89",
        fontSize: 12,
        fontFamily: "monospace",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SortTh({
  onClick,
  style,
  children,
}: {
  onClick: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <th onClick={onClick} style={{ ...thStyle, cursor: "pointer", userSelect: "none", ...style }}>
      {children}
    </th>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} K`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} M`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} G`;
}

function cpuColor(usage: number): string {
  if (usage > 80) return "#f7768e";
  if (usage > 30) return "#e0af68";
  if (usage > 5) return "#a9b1d6";
  return "#565f89";
}

const thStyle: React.CSSProperties = {
  padding: "6px 10px",
  textAlign: "left",
  fontSize: 11,
  color: "#565f89",
  fontWeight: 600,
  fontFamily: "monospace",
};

const cellStyle: React.CSSProperties = {
  padding: "5px 10px",
  fontSize: 12,
  fontFamily: "monospace",
};

const portBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 5px",
  marginRight: 3,
  backgroundColor: "#1e2740",
  border: "1px solid #3d59a1",
  borderRadius: 3,
  color: "#7aa2f7",
  fontSize: 10,
};

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#565f89",
  cursor: "pointer",
  padding: 4,
  display: "flex",
  alignItems: "center",
};

const killBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#565f89",
  cursor: "pointer",
  fontSize: 14,
  padding: "0 4px",
  fontFamily: "monospace",
};

const killConfirmBtn: React.CSSProperties = {
  padding: "1px 6px",
  backgroundColor: "#f7768e",
  border: "none",
  borderRadius: 3,
  color: "#1a1b26",
  fontSize: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "monospace",
};

const cancelBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#565f89",
  cursor: "pointer",
  fontSize: 13,
  padding: "0 2px",
  fontFamily: "monospace",
};
