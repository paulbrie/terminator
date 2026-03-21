import { useEffect, useRef, useState, useCallback } from "react";
import { debugSubject } from "subjecto/debug";
import { $workspaceStore } from "../../stores/useWorkspaceStore";
import { $agentStore } from "../../stores/useAgentStore";
import { pipeStore$ } from "../../stores/usePipeStore";
import {
  $uiFontSize,
  $termFontSize,
  $termFontFamily,
  $themeName,
} from "../../stores/useSettingsStore";

type DeepSubjectEntry = {
  name: string;
  store: { getValue: () => unknown; count: number; subscribe: (pattern: string, fn: () => void, opts?: { skipInitialCall?: boolean }) => { unsubscribe: () => void } };
};

type SubjectEntry = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subject: any;
};

const deepSubjects: DeepSubjectEntry[] = [
  { name: "workspace", store: $workspaceStore },
  { name: "agents", store: $agentStore },
  { name: "pipes", store: pipeStore$ },
];

const subjects: SubjectEntry[] = [
  { name: "uiFontSize", subject: $uiFontSize },
  { name: "termFontSize", subject: $termFontSize },
  { name: "termFontFamily", subject: $termFontFamily },
  { name: "themeName", subject: $themeName },
];

export function DebugBar() {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(250);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [deepValues, setDeepValues] = useState<Record<string, { value: unknown; count: number }>>({});
  const [subjectValues, setSubjectValues] = useState<Record<string, { value: unknown; count: number }>>({});
  const debugContainerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startY.current - e.clientY;
      setHeight(Math.max(100, Math.min(window.innerHeight * 0.8, startHeight.current + delta)));
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Subscribe to all DeepSubjects
  useEffect(() => {
    const handles: Array<{ unsubscribe: () => void }> = [];

    for (const ds of deepSubjects) {
      // Initial value
      setDeepValues((prev) => ({
        ...prev,
        [ds.name]: { value: ds.store.getValue(), count: ds.store.count },
      }));

      const handle = ds.store.subscribe("**", () => {
        setDeepValues((prev) => ({
          ...prev,
          [ds.name]: { value: ds.store.getValue(), count: ds.store.count },
        }));
      }, { skipInitialCall: true });
      handles.push(handle);
    }

    return () => handles.forEach((h) => h.unsubscribe());
  }, []);

  // Subscribe to all Subjects
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    for (const s of subjects) {
      setSubjectValues((prev) => ({
        ...prev,
        [s.name]: { value: s.subject.getValue(), count: (s.subject as any).count ?? 0 },
      }));

      const handle = s.subject.subscribe((val: unknown) => {
        setSubjectValues((prev) => ({
          ...prev,
          [s.name]: { value: val, count: (s.subject as any).count ?? 0 },
        }));
      });
      unsubs.push(() => handle.unsubscribe());
    }

    return () => unsubs.forEach((fn) => fn());
  }, []);

  // Mount debugSubject when a Subject is selected
  useEffect(() => {
    if (!debugContainerRef.current || !selectedSubject) return;

    const subjectEntry = subjects.find((s) => s.name === selectedSubject);
    if (!subjectEntry) return;

    debugContainerRef.current.innerHTML = "";
    const cleanup = debugSubject(subjectEntry.subject, debugContainerRef.current, {
      darkMode: true,
      title: subjectEntry.name,
    });

    return cleanup;
  }, [selectedSubject]);

  const handleSelect = useCallback((name: string) => {
    setSelectedSubject((prev) => (prev === name ? null : name));
  }, []);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 8,
          zIndex: 9999,
          background: "#1e1e2e",
          border: "1px solid #f7768e80",
          color: "#f7768e",
          fontSize: 10,
          fontFamily: "monospace",
          padding: "2px 8px",
          borderRadius: 4,
          cursor: "pointer",
          opacity: 0.7,
        }}
      >
        DBG
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#1e1e2e",
        borderTop: "2px solid #f7768e80",
        fontFamily: "monospace",
        fontSize: 11,
        color: "#cdd6f4",
        height,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={(e) => {
          dragging.current = true;
          startY.current = e.clientY;
          startHeight.current = height;
        }}
        style={{
          height: 4,
          cursor: "ns-resize",
          backgroundColor: "transparent",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = "#f7768e40"; }}
        onMouseLeave={(e) => { if (!dragging.current) (e.target as HTMLElement).style.backgroundColor = "transparent"; }}
      />
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          borderBottom: "1px solid #292e42",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#f7768e", fontWeight: "bold" }}>
          Subjecto Debug
        </span>
        <button
          onClick={() => { setExpanded(false); setSelectedSubject(null); }}
          style={{
            background: "none",
            border: "none",
            color: "#565f89",
            cursor: "pointer",
            fontSize: 14,
            padding: "0 4px",
          }}
        >
          x
        </button>
      </div>

      {/* Subject list */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "4px 8px",
          borderBottom: "1px solid #292e42",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {/* DeepSubjects */}
        {deepSubjects.map((ds) => {
          const info = deepValues[ds.name];
          return (
            <button
              key={ds.name}
              onClick={() => handleSelect(ds.name)}
              style={{
                background: selectedSubject === ds.name ? "#7aa2f720" : "none",
                border: `1px solid ${selectedSubject === ds.name ? "#7aa2f7" : "#292e42"}`,
                color: "#bb9af7",
                fontSize: 11,
                fontFamily: "monospace",
                padding: "2px 8px",
                cursor: "pointer",
                borderRadius: 3,
                marginRight: 4,
                marginBottom: 2,
              }}
            >
              <span style={{ color: "#565f89", marginRight: 4 }}>DS</span>
              {ds.name}
              {info && (
                <span style={{ color: "#565f89", marginLeft: 4 }}>
                  #{info.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Subjects */}
        {subjects.map((s) => {
          const info = subjectValues[s.name];
          return (
            <button
              key={s.name}
              onClick={() => handleSelect(s.name)}
              style={{
                background: selectedSubject === s.name ? "#7aa2f720" : "none",
                border: `1px solid ${selectedSubject === s.name ? "#7aa2f7" : "#292e42"}`,
                color: "#7dcfff",
                fontSize: 11,
                fontFamily: "monospace",
                padding: "2px 8px",
                cursor: "pointer",
                borderRadius: 3,
                marginRight: 4,
                marginBottom: 2,
              }}
            >
              <span style={{ color: "#565f89", marginRight: 4 }}>S</span>
              {s.name}
              {info && (
                <span style={{ color: "#565f89", marginLeft: 4 }}>
                  = {String(info.value).slice(0, 20)} #{info.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {selectedSubject && subjects.find((s) => s.name === selectedSubject) && (
          <div ref={debugContainerRef} style={{ padding: 4 }} />
        )}

        {selectedSubject && deepSubjects.find((ds) => ds.name === selectedSubject) && (
          <DeepSubjectViewer
            name={selectedSubject}
            info={deepValues[selectedSubject]}
          />
        )}

        {!selectedSubject && (
          <div style={{ padding: 8, color: "#565f89" }}>
            Click a subject above to inspect it.{" "}
            <span style={{ color: "#bb9af7" }}>DS</span> = DeepSubject,{" "}
            <span style={{ color: "#7dcfff" }}>S</span> = Subject
          </div>
        )}
      </div>
    </div>
  );
}

function DeepSubjectViewer({ name, info }: { name: string; info?: { value: unknown; count: number } }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (!info) return null;

  const toggleKey = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ padding: "4px 8px" }}>
      <div style={{ color: "#565f89", marginBottom: 4 }}>
        DeepSubject: <span style={{ color: "#bb9af7" }}>{name}</span> | updates: {info.count}
      </div>
      <div style={{ maxHeight: "35vh", overflow: "auto" }}>
        <JsonTree data={info.value} path="" collapsed={collapsed} toggleKey={toggleKey} depth={0} />
      </div>
    </div>
  );
}

function JsonTree({
  data,
  path,
  collapsed,
  toggleKey,
  depth,
}: {
  data: unknown;
  path: string;
  collapsed: Record<string, boolean>;
  toggleKey: (key: string) => void;
  depth: number;
}) {
  if (data === null || data === undefined) {
    return <span style={{ color: "#565f89" }}>{String(data)}</span>;
  }

  if (typeof data !== "object") {
    const color =
      typeof data === "string" ? "#9ece6a" :
      typeof data === "number" ? "#ff9e64" :
      typeof data === "boolean" ? "#f7768e" : "#cdd6f4";
    return <span style={{ color }}>{JSON.stringify(data)}</span>;
  }

  const isArray = Array.isArray(data);
  const entries = isArray
    ? (data as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(data as Record<string, unknown>);
  const isCollapsed = collapsed[path] ?? depth > 1;
  const bracket = isArray ? ["[", "]"] : ["{", "}"];

  return (
    <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      <span
        onClick={() => toggleKey(path)}
        style={{ cursor: "pointer", userSelect: "none", color: "#565f89" }}
      >
        {isCollapsed ? "+" : "-"} {bracket[0]}
        {isCollapsed && (
          <span style={{ color: "#565f89" }}>
            {" "}{entries.length} items{" "}{bracket[1]}
          </span>
        )}
      </span>
      {!isCollapsed && (
        <>
          {entries.map(([key, val]) => {
            const childPath = path ? `${path}/${key}` : key;
            return (
              <div key={key} style={{ marginLeft: 12 }}>
                <span style={{ color: "#7aa2f7" }}>{key}</span>
                <span style={{ color: "#565f89" }}>: </span>
                <JsonTree
                  data={val}
                  path={childPath}
                  collapsed={collapsed}
                  toggleKey={toggleKey}
                  depth={depth + 1}
                />
              </div>
            );
          })}
          <div>
            <span style={{ color: "#565f89" }}>{bracket[1]}</span>
          </div>
        </>
      )}
    </div>
  );
}
