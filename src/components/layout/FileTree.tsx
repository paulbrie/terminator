import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, File, FolderOpen, FolderClosed, Files } from "lucide-react";
import { readDirectory, type DirEntry } from "../../lib/tauri-commands";
import { openFileInEditor } from "../../stores/useWorkspaceStore";

interface FileTreeProps {
  folder: string;
}

export function FileTree({ folder }: FileTreeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ marginTop: 2 }}>
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex", alignItems: "center", padding: "4px 10px 4px 28px",
          gap: 6, fontSize: 13, fontFamily: "monospace", color: "#565f89",
          cursor: "pointer", userSelect: "none",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1a1b26"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Files size={12} />
        <span style={{ fontWeight: 500 }}>Files</span>
      </div>
      {expanded && (
        <DirectoryContents path={folder} depth={0} />
      )}
    </div>
  );
}

function DirectoryContents({ path, depth }: { path: string; depth: number }) {
  const [entries, setEntries] = useState<DirEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    readDirectory(path, true)
      .then((e) => { setEntries(e); setLoaded(true); })
      .catch((e) => { setError(String(e)); setLoaded(true); });
  }

  if (error) {
    return (
      <div style={{ padding: "3px 10px", paddingLeft: 32 + depth * 16, fontSize: 13, color: "#f7768e", fontFamily: "monospace" }}>
        {error}
      </div>
    );
  }

  if (!entries) {
    return (
      <div style={{ padding: "3px 10px", paddingLeft: 32 + depth * 16, fontSize: 13, color: "#414868", fontFamily: "monospace" }}>
        ...
      </div>
    );
  }

  return (
    <>
      {entries.map((entry) => (
        <TreeEntry key={entry.path} entry={entry} depth={depth} />
      ))}
    </>
  );
}

function TreeEntry({ entry, depth }: { entry: DirEntry; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const paddingLeft = 32 + depth * 16;

  const handleClick = useCallback(() => {
    if (entry.is_dir) {
      setExpanded((v) => !v);
    } else {
      openFileInEditor(entry.path);
    }
  }, [entry]);

  const iconColor = entry.is_dir ? "#e0af68" : extColor(entry.extension);

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          display: "flex", alignItems: "center",
          padding: "3px 10px", paddingLeft,
          gap: 5, fontSize: 13, fontFamily: "monospace",
          color: entry.is_dir ? "#a9b1d6" : "#8c93b0",
          cursor: "pointer", userSelect: "none",
          transition: "background-color 0.1s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1e2030"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        {entry.is_dir ? (
          <>
            {expanded ? <ChevronDown size={12} style={{ color: "#565f89", flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: "#565f89", flexShrink: 0 }} />}
            {expanded ? <FolderOpen size={14} style={{ color: iconColor, flexShrink: 0 }} /> : <FolderClosed size={14} style={{ color: iconColor, flexShrink: 0 }} />}
          </>
        ) : (
          <>
            <span style={{ width: 12, flexShrink: 0 }} />
            <File size={14} style={{ color: iconColor, flexShrink: 0 }} />
          </>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.name}
        </span>
      </div>
      {entry.is_dir && expanded && (
        <DirectoryContents path={entry.path} depth={depth + 1} />
      )}
    </>
  );
}

function extColor(ext: string | null): string {
  switch (ext) {
    case "ts": case "tsx": return "#7aa2f7";
    case "js": case "jsx": return "#e0af68";
    case "rs": return "#ff9e64";
    case "json": return "#9ece6a";
    case "css": case "scss": return "#bb9af7";
    case "html": return "#f7768e";
    case "md": return "#73daca";
    case "py": return "#7aa2f7";
    case "go": return "#73daca";
    case "toml": case "yaml": case "yml": return "#e0af68";
    default: return "#565f89";
  }
}
