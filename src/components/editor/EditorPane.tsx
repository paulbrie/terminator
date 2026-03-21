import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Save, X, FileCode } from "lucide-react";
import { readFile, writeFile } from "../../lib/tauri-commands";
import { closeEditorPane, setEditorDirty, useEditorPane } from "../../stores/useWorkspaceStore";
import { getLanguageFromPath } from "../../lib/language-map";

interface EditorPaneProps {
  paneId: string;
  filePath: string;
}

export function EditorPane({ paneId, filePath }: EditorPaneProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<any>(null);
  const info = useEditorPane(paneId);
  const isDirty = info?.dirty ?? false;

  const language = getLanguageFromPath(filePath);
  const fileName = filePath.split("/").pop() ?? filePath;

  useEffect(() => {
    readFile(filePath)
      .then(setContent)
      .catch((e) => setError(String(e)));
  }, [filePath]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    const value = editorRef.current.getValue();
    setSaving(true);
    try {
      await writeFile(filePath, value);
      setEditorDirty(paneId, false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }, [filePath, paneId]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define Tokyo Night theme
    monaco.editor.defineTheme("tokyo-night", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "565f89", fontStyle: "italic" },
        { token: "keyword", foreground: "bb9af7" },
        { token: "string", foreground: "9ece6a" },
        { token: "number", foreground: "ff9e64" },
        { token: "type", foreground: "2ac3de" },
        { token: "function", foreground: "7aa2f7" },
        { token: "variable", foreground: "c0caf5" },
        { token: "operator", foreground: "89ddff" },
      ],
      colors: {
        "editor.background": "#1a1b26",
        "editor.foreground": "#c0caf5",
        "editor.lineHighlightBackground": "#1e2030",
        "editor.selectionBackground": "#515c7e40",
        "editorCursor.foreground": "#c0caf5",
        "editorLineNumber.foreground": "#3b4261",
        "editorLineNumber.activeForeground": "#737aa2",
        "editor.inactiveSelectionBackground": "#515c7e20",
        "editorIndentGuide.background": "#292e42",
        "editorIndentGuide.activeBackground": "#414868",
        "editorWidget.background": "#1a1b26",
        "editorWidget.border": "#292e42",
        "editorSuggestWidget.background": "#1a1b26",
        "editorSuggestWidget.border": "#292e42",
        "editorSuggestWidget.selectedBackground": "#292e42",
      },
    });
    monaco.editor.setTheme("tokyo-night");

    // Intercept Cmd+S for save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  const handleChange = (value: string | undefined) => {
    if (!isDirty && value !== undefined) {
      setEditorDirty(paneId, true);
    }
  };

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#1a1b26" }}>
        <EditorHeader fileName={fileName} dirty={false} saving={false} onSave={handleSave} onClose={() => closeEditorPane(paneId)} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#f7768e", fontSize: 12, fontFamily: "monospace", padding: 20 }}>
          {error}
        </div>
      </div>
    );
  }

  if (content === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#1a1b26" }}>
        <EditorHeader fileName={fileName} dirty={false} saving={false} onSave={handleSave} onClose={() => closeEditorPane(paneId)} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#565f89", fontSize: 12, fontFamily: "monospace" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#1a1b26" }}>
      <EditorHeader fileName={fileName} dirty={isDirty} saving={saving} onSave={handleSave} onClose={() => closeEditorPane(paneId)} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          defaultValue={content}
          language={language}
          onMount={handleMount}
          onChange={handleChange}
          options={{
            fontSize: 13,
            fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 8 },
            lineNumbers: "on",
            renderLineHighlight: "line",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalScrollbarSize: 6 },
            wordWrap: "on",
          }}
          theme="tokyo-night"
        />
      </div>
    </div>
  );
}

function EditorHeader({
  fileName, dirty, saving, onSave, onClose,
}: {
  fileName: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 8px",
        backgroundColor: "#16161e",
        borderBottom: "1px solid #292e42",
        minHeight: 28,
        userSelect: "none",
        gap: 6,
      }}
    >
      <FileCode size={13} style={{ color: "#7aa2f7", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "#c0caf5", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {fileName}
        {dirty && <span style={{ color: "#e0af68", marginLeft: 4 }}>*</span>}
      </span>
      <button
        onClick={onSave}
        disabled={!dirty || saving}
        title="Save (⌘S)"
        style={{
          background: "none", border: "none", cursor: dirty ? "pointer" : "default",
          color: dirty ? "#7aa2f7" : "#414868", padding: "0 4px",
          display: "flex", alignItems: "center", transition: "color 0.15s",
        }}
      >
        <Save size={14} />
      </button>
      <button
        onClick={onClose}
        title="Close"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#565f89", padding: "0 4px",
          display: "flex", alignItems: "center",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#a9b1d6"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#565f89"; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
