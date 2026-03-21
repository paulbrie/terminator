import { useState, useRef, useEffect, useCallback } from "react";
import {
  FolderOpen,
  FolderClosed,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Bot,
  PanelLeftClose,
  Palette,
  GripVertical,
  CheckSquare,
  Square,
  ListTodo,
  FolderSymlink,
  Loader2,
  Play,
  MonitorUp,
} from "lucide-react";
import {
  useProjects,
  useActivePaneId,
  getAllPaneIdsAcrossTabs,
  setActivePane,
  createProject,
  renameProject,
  deleteProject,
  addPaneToProject,
  removePaneFromProject,
  toggleSidebar,
  setProjectFolder,
  setProjectDefaultCommand,
  setProjectDefaultBgColor,
  addTask,
  addTab,
  toggleTask,
  deleteTask,
  detachProjectToWindow,
} from "../../stores/useWorkspaceStore";
import { useAgents, createAgent } from "../../stores/useAgentStore";
import { createAgentConfig, AGENT_ICONS } from "../../lib/agent-registry";
import { GitModal } from "../workspace/GitModal";
import { FileTree } from "./FileTree";

const agentIcons = AGENT_ICONS;

// ── Pointer-based drag ──
// We use refs to avoid stale closures in window-level event handlers.
interface DragInfo {
  paneId: string;
  label: string;
  startY: number;
  active: boolean;
}

export function ProjectSidebar() {
  const projects = useProjects();
  const activePaneId = useActivePaneId();
  const agents = useAgents();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const resizingRef = useRef(false);

  // Drag state — use refs for event handlers, state for rendering
  const dragRef = useRef<DragInfo | null>(null);
  const [dragRender, setDragRender] = useState<{ x: number; y: number; label: string; paneId: string } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | "ungrouped" | null>(null);
  const dropTargetRef = useRef<string | "ungrouped" | null>(null);
  const dropZonesRef = useRef<Map<string | "ungrouped", HTMLDivElement>>(new Map());
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewInput) newInputRef.current?.focus();
  }, [showNewInput]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  // Only show panes that have an active agent
  const allPaneIds = getAllPaneIdsAcrossTabs().filter((id) => !!agents[id]);
  const assignedPaneIds = new Set(projects.flatMap((p) => p.paneIds));
  const ungroupedPaneIds = allPaneIds.filter((id) => !assignedPaneIds.has(id));

  const toggleCollapse = (id: string) =>
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const handleCreateProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    createProject(name);
    setNewProjectName("");
    setShowNewInput(false);
  };

  const handleStartRename = (projectId: string, currentName: string) => {
    setEditingId(projectId);
    setEditingName(currentName);
  };

  const handleFinishRename = () => {
    if (editingId && editingName.trim()) {
      renameProject(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const registerDropZone = useCallback((id: string | "ungrouped", el: HTMLDivElement | null) => {
    if (el) dropZonesRef.current.set(id, el);
    else dropZonesRef.current.delete(id);
  }, []);

  // Hit-test which drop zone the pointer is over
  const hitTestDropZone = useCallback((x: number, y: number): string | "ungrouped" | null => {
    for (const [id, el] of dropZonesRef.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return id;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (!drag.active && Math.abs(e.clientY - drag.startY) > 4) {
        drag.active = true;
        document.body.style.userSelect = "none";
        document.body.style.webkitUserSelect = "none";
      }

      if (drag.active) {
        setDragRender({ x: e.clientX, y: e.clientY, label: drag.label, paneId: drag.paneId });
        const target = hitTestDropZone(e.clientX, e.clientY);
        dropTargetRef.current = target;
        setDropTargetId(target);
      }
    };

    const onPointerUp = () => {
      const drag = dragRef.current;
      const target = dropTargetRef.current;

      if (drag?.active && target !== null) {
        if (target === "ungrouped") {
          for (const p of projectsRef.current) {
            if (p.paneIds.includes(drag.paneId)) {
              removePaneFromProject(p.id, drag.paneId);
            }
          }
        } else {
          addPaneToProject(target, drag.paneId);
          setCollapsed((c) => ({ ...c, [target]: false }));
        }
      }

      dragRef.current = null;
      dropTargetRef.current = null;
      setDragRender(null);
      setDropTargetId(null);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [hitTestDropZone]);

  const startDrag = useCallback((paneId: string, label: string, startY: number) => {
    dragRef.current = { paneId, label, startY, active: false };
  }, []);

  const isDropping = (id: string | "ungrouped") => dragRender !== null && dropTargetId === id;

  // Sidebar resize handlers
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const onMove = (ev: PointerEvent) => {
      if (resizingRef.current) {
        setSidebarWidth(Math.max(160, Math.min(500, ev.clientX)));
      }
    };
    const onUp = () => {
      resizingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  return (
    <div
      style={{
        width: sidebarWidth,
        flexShrink: 0,
        backgroundColor: "#16161e",
        display: "flex",
        overflow: "hidden",
        userSelect: "none",
        position: "relative",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #292e42" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 10px",
          borderBottom: "1px solid #292e42",
          gap: 6,
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            color: "#565f89",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Projects
        </span>
        <SidebarBtn title="New project" onClick={() => setShowNewInput(true)}>
          <Plus size={14} />
        </SidebarBtn>
        <SidebarBtn title="Close sidebar (⌘B)" onClick={() => toggleSidebar()}>
          <PanelLeftClose size={14} />
        </SidebarBtn>
      </div>

      {/* Scrollable tree */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {/* New project input */}
        {showNewInput && (
          <div style={{ padding: "4px 10px" }}>
            <input
              ref={newInputRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
                if (e.key === "Escape") setShowNewInput(false);
              }}
              onBlur={() => {
                if (newProjectName.trim()) handleCreateProject();
                else setShowNewInput(false);
              }}
              placeholder="Project name..."
              style={{
                width: "100%",
                background: "#1a1b26",
                border: "1px solid #7aa2f7",
                borderRadius: 4,
                padding: "3px 6px",
                fontSize: 14,
                fontFamily: "monospace",
                color: "#c0caf5",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Project entries */}
        {projects.map((project) => {
          const isCollapsed = collapsed[project.id];
          const color = project.color || "#565f89";
          const livePaneIds = project.paneIds.filter((id) => allPaneIds.includes(id));
          const dropping = isDropping(project.id);

          return (
            <div
              key={project.id}
              ref={(el) => registerDropZone(project.id, el)}
              style={{
                backgroundColor: dropping ? "rgba(122,162,247,0.12)" : "transparent",
                borderRadius: 4,
                transition: "background-color 0.15s",
                border: dropping ? "1px dashed rgba(122,162,247,0.4)" : "1px dashed transparent",
              }}
            >
              {/* Project header */}
              <div
                onClick={() => toggleCollapse(project.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 10px",
                  cursor: "pointer",
                  gap: 5,
                  fontSize: 14,
                  fontFamily: "monospace",
                  color: "#c0caf5",
                }}
                onMouseEnter={(e) => {
                  if (!dropping) (e.currentTarget as HTMLElement).style.backgroundColor = "#1a1b26";
                }}
                onMouseLeave={(e) => {
                  if (!dropping) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                {isCollapsed ? (
                  <ChevronRight size={12} style={{ color: "#565f89", flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={12} style={{ color: "#565f89", flexShrink: 0 }} />
                )}
                {isCollapsed ? (
                  <FolderClosed size={14} style={{ color, flexShrink: 0 }} />
                ) : (
                  <FolderOpen size={14} style={{ color, flexShrink: 0 }} />
                )}

                {editingId === project.id ? (
                  <input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFinishRename();
                      if (e.key === "Escape") setEditingId(null);
                      e.stopPropagation();
                    }}
                    onBlur={handleFinishRename}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      background: "#1a1b26",
                      border: "1px solid #7aa2f7",
                      borderRadius: 3,
                      padding: "1px 4px",
                      fontSize: 14,
                      fontFamily: "monospace",
                      color: "#c0caf5",
                      outline: "none",
                      minWidth: 0,
                    }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(project.id, project.name);
                    }}
                  >
                    {project.name}
                  </span>
                )}

                {project.defaultCommand && (
                  <SidebarBtn
                    title={`Run: ${project.defaultCommand}`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const config = createAgentConfig("shell");
                      config.label = project.defaultCommand!.split(/\s/)[0];
                      const session = await createAgent(config);
                      addTab(session.id);
                      const s = (await import("../../stores/useWorkspaceStore")).$workspaceStore.getValue();
                      const proj = s.projects.find((p) => p.id === project.id);
                      if (proj) proj.paneIds.push(session.id);
                      setTimeout(async () => {
                        const { $agentStore } = await import("../../stores/useAgentStore");
                        const agent = $agentStore.getValue().agents[session.id];
                        if (agent?.backendId) {
                          const { sendInput } = await import("../../lib/tauri-commands");
                          const cmd = project.folder
                            ? `cd ${JSON.stringify(project.folder)} && ${project.defaultCommand}\n`
                            : `${project.defaultCommand}\n`;
                          sendInput(agent.backendId, cmd).catch(() => {});
                        }
                      }, 500);
                    }}
                  >
                    <Play size={12} style={{ color: "#9ece6a" }} />
                  </SidebarBtn>
                )}
                <SidebarBtn
                  title="Start Claude session"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const config = createAgentConfig("shell");
                    config.label = "Claude";
                    const session = await createAgent(config);
                    addTab(session.id);
                    // Don't call addPaneToProject here — it would send a cd
                    // Instead, manually add to project without triggering cd
                    const s = (await import("../../stores/useWorkspaceStore")).$workspaceStore.getValue();
                    const proj = s.projects.find((p) => p.id === project.id);
                    if (proj) proj.paneIds.push(session.id);
                    // Wait for shell, then cd + claude
                    setTimeout(async () => {
                      const { $agentStore } = await import("../../stores/useAgentStore");
                      const agent = $agentStore.getValue().agents[session.id];
                      if (agent?.backendId) {
                        const { sendInput } = await import("../../lib/tauri-commands");
                        const cmd = project.folder
                          ? `cd ${JSON.stringify(project.folder)} && claude\n`
                          : `claude\n`;
                        sendInput(agent.backendId, cmd).catch(() => {});
                      }
                    }, 500);
                  }}
                >
                  <Bot size={12} style={{ color: "#bb9af7" }} />
                </SidebarBtn>
                <span style={{ fontSize: 14, color: "#565f89", flexShrink: 0 }}>
                  {livePaneIds.length}
                </span>
                <SidebarBtn
                  title="Detach project to new window"
                  onClick={(e) => {
                    e.stopPropagation();
                    detachProjectToWindow(project.id);
                  }}
                >
                  <MonitorUp size={12} />
                </SidebarBtn>
                <SidebarBtn
                  title="Delete project"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                >
                  <Trash2 size={12} />
                </SidebarBtn>
              </div>

              {/* Project folder & command */}
              {!isCollapsed && (
                <>
                  <ProjectFolder projectId={project.id} folder={project.folder} />
                  <ProjectDefaultCommand projectId={project.id} command={project.defaultCommand} />
                  <ProjectDefaultBgColor projectId={project.id} color={project.defaultBgColor} />
                  {project.folder && <FileTree folder={project.folder} />}
                </>
              )}

              {/* Pane children */}
              {!isCollapsed && (
                <div>
                  {livePaneIds.map((paneId) => (
                    <PaneEntry
                      key={paneId}
                      paneId={paneId}
                      agent={agents[paneId]}
                      isActive={activePaneId === paneId}
                      indent={28}
                      onStartDrag={startDrag}
                      isDragging={dragRender?.paneId === paneId}
                    />
                  ))}
                  {livePaneIds.length === 0 && (
                    <div
                      style={{
                        padding: "6px 10px 6px 30px",
                        fontSize: 14,
                        color: "#414868",
                        fontFamily: "monospace",
                        fontStyle: "italic",
                      }}
                    >
                      Drop terminals here
                    </div>
                  )}
                </div>
              )}

              {/* Tasks section */}
              {!isCollapsed && <ProjectTasks projectId={project.id} tasks={project.tasks ?? []} />}
            </div>
          );
        })}

        {/* Ungrouped section */}
        <div
          ref={(el) => registerDropZone("ungrouped", el)}
          style={{
            backgroundColor: isDropping("ungrouped") ? "rgba(122,162,247,0.12)" : "transparent",
            borderRadius: 4,
            transition: "background-color 0.15s",
            minHeight: 30,
            border: isDropping("ungrouped") ? "1px dashed rgba(122,162,247,0.4)" : "1px dashed transparent",
          }}
        >
          <div
            style={{
              padding: "10px 10px 4px",
              fontSize: 14,
              fontWeight: 600,
              color: "#414868",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Ungrouped
          </div>
          {ungroupedPaneIds.map((paneId) => (
            <PaneEntry
              key={paneId}
              paneId={paneId}
              agent={agents[paneId]}
              isActive={activePaneId === paneId}
              indent={10}
              onStartDrag={startDrag}
              isDragging={dragRender?.paneId === paneId}
            />
          ))}
          {ungroupedPaneIds.length === 0 && (
            <div
              style={{
                padding: "6px 10px",
                fontSize: 14,
                color: "#414868",
                fontFamily: "monospace",
                fontStyle: "italic",
              }}
            >
              No ungrouped terminals
            </div>
          )}
        </div>
      </div>

      </div>

      {/* Resize handle */}
      <div
        onPointerDown={handleResizeStart}
        style={{
          width: 5,
          cursor: "col-resize",
          flexShrink: 0,
          backgroundColor: "transparent",
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#7aa2f740"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
      />

      {/* Floating drag indicator */}
      {dragRender && (
        <div
          style={{
            position: "fixed",
            left: dragRender.x + 12,
            top: dragRender.y - 10,
            padding: "3px 8px",
            background: "#292e42",
            color: "#c0caf5",
            fontSize: 14,
            fontFamily: "monospace",
            borderRadius: 4,
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            border: "1px solid #3b3f54",
            whiteSpace: "nowrap",
          }}
        >
          {dragRender.label}
        </div>
      )}
    </div>
  );
}

function PaneEntry({
  paneId,
  agent,
  isActive,
  indent,
  onStartDrag,
  isDragging,
}: {
  paneId: string;
  agent: any;
  isActive: boolean;
  indent: number;
  onStartDrag: (paneId: string, label: string, startY: number) => void;
  isDragging?: boolean;
}) {
  const Icon = agent ? agentIcons[agent.config.agent_type as keyof typeof agentIcons] || AGENT_ICONS.shell : AGENT_ICONS.shell;
  const label = agent?.config.label || paneId;

  return (
    <div
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        onStartDrag(paneId, label, e.clientY);
      }}
      onClick={() => {
        // Only focus if not dragging
        if (!isDragging) setActivePane(paneId);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        padding: `4px 10px 4px ${indent}px`,
        cursor: "grab",
        gap: 6,
        fontSize: 14,
        fontFamily: "monospace",
        color: isActive ? "#7aa2f7" : "#a9b1d6",
        backgroundColor: isActive ? "rgba(122,162,247,0.08)" : "transparent",
        opacity: isDragging ? 0.4 : 1,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#1a1b26";
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      <GripVertical size={11} style={{ color: "#414868", flexShrink: 0 }} />
      {agent?.ptyActivity === "busy" ? (
        <Loader2 size={13} style={{ flexShrink: 0, color: "#e0af68", animation: "spin 1s linear infinite" }} />
      ) : (
        <Icon size={13} style={{ flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}

function ProjectFolder({ projectId, folder }: { projectId: string; folder?: string }) {
  const [branch, setBranch] = useState<string | null>(null);
  const [showGit, setShowGit] = useState(false);

  useEffect(() => {
    if (!folder) { setBranch(null); return; }
    let cancelled = false;
    import("../../lib/tauri-commands").then(({ getGitBranch }) =>
      getGitBranch(folder).then((b) => { if (!cancelled) setBranch(b); })
    ).catch(() => { if (!cancelled) setBranch(null); });
    // Refresh branch periodically (every 10s)
    const interval = setInterval(() => {
      import("../../lib/tauri-commands").then(({ getGitBranch }) =>
        getGitBranch(folder).then((b) => { if (!cancelled) setBranch(b); })
      ).catch(() => {});
    }, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [folder]);

  const handleSetFolder = async () => {
    const { pickFolder } = await import("../../lib/tauri-commands");
    const path = await pickFolder();
    if (path !== null) {
      setProjectFolder(projectId, path || null);
    }
  };

  return (
    <>
      <div
        onClick={handleSetFolder}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 10px 4px 30px",
          gap: 6,
          fontSize: 14,
          fontFamily: "monospace",
          color: folder ? "#73daca" : "#414868",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1a1b26"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
        title={folder || "Set project folder"}
      >
        <FolderSymlink size={12} style={{ flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {folder ? folder.replace(/^.*\//, "") : "Set folder..."}
        </span>
        {branch && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setShowGit(true);
            }}
            style={{
              color: "#7aa2f7",
              fontSize: 14,
              flexShrink: 0,
              cursor: "pointer",
              padding: "1px 4px",
              borderRadius: 3,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(122,162,247,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            title="Open Git manager"
          >
            {branch}
          </span>
        )}
      </div>
      {showGit && folder && (
        <GitModal folder={folder} onClose={() => setShowGit(false)} />
      )}
    </>
  );
}

function ProjectDefaultCommand({ projectId, command }: { projectId: string; command?: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(command ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    setProjectDefaultCommand(projectId, value.trim() || null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ padding: "3px 10px 3px 30px" }}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={handleSave}
          placeholder="e.g. npm run dev"
          style={{
            width: "100%",
            background: "#1a1b26",
            border: "1px solid #7aa2f7",
            borderRadius: 3,
            padding: "3px 6px",
            fontSize: 14,
            fontFamily: "monospace",
            color: "#c0caf5",
            outline: "none",
          }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => { setValue(command ?? ""); setEditing(true); }}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 10px 4px 30px",
        gap: 6,
        fontSize: 14,
        fontFamily: "monospace",
        color: command ? "#9ece6a" : "#414868",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1a1b26"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
      title={command || "Set default command"}
    >
      <Play size={12} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {command || "Set command..."}
      </span>
    </div>
  );
}

const PROJECT_BG_COLORS = [
  { name: "None", value: "" },
  { name: "Midnight", value: "#252645" },
  { name: "Deep Ocean", value: "#1e3a5f" },
  { name: "Slate", value: "#3a3d4e" },
  { name: "Navy", value: "#253a52" },
  { name: "Forest", value: "#1e4538" },
  { name: "Evergreen", value: "#284532" },
  { name: "Plum", value: "#3e2848" },
  { name: "Grape", value: "#352854" },
  { name: "Teal", value: "#1e4545" },
  { name: "Storm", value: "#2e3850" },
  { name: "Ash", value: "#383838" },
  { name: "Coffee", value: "#3a3025" },
  { name: "Ink", value: "#222230" },
];

function ProjectDefaultBgColor({ projectId, color }: { projectId: string; color?: string }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        rowRef.current && !rowRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={rowRef}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 10px 4px 30px",
          gap: 6,
          fontSize: 14,
          fontFamily: "monospace",
          color: color ? "#e0af68" : "#414868",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1a1b26"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
        title={color || "Set default background color"}
      >
        <Palette size={12} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {color ? PROJECT_BG_COLORS.find((c) => c.value === color)?.name ?? "Custom" : "Set bg color..."}
        </span>
        {color && (
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, border: "1px solid #3b3f54", flexShrink: 0 }} />
        )}
      </div>

      {open && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            left: 28,
            top: "100%",
            marginTop: 2,
            zIndex: 1000,
            background: "#1a1b26",
            border: "1px solid #292e42",
            borderRadius: 6,
            padding: 8,
            width: 190,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 3,
            }}
          >
            {PROJECT_BG_COLORS.map((c) => {
              const isActive = c.value === (color ?? "");
              const displayColor = c.value || "#1a1b26";
              return (
                <button
                  key={c.name}
                  title={c.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectDefaultBgColor(projectId, c.value || null);
                    setOpen(false);
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 3,
                    border: isActive ? "2px solid #7aa2f7" : "1px solid #3b3f54",
                    background: displayColor,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectTasks({ projectId, tasks }: { projectId: string; tasks: import("../../types/layout").Task[] }) {
  const [showInput, setShowInput] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const handleAdd = () => {
    const t = title.trim();
    if (!t) return;
    addTask(projectId, t);
    setTitle("");
    setShowInput(false);
  };

  return (
    <div style={{ padding: "2px 0 4px" }}>
      {/* Tasks header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "3px 10px 3px 28px",
          gap: 4,
        }}
      >
        <ListTodo size={11} style={{ color: "#414868", flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            color: "#414868",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Tasks {tasks.length > 0 && `(${tasks.filter((t) => !t.done).length}/${tasks.length})`}
        </span>
        <SidebarBtn title="Add task" onClick={() => setShowInput(true)}>
          <Plus size={11} />
        </SidebarBtn>
      </div>

      {/* Add task input */}
      {showInput && (
        <div style={{ padding: "2px 8px 2px 42px" }}>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setShowInput(false); setTitle(""); }
            }}
            onBlur={() => {
              if (title.trim()) handleAdd();
              else { setShowInput(false); setTitle(""); }
            }}
            placeholder="Task description..."
            style={{
              width: "100%",
              background: "#1a1b26",
              border: "1px solid #7aa2f7",
              borderRadius: 3,
              padding: "2px 6px",
              fontSize: 14,
              fontFamily: "monospace",
              color: "#c0caf5",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* Task list */}
      {tasks.map((task) => (
        <div
          key={task.id}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "2px 8px 2px 42px",
            gap: 5,
            fontSize: 14,
            fontFamily: "monospace",
            color: task.done ? "#414868" : "#a9b1d6",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#1a1b26";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          <button
            onClick={() => toggleTask(projectId, task.id)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: task.done ? "#9ece6a" : "#565f89",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {task.done ? <CheckSquare size={12} /> : <Square size={12} />}
          </button>
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: task.done ? "line-through" : "none",
            }}
          >
            {task.title}
          </span>
          <SidebarBtn title="Delete task" onClick={() => deleteTask(projectId, task.id)}>
            <Trash2 size={10} />
          </SidebarBtn>
        </div>
      ))}
    </div>
  );
}

function SidebarBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "none",
        color: "#565f89",
        cursor: "pointer",
        padding: 2,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        borderRadius: 3,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#a9b1d6";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#565f89";
      }}
    >
      {children}
    </button>
  );
}
