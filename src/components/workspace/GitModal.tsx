import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  GitBranch,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Plus,
  Minus,
  FileText,
  X,
  Loader2,
  History,
  GitCommitHorizontal,
  Globe,
  ChevronRight,
  CircleCheck,
} from "lucide-react";
import {
  gitStatus,
  gitStage,
  gitUnstage,
  gitCommit,
  gitPull,
  gitPush,
  gitBranches,
  gitCheckout,
  gitLog,
  gitShow,
  type GitFileStatus,
  type GitStatusResult,
  type GitBranchInfo,
  type GitLogEntry,
} from "../../lib/tauri-commands";

type Tab = "status" | "branches" | "log";

interface GitModalProps {
  folder: string;
  onClose: () => void;
}

export function GitModal({ folder, onClose }: GitModalProps) {
  const [tab, setTab] = useState<Tab>("status");
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setSpinning(true);
    gitStatus(folder)
      .then(setStatus)
      .catch((e) => setFeedback({ text: String(e), error: true }))
      .finally(() => setTimeout(() => setSpinning(false), 400));
  }, [folder]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-dismiss success feedback after 3s
  useEffect(() => {
    if (feedback && !feedback.error) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const folderName = folder.replace(/^.*\//, "");
  const totalChanges = (status?.files.length ?? 0);

  const runAction = async (action: () => Promise<unknown>, successMsg?: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await action();
      if (successMsg) {
        const msg = typeof result === "string" && result.trim() ? result.trim() : successMsg;
        setFeedback({ text: msg });
      }
      refresh();
    } catch (e) {
      setFeedback({ text: String(e), error: true });
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "status", label: "Status", icon: <FileText size={12} /> },
    { id: "branches", label: "Branches", icon: <GitBranch size={12} /> },
    { id: "log", label: "Log", icon: <History size={12} /> },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#1a1b26",
          border: "1px solid #292e42",
          borderRadius: 12,
          width: 580,
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'SF Mono', 'Menlo', 'Fira Code', monospace",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(122,162,247,0.08)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", padding: "14px 18px",
          borderBottom: "1px solid #292e42", gap: 10,
          background: "linear-gradient(180deg, rgba(122,162,247,0.04) 0%, transparent 100%)",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            backgroundColor: "rgba(122,162,247,0.1)", border: "1px solid rgba(122,162,247,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <GitBranch size={14} style={{ color: "#7aa2f7" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#c0caf5" }}>
              {status?.branch ?? "..."}
            </span>
            <span style={{ fontSize: 11, color: "#414868", marginLeft: 8 }}>{folderName}</span>
          </div>
          {totalChanges > 0 && (
            <span style={{
              fontSize: 10, color: "#1a1b26", backgroundColor: "#e0af68",
              borderRadius: 10, padding: "2px 8px", fontWeight: 700,
            }}>
              {totalChanges}
            </span>
          )}
          <HeaderBtn onClick={refresh} title="Refresh">
            <RefreshCw size={13} style={{ transition: "transform 0.4s ease", transform: spinning ? "rotate(360deg)" : "rotate(0deg)" }} />
          </HeaderBtn>
          <HeaderBtn onClick={onClose}><X size={14} /></HeaderBtn>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #292e42", padding: "0 18px", gap: 2 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "9px 14px",
                fontSize: 11, fontFamily: "inherit",
                color: tab === t.id ? "#c0caf5" : "#565f89",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: tab === t.id ? "2px solid #7aa2f7" : "2px solid transparent",
                marginBottom: -1,
                transition: "color 0.15s, border-color 0.15s",
                fontWeight: tab === t.id ? 500 : 400,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {tab === "status" && (
            <StatusTab
              folder={folder}
              status={status}
              loading={loading}
              runAction={runAction}
              setFeedback={setFeedback}
            />
          )}
          {tab === "branches" && (
            <BranchesTab
              folder={folder}
              currentBranch={status?.branch ?? ""}
              onSwitched={() => { refresh(); setTab("status"); }}
              setFeedback={setFeedback}
            />
          )}
          {tab === "log" && (
            <LogTab folder={folder} setFeedback={setFeedback} />
          )}
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div style={{ padding: "8px 18px 12px", borderTop: "1px solid #292e42", flexShrink: 0 }}>
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: feedback.error ? "rgba(247,118,142,0.06)" : "rgba(115,218,202,0.06)",
                border: `1px solid ${feedback.error ? "rgba(247,118,142,0.15)" : "rgba(115,218,202,0.15)"}`,
                borderRadius: 6, fontSize: 11,
                color: feedback.error ? "#f7768e" : "#73daca",
                maxHeight: 72, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {feedback.error
                ? <X size={12} style={{ flexShrink: 0 }} />
                : <Check size={12} style={{ flexShrink: 0 }} />
              }
              {feedback.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Tab ─────────────────────────────────────────────

function StatusTab({
  folder, status, loading, runAction,
}: {
  folder: string;
  status: GitStatusResult | null;
  loading: boolean;
  runAction: (action: () => Promise<unknown>, msg?: string) => Promise<void>;
  setFeedback: (f: { text: string; error?: boolean } | null) => void;
}) {
  const [commitMsg, setCommitMsg] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const staged = status?.files.filter((f) => f.staged) ?? [];
  const unstaged = status?.files.filter((f) => !f.staged) ?? [];
  const fileKey = (f: GitFileStatus) => `${f.staged ? "s" : "u"}:${f.path}`;

  const toggleSelect = (key: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const handleStage = (files: string[]) => runAction(() => gitStage(folder, files));
  const handleUnstage = (files: string[]) => runAction(() => gitUnstage(folder, files));
  const handleCommit = () => {
    if (!commitMsg.trim()) return;
    runAction(() => gitCommit(folder, commitMsg.trim()), "Committed").then(() => setCommitMsg(""));
  };
  const handlePull = () => runAction(() => gitPull(folder), "Pulled");
  const handlePush = () => runAction(() => gitPush(folder), "Pushed");

  const selectedStaged = staged.filter((f) => selected.has(fileKey(f))).map((f) => f.path);
  const selectedUnstaged = unstaged.filter((f) => selected.has(fileKey(f))).map((f) => f.path);

  return (
    <>
      <div style={{ padding: "12px 0" }}>
        <FileSection
          title="Staged" icon={<Check size={11} />} titleColor="#73daca" files={staged}
          selected={selected} fileKey={fileKey} onToggle={toggleSelect}
          actionLabel="Unstage" actionIcon={<Minus size={10} />}
          onAction={(f) => handleUnstage([f.path])}
          bulkCount={selectedStaged.length}
          onBulk={selectedStaged.length > 0 ? () => handleUnstage(selectedStaged) : undefined}
          disabled={loading}
        />
        <FileSection
          title="Changes" icon={<FileText size={11} />} titleColor="#f7768e" files={unstaged}
          selected={selected} fileKey={fileKey} onToggle={toggleSelect}
          actionLabel="Stage" actionIcon={<Plus size={10} />}
          onAction={(f) => handleStage([f.path])}
          bulkCount={selectedUnstaged.length}
          onBulk={selectedUnstaged.length > 0 ? () => handleStage(selectedUnstaged) : undefined}
          stageAll={unstaged.length > 1}
          onStageAll={unstaged.length > 0 ? () => handleStage(unstaged.map((f) => f.path)) : undefined}
          disabled={loading}
        />
        {staged.length === 0 && unstaged.length === 0 && status && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 20, margin: "0 auto 12px",
              backgroundColor: "rgba(115,218,202,0.08)", border: "1px solid rgba(115,218,202,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CircleCheck size={20} style={{ color: "#73daca" }} />
            </div>
            <div style={{ fontSize: 13, color: "#a9b1d6", fontWeight: 500 }}>Working tree clean</div>
            <div style={{ fontSize: 11, color: "#414868", marginTop: 4 }}>No uncommitted changes</div>
          </div>
        )}
      </div>

      {/* Commit + push/pull */}
      <div style={{ borderTop: "1px solid #292e42", padding: "14px 18px 16px", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <textarea
            value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)}
            placeholder="Commit message..."
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) { e.preventDefault(); handleCommit(); } }}
            rows={2}
            style={{
              width: "100%", padding: "10px 12px",
              backgroundColor: "#16161e", border: "1px solid #292e42", borderRadius: 8,
              color: "#c0caf5", fontSize: 12, fontFamily: "inherit",
              outline: "none", resize: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
              lineHeight: 1.5,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#414868"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#292e42"; }}
          />
          {commitMsg.trim() && (
            <div style={{
              position: "absolute", bottom: 6, right: 8,
              fontSize: 9, color: "#414868", pointerEvents: "none",
            }}>
              ⌘↵
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
          <ActionButton onClick={handleCommit} disabled={loading || !commitMsg.trim() || staged.length === 0} primary>
            <Check size={13} /> Commit{staged.length > 0 ? ` (${staged.length})` : ""}
          </ActionButton>
          <div style={{ flex: 1 }} />
          <ActionButton onClick={handlePull} disabled={loading}>
            <ArrowDownToLine size={13} /> Pull
          </ActionButton>
          <ActionButton onClick={handlePush} disabled={loading}>
            <ArrowUpFromLine size={13} /> Push
          </ActionButton>
        </div>
      </div>
    </>
  );
}

// ─── Branches Tab ───────────────────────────────────────────

function BranchesTab({
  folder, currentBranch, onSwitched, setFeedback,
}: {
  folder: string;
  currentBranch: string;
  onSwitched: () => void;
  setFeedback: (f: { text: string; error?: boolean } | null) => void;
}) {
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    gitBranches(folder).then(setBranches).catch((e) => setFeedback({ text: String(e), error: true }));
  }, [folder, setFeedback]);

  const handleCheckout = async (name: string) => {
    setSwitching(name);
    setFeedback(null);
    try {
      const checkoutName = name.startsWith("origin/") ? name.replace(/^origin\//, "") : name;
      await gitCheckout(folder, checkoutName);
      setFeedback({ text: `Switched to ${checkoutName}` });
      onSwitched();
    } catch (e) {
      setFeedback({ text: String(e), error: true });
    } finally {
      setSwitching(null);
    }
  };

  const lowerFilter = filter.toLowerCase();
  const local = branches.filter((b) => !b.is_remote && b.name.toLowerCase().includes(lowerFilter));
  const remote = branches.filter((b) => b.is_remote && b.name.toLowerCase().includes(lowerFilter));

  return (
    <div style={{ padding: "12px 18px" }}>
      <input
        value={filter} onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter branches..."
        style={{
          width: "100%", padding: "8px 12px", marginBottom: 12,
          backgroundColor: "#16161e", border: "1px solid #292e42", borderRadius: 6,
          color: "#c0caf5", fontSize: 12, fontFamily: "inherit", outline: "none",
          boxSizing: "border-box", transition: "border-color 0.15s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#414868"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#292e42"; }}
      />

      {local.length > 0 && (
        <BranchGroup
          label="Local" branches={local} currentBranch={currentBranch}
          switching={switching} onCheckout={handleCheckout}
        />
      )}
      {remote.length > 0 && (
        <BranchGroup
          label="Remote" branches={remote} currentBranch={currentBranch}
          switching={switching} onCheckout={handleCheckout} isRemote
        />
      )}
      {local.length === 0 && remote.length === 0 && (
        <div style={{ color: "#565f89", fontSize: 12, padding: "24px 0", textAlign: "center" }}>
          No branches found
        </div>
      )}
    </div>
  );
}

function BranchGroup({
  label, branches, currentBranch, switching, onCheckout, isRemote,
}: {
  label: string;
  branches: GitBranchInfo[];
  currentBranch: string;
  switching: string | null;
  onCheckout: (name: string) => void;
  isRemote?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, color: "#565f89", fontWeight: 600, marginBottom: 5,
        display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: 0.5,
      }}>
        {isRemote ? <Globe size={10} /> : <GitBranch size={10} />}
        {label} ({branches.length})
      </div>
      <div style={{ borderRadius: 8, backgroundColor: "#16161e", border: "1px solid #292e42", overflow: "hidden" }}>
        {branches.map((b, i) => {
          const isCurrent = b.name === currentBranch || (b.is_remote && b.name === `origin/${currentBranch}`);
          const isLast = i === branches.length - 1;
          return (
            <div
              key={`${b.is_remote ? "r" : "l"}:${b.name}`}
              onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.backgroundColor = "#1e2030"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              style={{
                display: "flex", alignItems: "center", padding: "6px 12px", gap: 8,
                borderBottom: isLast ? "none" : "1px solid rgba(41,46,66,0.5)",
                fontSize: 12, cursor: isCurrent ? "default" : "pointer",
                transition: "background-color 0.1s",
              }}
              onClick={() => { if (!isCurrent && !switching) onCheckout(b.name); }}
            >
              {isCurrent ? (
                <Check size={12} style={{ color: "#73daca", flexShrink: 0 }} />
              ) : (
                <ChevronRight size={12} style={{ color: "#414868", flexShrink: 0 }} />
              )}
              <span style={{
                flex: 1, color: isCurrent ? "#73daca" : "#a9b1d6",
                fontWeight: isCurrent ? 600 : 400,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {b.name}
              </span>
              {switching === b.name && <Loader2 size={12} style={{ color: "#7aa2f7", animation: "spin 1s linear infinite" }} />}
              {isCurrent && (
                <span style={{
                  fontSize: 9, color: "#73daca",
                  border: "1px solid rgba(115,218,202,0.2)", borderRadius: 4,
                  padding: "1px 6px", backgroundColor: "rgba(115,218,202,0.06)",
                }}>
                  current
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Log Tab ────────────────────────────────────────────────

function LogTab({
  folder, setFeedback,
}: {
  folder: string;
  setFeedback: (f: { text: string; error?: boolean } | null) => void;
}) {
  const [entries, setEntries] = useState<GitLogEntry[]>([]);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    gitLog(folder, 80).then(setEntries).catch((e) => setFeedback({ text: String(e), error: true }));
  }, [folder, setFeedback]);

  const handleSelect = async (hash: string) => {
    if (selectedHash === hash) {
      setSelectedHash(null);
      setDiffText(null);
      return;
    }
    setSelectedHash(hash);
    setLoadingDiff(true);
    try {
      const text = await gitShow(folder, hash);
      setDiffText(text);
    } catch (e) {
      setDiffText(`Error: ${e}`);
    } finally {
      setLoadingDiff(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {entries.map((entry) => {
          const isSelected = selectedHash === entry.hash;
          return (
            <div key={entry.hash}>
              <div
                onClick={() => handleSelect(entry.hash)}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#1e2030"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                style={{
                  display: "flex", alignItems: "flex-start", padding: "8px 18px", gap: 10,
                  cursor: "pointer", transition: "background-color 0.1s",
                  backgroundColor: isSelected ? "#1e2030" : "transparent",
                  borderLeft: isSelected ? "2px solid #7aa2f7" : "2px solid transparent",
                }}
              >
                <GitCommitHorizontal size={13} style={{ color: "#414868", marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#c0caf5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.message}
                  </div>
                  <div style={{ fontSize: 10, color: "#565f89", marginTop: 2, display: "flex", gap: 8 }}>
                    <span style={{ color: "#7aa2f7" }}>{entry.short_hash}</span>
                    <span>{entry.author}</span>
                    <span>{entry.date}</span>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div style={{ backgroundColor: "#16161e", borderTop: "1px solid #292e42", borderBottom: "1px solid #292e42" }}>
                  {loadingDiff ? (
                    <div style={{ padding: "12px 18px", color: "#565f89", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Loading diff...
                    </div>
                  ) : (
                    <DiffView text={diffText ?? ""} />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {entries.length === 0 && (
          <div style={{ color: "#565f89", fontSize: 12, padding: "24px 0", textAlign: "center" }}>No commits</div>
        )}
      </div>
    </div>
  );
}

// ─── Diff Viewer ────────────────────────────────────────────

function DiffView({ text }: { text: string }) {
  const lines = text.split("\n");
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("diff --git") || lines[i].match(/^\s+\d+\s+file/)) {
      startIdx = i;
      break;
    }
  }

  return (
    <div style={{ maxHeight: 280, overflowY: "auto", fontSize: 11, lineHeight: 1.5 }}>
      {lines.slice(startIdx).map((line, i) => {
        let color = "#565f89";
        let bg = "transparent";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          color = "#73daca";
          bg = "rgba(115,218,202,0.06)";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          color = "#f7768e";
          bg = "rgba(247,118,142,0.06)";
        } else if (line.startsWith("@@")) {
          color = "#7aa2f7";
          bg = "rgba(122,162,247,0.06)";
        } else if (line.startsWith("diff --git")) {
          color = "#e0af68";
        }

        return (
          <div key={i} style={{ color, backgroundColor: bg, padding: "0 18px", whiteSpace: "pre", overflow: "hidden", textOverflow: "ellipsis" }}>
            {line || " "}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared sub-components ──────────────────────────────────

function HeaderBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#a9b1d6"; e.currentTarget.style.backgroundColor = "rgba(122,162,247,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "#565f89"; e.currentTarget.style.backgroundColor = "transparent"; }}
      style={{
        background: "none", border: "none", color: "#565f89", cursor: "pointer",
        padding: 5, display: "flex", alignItems: "center", borderRadius: 5,
        transition: "color 0.15s, background-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function ActionButton({ onClick, disabled, primary, children }: { onClick: () => void; disabled?: boolean; primary?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: primary ? "8px 16px" : "8px 12px",
        backgroundColor: primary ? "#7aa2f7" : "rgba(41,46,66,0.6)",
        border: primary ? "1px solid rgba(122,162,247,0.3)" : "1px solid #414868",
        borderRadius: 7,
        color: primary ? "#1a1b26" : "#a9b1d6",
        fontSize: 12, fontFamily: "inherit", fontWeight: primary ? 600 : 400,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "opacity 0.15s, filter 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function FileSection({
  title, icon, titleColor, files, selected, fileKey, onToggle,
  actionLabel, actionIcon, onAction, bulkCount, onBulk, stageAll, onStageAll, disabled,
}: {
  title: string; icon: React.ReactNode; titleColor: string; files: GitFileStatus[];
  selected: Set<string>; fileKey: (f: GitFileStatus) => string; onToggle: (key: string) => void;
  actionLabel: string; actionIcon: React.ReactNode; onAction: (f: GitFileStatus) => void;
  bulkCount: number; onBulk?: () => void; stageAll?: boolean; onStageAll?: () => void; disabled?: boolean;
}) {
  if (files.length === 0) return null;
  return (
    <div style={{ padding: "0 18px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 5, gap: 5 }}>
        <span style={{ color: titleColor, display: "flex", alignItems: "center" }}>{icon}</span>
        <span style={{ fontSize: 11, color: titleColor, fontWeight: 600, flex: 1 }}>
          {title} <span style={{ fontWeight: 400, color: "#565f89", marginLeft: 4 }}>{files.length}</span>
        </span>
        {stageAll && onStageAll && <SmallBtn onClick={onStageAll} disabled={disabled}>Stage All</SmallBtn>}
        {bulkCount > 0 && onBulk && <SmallBtn onClick={onBulk} disabled={disabled}>{actionLabel} {bulkCount}</SmallBtn>}
      </div>
      <div style={{ maxHeight: 160, overflowY: "auto", borderRadius: 8, backgroundColor: "#16161e", border: "1px solid #292e42", overflow: "hidden" }}>
        {files.map((f, i) => {
          const key = fileKey(f);
          return (
            <div key={key}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1e2030"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              style={{
                display: "flex", alignItems: "center", padding: "5px 12px",
                borderBottom: i === files.length - 1 ? "none" : "1px solid rgba(41,46,66,0.5)",
                fontSize: 12, gap: 8, transition: "background-color 0.1s",
              }}
            >
              <input type="checkbox" checked={selected.has(key)} onChange={() => onToggle(key)} style={{ margin: 0, accentColor: "#7aa2f7", flexShrink: 0 }} />
              <span style={{ color: statusColor(f.status), fontSize: 10, fontWeight: 700, minWidth: 14, textAlign: "center" }}>{f.status}</span>
              <span style={{ color: "#a9b1d6", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "rtl", textAlign: "left" }}>
                <bdi>{f.path}</bdi>
              </span>
              <SmallBtn onClick={() => onAction(f)} disabled={disabled}>{actionIcon} {actionLabel}</SmallBtn>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SmallBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = "#7aa2f7"; e.currentTarget.style.color = "#7aa2f7"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333750"; e.currentTarget.style.color = "#565f89"; }}
      style={{
        display: "flex", alignItems: "center", gap: 3,
        padding: "2px 7px", backgroundColor: "transparent",
        border: "1px solid #333750", borderRadius: 4,
        color: "#565f89", fontSize: 10, fontFamily: "inherit",
        cursor: disabled ? "default" : "pointer",
        transition: "border-color 0.15s, color 0.15s", flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function statusColor(s: string): string {
  switch (s) {
    case "M": return "#e0af68";
    case "A": return "#73daca";
    case "D": return "#f7768e";
    case "R": return "#7aa2f7";
    case "?": return "#565f89";
    default: return "#c0caf5";
  }
}
