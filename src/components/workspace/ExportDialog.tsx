import { useState } from "react";
import { exportOutput } from "../../lib/tauri-commands";

interface ExportDialogProps {
  content: string;
  defaultName: string;
  onClose: () => void;
}

export function ExportDialog({ content, defaultName, onClose }: ExportDialogProps) {
  const [path, setPath] = useState(`${defaultName}.txt`);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const handleExport = async () => {
    if (!path.trim()) return;
    setStatus("saving");
    try {
      // Expand ~ to home dir
      const expandedPath = path.startsWith("~/")
        ? path // Rust will handle this, or we use absolute
        : path;
      await exportOutput(expandedPath, content);
      setStatus("done");
      setTimeout(onClose, 800);
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleExport();
          if (e.key === "Escape") onClose();
        }}
        style={{
          backgroundColor: "#1a1b26",
          border: "1px solid #292e42",
          borderRadius: 8,
          padding: 20,
          width: 400,
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#c0caf5" }}>
          Export Output
        </h3>

        <p style={{ fontSize: 15, color: "#565f89", margin: "0 0 12px" }}>
          {content.length.toLocaleString()} characters of terminal output
        </p>

        <label
          style={{
            fontSize: 15,
            color: "#565f89",
            fontFamily: "monospace",
            display: "block",
            marginBottom: 4,
          }}
        >
          File path
        </label>
        <input
          autoFocus
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/path/to/output.txt"
          style={{
            width: "100%",
            padding: "6px 8px",
            backgroundColor: "#16161e",
            border: "1px solid #292e42",
            borderRadius: 4,
            color: "#a9b1d6",
            fontSize: 15,
            fontFamily: "monospace",
            outline: "none",
          }}
        />

        {status === "error" && (
          <p style={{ fontSize: 15, color: "#f7768e", margin: "8px 0 0" }}>
            {error}
          </p>
        )}

        {status === "done" && (
          <p style={{ fontSize: 15, color: "#9ece6a", margin: "8px 0 0" }}>
            Exported successfully!
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button onClick={onClose} style={btnStyle}>
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={status === "saving"}
            style={{
              ...btnStyle,
              backgroundColor: "#7aa2f7",
              color: "#1a1b26",
              fontWeight: 600,
            }}
          >
            {status === "saving" ? "Saving..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 16px",
  backgroundColor: "transparent",
  border: "1px solid #292e42",
  borderRadius: 4,
  color: "#a9b1d6",
  fontSize: 15,
  fontFamily: "monospace",
  cursor: "pointer",
};
