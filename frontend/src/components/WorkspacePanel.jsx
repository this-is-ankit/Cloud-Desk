import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import toast from "react-hot-toast";

import { executeCode } from "../lib/piston";
import {
  useBootstrapSessionWorkspaces,
  useCreateFreshWorkspaceSet,
  useCreateWorkspaceFile,
  useDeleteWorkspaceFile,
  useDetachWorkspace,
  useFollowWorkspace,
  useForceDetachFollowers,
  useForceResyncFollowers,
  usePublishLessonSnapshot,
  useResyncWorkspace,
  useSessionWorkspaces,
  useUpdateWorkspaceFile,
} from "../hooks/useWorkspaces";
import {
  ArchiveIcon,
  ArrowRightIcon,
  ChalkboardTeacherIcon,
  CheckCircleIcon,
  CodeIcon,
  DoorOpenIcon,
  FilesIcon,
  Loader2Icon,
  PlusIcon,
  RadioTowerIcon,
  SaveIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  TerminalIcon,
  UserCheckIcon,
  UserCircleIcon,
  WarningIcon,
  XIcon,
} from "./icons/ModernIcons";
import {
  inferWorkspaceFileLanguage,
  sortWorkspaceFiles,
} from "../lib/workspaceFiles";

function WorkspacePanel({
  socket,
  sessionId,
  sessionLanguage,
  workspace,
  lessonState,
  isHost,
  isLivestream,
}) {
  const rosterQuery = useSessionWorkspaces(sessionId, { enabled: isHost });
  const bootstrapMutation = useBootstrapSessionWorkspaces();
  const freshMutation = useCreateFreshWorkspaceSet();
  const publishMutation = usePublishLessonSnapshot();
  const forceResyncMutation = useForceResyncFollowers();
  const forceDetachMutation = useForceDetachFollowers();
  const updateFileMutation = useUpdateWorkspaceFile();
  const createFileMutation = useCreateWorkspaceFile();
  const deleteFileMutation = useDeleteWorkspaceFile();
  const followMutation = useFollowWorkspace();
  const detachMutation = useDetachWorkspace();
  const resyncMutation = useResyncWorkspace();

  const [activePath, setActivePath] = useState("");
  const [drafts, setDrafts] = useState({});
  const [dirtyPaths, setDirtyPaths] = useState([]);
  const [newFilePath, setNewFilePath] = useState("");
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [livestreamCode, setLivestreamCode] = useState("");

  const [activeSideBar, setActiveSideBar] = useState("explorer"); // 'explorer' | 'classroom' | 'search'
  const [showSideBar, setShowSideBar] = useState(true);
  const [activePanel, setActivePanel] = useState("output"); // 'output' | 'problems' | 'terminal' | 'none'

  // Refactored state for new features
  const [activityData, setActivityData] = useState({}); // { userId: timestamp }
  const [successCount, setSuccessCount] = useState(0);
  const [spotlightWorkspace, setSpotlightWorkspace] = useState(null); // { workspaceId, files, activeFilePath, ownerUserId }
  const [showDetachPrompt, setShowDetachPrompt] = useState(false);
  const [detachIntent, setDetachIntent] = useState("");
  const [freshCountdown, setFreshCountdown] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleCodeUpdate = ({ path, code, userId }) => {
      if (isHost) return; 
      
      // If we are spotlighting this user, update the spotlight view
      if (spotlightWorkspace && spotlightWorkspace.ownerUserId === userId) {
        setSpotlightWorkspace(curr => ({
          ...curr,
          files: curr.files.map(f => f.path === path ? { ...f, content: code } : f)
        }));
      }

      if (!workspace?.followMode && !isLivestream) return;

      if (isLivestream) {
        setLivestreamCode(code);
      } else {
        setDrafts((current) => ({
          ...current,
          [path]: code,
        }));
      }
    };

    const handleHostCodeSync = (snapshot) => {
      if (isHost) return;
      if (isLivestream) {
        setLivestreamCode(snapshot?.code || "");
      }
    };

    const handleExecuteResult = ({ userId, result }) => {
      setIsRunning(false);
      setOutput(result);
      if (result.success && !isHost) {
        // Successful execution - progress aggregation handled by backend but we could trigger something local too
      }
    };

    const handleActivitySync = ({ activity }) => {
      setActivityData(activity || {});
    };

    const handleProgressUpdate = ({ successCount }) => {
      setSuccessCount(successCount);
    };

    const handleSpotlightUpdate = (data) => {
      if (isHost) return;
      setSpotlightWorkspace(data.workspaceId ? data : null);
      if (data.workspaceId) {
        toast(`Spotlight: Viewing Rahul's solution`, { icon: '🔦' });
      }
    };

    const handleForceResync = () => {
      if (!isHost) {
        toast.success("Your work was saved to your personal archive. Resyncing...", { duration: 4000 });
      }
    };

    const handleWorkspaceGenerationUpdated = () => {
      if (!isHost) {
        setFreshCountdown(0);
      }
    };

    socket.on("code-update", handleCodeUpdate);
    socket.on("host-code-sync", handleHostCodeSync);
    socket.on("code/execute.result", handleExecuteResult);
    socket.on("workspace-activity-sync", handleActivitySync);
    socket.on("workspace-progress-update", handleProgressUpdate);
    socket.on("workspace-spotlight-updated", handleSpotlightUpdate);
    socket.on("lesson-force-resynced", handleForceResync);
    socket.on("workspace-generation-updated", handleWorkspaceGenerationUpdated);

    return () => {
      socket.off("code-update", handleCodeUpdate);
      socket.off("host-code-sync", handleHostCodeSync);
      socket.off("code/execute.result", handleExecuteResult);
      socket.off("workspace-activity-sync", handleActivitySync);
      socket.off("workspace-progress-update", handleProgressUpdate);
      socket.off("workspace-spotlight-updated", handleSpotlightUpdate);
      socket.off("lesson-force-resynced", handleForceResync);
      socket.off("workspace-generation-updated", handleWorkspaceGenerationUpdated);
    };
  }, [socket, isHost, workspace?.followMode, isLivestream, spotlightWorkspace]);

  // Activity telemetry
  useEffect(() => {
    if (isHost || workspace?.followMode || !socket) return;

    const interval = setInterval(() => {
      socket.emit("workspace-activity", { roomId: sessionId });
    }, 10000); // Send activity every 10s if detached

    return () => clearInterval(interval);
  }, [socket, isHost, workspace?.followMode, sessionId]);

  // Fresh Set Countdown logic
  useEffect(() => {
    if (freshCountdown <= 0) return;
    const timer = setInterval(() => {
      setFreshCountdown(c => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [freshCountdown]);

  const togglePanel = (panel) => {
    if (activePanel === panel) {
      setActivePanel("none");
    } else {
      setActivePanel(panel);
    }
  };

  const toggleSideBar = (view) => {
    if (activeSideBar === view && showSideBar) {
      setShowSideBar(false);
    } else {
      setActiveSideBar(view);
      setShowSideBar(true);
    }
  };

  const files = useMemo(
    () => sortWorkspaceFiles(workspace?.files || []),
    [workspace?.files],
  );
  const fileMap = useMemo(
    () => Object.fromEntries(files.map((file) => [file.path, file])),
    [files],
  );

  useEffect(() => {
    if (!files.length) {
      setActivePath("");
      setDrafts({});
      return;
    }

    setDrafts((current) => {
      const next = { ...current };
      const dirty = new Set(dirtyPaths);

      for (const file of files) {
        if (!dirty.has(file.path)) {
          next[file.path] = file.content;
        }
      }

      for (const existingPath of Object.keys(next)) {
        if (!fileMap[existingPath]) {
          delete next[existingPath];
        }
      }

      return next;
    });

    setActivePath((current) => {
      if (current && fileMap[current]) return current;
      if (workspace?.activeFilePath && fileMap[workspace.activeFilePath]) {
        return workspace.activeFilePath;
      }
      return files[0]?.path || "";
    });
  }, [files, workspace?.activeFilePath, dirtyPaths, fileMap]);

  useEffect(() => {
    // If we transition to followMode, clear all local changes to stay in sync with teacher
    if (workspace?.followMode && !isHost) {
      setDirtyPaths([]);
    }
  }, [workspace?.followMode, isHost]);

  const activeFile = spotlightWorkspace 
    ? spotlightWorkspace.files.find(f => f.path === activePath) || spotlightWorkspace.files[0]
    : activePath ? fileMap[activePath] : null;
  
  const activeDraft =
    spotlightWorkspace 
      ? activeFile?.content || ""
      : !isHost && isLivestream && workspace?.followMode
        ? livestreamCode
        : (activePath && drafts[activePath] !== undefined
          ? drafts[activePath]
          : activeFile?.content) || "";
  const activeLanguage = inferWorkspaceFileLanguage(
    activePath,
    sessionLanguage || "javascript",
  );

  const roster = rosterQuery.data?.workspaces || [];
  const followerCount = roster.filter((item) => item.followMode).length;

  const handleDetachWithIntent = async () => {
    if (!workspace?._id) return;
    await detachMutation.mutateAsync({ 
      workspaceId: workspace._id, 
      sessionId,
      intent: detachIntent 
    });
    setShowDetachPrompt(false);
    setDetachIntent("");
    toast.success("Detached from teacher. Good luck experimenting!");
  };

  const markDirty = (path, isDirty) => {
    setDirtyPaths((current) => {
      const next = new Set(current);
      if (isDirty) next.add(path);
      else next.delete(path);
      return [...next];
    });
  };

  const handleSave = async () => {
    if (!workspace?._id || !activePath) return;

    await updateFileMutation.mutateAsync({
      workspaceId: workspace._id,
      path: activePath,
      content: activeDraft,
      activeFilePath: activePath,
    });
    markDirty(activePath, false);
    toast.success("File saved");
  };

  const handleCreateFile = async () => {
    if (!workspace?._id || !newFilePath.trim()) return;

    const path = newFilePath.trim();
    await createFileMutation.mutateAsync({
      workspaceId: workspace._id,
      path,
      content: "",
      language: inferWorkspaceFileLanguage(path, "plaintext"),
    });
    setNewFilePath("");
    setActivePath(path);
    markDirty(path, false);
  };

  const handleDeleteFile = async (path) => {
    if (!workspace?._id || !path) return;
    if (!confirm(`Delete ${path}?`)) return;

    await deleteFileMutation.mutateAsync({
      workspaceId: workspace._id,
      path,
    });
    markDirty(path, false);
  };

  const handleRun = async () => {
    if (!activePath) return;
    setIsRunning(true);
    setOutput(null);
    setActivePanel("output");
    try {
      const result = await executeCode(activeLanguage, activeDraft, sessionId);
      if (result.async) {
        toast.success("Execution started...");
        // isRunning remains true until socket event or timeout
      } else {
        setIsRunning(false);
        setOutput(result);
      }
    } catch (error) {
      setIsRunning(false);
      setOutput({ success: false, error: error.message });
    }
  };

  const handleEditorChange = (nextValue = "") => {
    if (!activePath) return;
    setDrafts((current) => ({
      ...current,
      [activePath]: nextValue,
    }));
    markDirty(activePath, nextValue !== (activeFile?.content || ""));

    // Emit socket event for real-time sync if we are the host
    if (isHost && socket) {
      socket.emit("code-change", {
        roomId: sessionId,
        path: activePath,
        code: nextValue,
      });
    }
  };

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // VS Code Colors
  const colors = {
    bg: "#1e1e1e",
    sidebar: "#252526",
    activityBar: "#333333",
    titleBar: "#3c3c3c",
    statusBar: workspace.followMode ? "#16a34a" : "#007acc",
    border: "#454545",
    editorBg: "#1e1e1e",
    panelBg: "#1e1e1e",
    panelBorder: "#454545",
    textMuted: "#9ca3af",
    textActive: "#ffffff",
    accent: "#007acc",
  };

  const isEmbedded = workspace.embedUrl && workspace.providerType !== "mock";

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden text-[#cccccc] shadow-2xl"
      style={{ backgroundColor: colors.bg, fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif" }}
    >
      {/* Title Bar */}
      <div
        className="flex h-9 shrink-0 items-center justify-between border-b border-[#454545] px-3"
        style={{ backgroundColor: colors.titleBar }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <CodeIcon className="size-4 text-sky-400" />
            <span className="text-xs font-medium truncate">
              {workspace.workspaceKind === "fresh" ? "Fresh Workspace" : "Course Workspace"} - {activePath || "Cloud Desk"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <div className="flex items-center gap-1.5 mr-2">
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-white/10 transition"
                onClick={() => bootstrapMutation.mutate(sessionId)}
                disabled={bootstrapMutation.isPending}
                title="Bootstrap Workspaces"
              >
                <DoorOpenIcon className="size-3" />
                <span>Bootstrap</span>
              </button>
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-white/10 transition"
                onClick={() => setFreshCountdown(10)}
                disabled={freshMutation.isPending}
                title="Create Fresh Workspace Set (10s Countdown)"
              >
                <SparklesIcon className="size-3" />
                <span>Fresh Set</span>
              </button>
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-white/10 transition text-emerald-400"
                onClick={() => publishMutation.mutate(sessionId)}
                disabled={publishMutation.isPending}
                title="Publish Lesson Snapshot"
              >
                <RadioTowerIcon className="size-3" />
                <span>Publish</span>
              </button>
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-white/10 transition text-amber-400"
                onClick={() => {
                  if (confirm("This will overwrite all students' work. It will be archived. Continue?")) {
                    forceResyncMutation.mutate(sessionId);
                  }
                }}
                disabled={forceResyncMutation.isPending}
                title="Force Resync Followers"
              >
                <ArchiveIcon className="size-3" />
                <span>Sync All</span>
              </button>
            </div>
          )}
          {!isHost && (
            <div className="flex items-center gap-1.5 mr-2">
              {workspace.followMode ? (
                <button
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-white/10 transition text-emerald-400"
                  onClick={() => detachMutation.mutate({ workspaceId: workspace._id, sessionId })}
                  disabled={detachMutation.isPending}
                >
                  <ArchiveIcon className="size-3" />
                  <span>Detach</span>
                </button>
              ) : (
                <button
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-white/10 transition text-amber-400"
                  onClick={() => followMutation.mutate({ workspaceId: workspace._id, sessionId })}
                  disabled={followMutation.isPending}
                >
                  <UserCheckIcon className="size-3" />
                  <span>Follow</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Activity Bar */}
        <div
          className="flex w-12 shrink-0 flex-col items-center py-2 border-r border-[#454545]"
          style={{ backgroundColor: colors.activityBar }}
        >
          <div className="flex flex-col gap-4">
            <button
              className={`p-2 transition relative ${activeSideBar === "explorer" && showSideBar ? "text-white" : "text-[#858585] hover:text-[#cccccc]"}`}
              onClick={() => toggleSideBar("explorer")}
              title="Explorer"
            >
              <FilesIcon className="size-6" />
              {activeSideBar === "explorer" && showSideBar && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white" />}
            </button>
            <button
              className={`p-2 transition relative ${activeSideBar === "search" && showSideBar ? "text-white" : "text-[#858585] hover:text-[#cccccc]"}`}
              onClick={() => toggleSideBar("search")}
              title="Search"
            >
              <SearchIcon className="size-6" />
              {activeSideBar === "search" && showSideBar && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white" />}
            </button>
            <button
              className={`p-2 transition relative ${activeSideBar === "classroom" && showSideBar ? "text-white" : "text-[#858585] hover:text-[#cccccc]"}`}
              onClick={() => toggleSideBar("classroom")}
              title="Classroom"
            >
              <ChalkboardTeacherIcon className="size-6" />
              {activeSideBar === "classroom" && showSideBar && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white" />}
            </button>
          </div>
          <div className="mt-auto flex flex-col gap-4 pb-2">
            <button className="p-2 text-[#858585] hover:text-[#cccccc] transition" title="Account">
              <UserCircleIcon className="size-6" />
            </button>
            <button className="p-2 text-[#858585] hover:text-[#cccccc] transition" title="Manage">
              <SettingsIcon className="size-6" />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        {showSideBar && (
          <div
            className="flex w-64 shrink-0 flex-col border-r border-[#454545]"
            style={{ backgroundColor: colors.sidebar }}
          >
            {activeSideBar === "explorer" && (
              <div className="flex flex-col h-full">
                <div className="flex h-9 items-center justify-between px-4 py-2">
                  <span className="text-[11px] font-bold uppercase text-[#bbbbbb] tracking-wider">Explorer</span>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1 hover:bg-white/10 rounded transition"
                      onClick={() => setNewFilePath(newFilePath ? "" : "src/")}
                      title="New File"
                    >
                      <PlusIcon className="size-3.5" />
                    </button>
                  </div>
                </div>

                {newFilePath && (
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2 border border-[#007acc] bg-[#3c3c3c] px-2 py-1 rounded">
                      <input
                        autoFocus
                        className="w-full bg-transparent text-xs outline-none"
                        placeholder="filename.js"
                        value={newFilePath}
                        onChange={(e) => setNewFilePath(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateFile();
                          if (e.key === "Escape") setNewFilePath("");
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto py-1">
                  <div className="flex items-center px-4 py-0.5 bg-white/5">
                    <ArrowRightIcon className="size-3.5 rotate-90 mr-1" />
                    <span className="text-[11px] font-bold uppercase text-[#bbbbbb]">Workspace</span>
                  </div>
                  <div className="mt-1">
                    {files.map((file) => {
                      const isDirty = dirtyPaths.includes(file.path);
                      const isActive = activePath === file.path;

                      return (
                        <div
                          key={file.path}
                          className={`group flex items-center gap-2 px-4 py-0.5 text-[13px] cursor-pointer ${
                            isActive
                              ? "bg-[#37373d] text-white"
                              : "text-[#cccccc] hover:bg-[#2a2d2e]"
                          }`}
                          onClick={() => setActivePath(file.path)}
                        >
                          <CodeIcon className={`size-3.5 ${isActive ? "text-sky-400" : "text-sky-400/60"}`} />
                          <span className="flex-1 truncate">{file.path}</span>
                          {isDirty && (
                            <div className="size-2 rounded-full bg-[#cccccc] shrink-0" />
                          )}
                          <button
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.path);
                            }}
                          >
                            <ArchiveIcon className="size-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeSideBar === "classroom" && (
              <div className="flex flex-col h-full">
                <div className="flex h-9 items-center px-4 py-2 border-b border-[#454545]">
                  <span className="text-[11px] font-bold uppercase text-[#bbbbbb] tracking-wider">Classroom</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <section>
                    <h4 className="text-[11px] font-bold uppercase text-[#858585] mb-2">Lesson Info</h4>
                    <div className="bg-[#1e1e1e] border border-[#454545] rounded p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#858585]">Version</span>
                        <span>v{lessonState?.currentLessonVersion || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#858585]">Mode</span>
                        <span className="capitalize">{workspace.workspaceKind}</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[11px] font-bold uppercase text-[#858585] mb-2">Sync State</h4>
                    <div className="bg-[#1e1e1e] border border-[#454545] rounded p-3 space-y-3">
                      {isHost ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#858585]">Followers</span>
                            <span className="bg-[#007acc] text-white px-2 py-0.5 rounded-full text-[10px]">{followerCount} active</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#454545]">
                            <span className="text-[#858585]">Progress</span>
                            <span className="text-emerald-400 font-bold">{successCount} / {roster.length} passed</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs">
                          {workspace.followMode ? (
                            <>
                              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Following Teacher</span>
                            </>
                          ) : (
                            <>
                              <div className="size-2 rounded-full bg-amber-500" />
                              <span>Detached Mode</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-[#454545] grid grid-cols-1 gap-2">
                        {isHost ? (
                          <>
                            <button
                              className="w-full btn btn-xs border-[#454545] bg-[#333333] hover:bg-[#454545] text-white rounded text-[11px]"
                              onClick={() => publishMutation.mutate(sessionId)}
                            >
                              <RadioTowerIcon className="size-3 mr-1.5" />
                              Publish Current State
                            </button>
                            <button
                              className="w-full btn btn-xs border-[#454545] bg-[#333333] hover:bg-[#454545] text-white rounded text-[11px]"
                              onClick={() => {
                                if (confirm("This will overwrite all students' work with your current state. Their work will be archived. Continue?")) {
                                  forceResyncMutation.mutate(sessionId);
                                }
                              }}
                              disabled={forceResyncMutation.isPending}
                            >
                              <ArchiveIcon className="size-3 mr-1.5" />
                              Force Sync All
                            </button>
                            <button
                              className="w-full btn btn-xs border-[#454545] bg-rose-900/30 hover:bg-rose-900/50 text-rose-200 border-rose-800 rounded text-[11px]"
                              onClick={() => {
                                setFreshCountdown(10);
                              }}
                              disabled={freshMutation.isPending}
                            >
                              <SparklesIcon className="size-3 mr-1.5" />
                              Fresh Set (10s Warn)
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`w-full btn btn-xs border-[#454545] rounded text-[11px] ${
                                workspace.followMode ? "bg-[#333333] hover:bg-[#454545] text-white" : "bg-[#007acc] hover:bg-[#0062a3] text-white"
                              }`}
                              onClick={() => {
                                if (!workspace?._id) {
                                  toast.error("Workspace ID missing");
                                  return;
                                }
                                if (workspace.followMode) {
                                  setShowDetachPrompt(true);
                                } else {
                                  followMutation.mutate({ workspaceId: workspace._id, sessionId });
                                }
                              }}
                            >
                              {workspace.followMode ? (
                                <><ArchiveIcon className="size-3 mr-1.5" /> Detach from Teacher</>
                              ) : (
                                <><UserCheckIcon className="size-3 mr-1.5" /> Follow Teacher</>
                              )}
                            </button>
                            <button
                              className="w-full btn btn-xs border-[#454545] bg-[#333333] hover:bg-[#454545] text-white rounded text-[11px]"
                              onClick={() => {
                                if (!workspace?._id) {
                                  toast.error("Workspace ID missing");
                                  return;
                                }
                                resyncMutation.mutate({ workspaceId: workspace._id, sessionId });
                              }}
                            >
                              <ArrowRightIcon className="size-3 mr-1.5" />
                              Resync from Teacher
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </section>

                  {isHost && (
                    <section>
                      <h4 className="text-[11px] font-bold uppercase text-[#858585] mb-2">Student Roster</h4>
                      <div className="bg-[#1e1e1e] border border-[#454545] rounded overflow-hidden">
                        {roster.length === 0 ? (
                          <div className="p-3 text-center text-xs text-[#858585] italic">No students joined yet</div>
                        ) : (
                          <div className="max-h-[300px] overflow-y-auto">
                            {roster.map((studentWs) => {
                              const lastSeen = parseInt(activityData[studentWs.ownerUserId] || "0");
                              const isFollowing = studentWs.followMode;
                              const isActive = !isFollowing && (Date.now() - lastSeen < 120000); // Active if typed in last 2 mins
                              const isIdle = !isFollowing && !isActive;

                              let statusColor = "bg-emerald-500"; // Following
                              let statusText = "Following";
                              if (isActive) { statusColor = "bg-amber-500"; statusText = "Active"; }
                              if (isIdle) { statusColor = "bg-[#454545]"; statusText = "Idle"; }

                              return (
                                <div key={studentWs._id} className="flex items-center gap-2 p-2 border-b border-[#333333] hover:bg-white/5 group">
                                  <div className={`size-2 rounded-full ${statusColor}`} title={statusText} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] truncate font-medium text-[#cccccc]">{studentWs.ownerUserId}</p>
                                  </div>
                                  <button
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-sky-500/20 text-sky-400 rounded transition"
                                    onClick={() => socket.emit("spotlight-workspace", { roomId: sessionId, workspaceId: studentWs._id })}
                                    title="Spotlight Solution"
                                  >
                                    <RadioTowerIcon className="size-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            )}

            {activeSideBar === "search" && (
              <div className="flex flex-col h-full">
                <div className="flex h-9 items-center px-4 py-2 border-b border-[#454545]">
                  <span className="text-[11px] font-bold uppercase text-[#bbbbbb] tracking-wider">Search</span>
                </div>
                <div className="p-4">
                  <div className="bg-[#3c3c3c] border border-[#454545] px-2 py-1.5 rounded focus-within:border-[#007acc]">
                    <input
                      className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#858585]"
                      placeholder="Search placeholder..."
                      disabled
                    />
                  </div>
                  <p className="mt-4 text-xs text-[#858585] text-center italic">
                    Search functionality is limited in this environment.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editor Area */}
        <div className="flex flex-1 flex-col min-w-0 bg-[#1e1e1e]">
          {isEmbedded ? (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={workspace.embedUrl}
                title="Cloud Desk Workspace"
                className="h-full w-full border-0"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex h-9 shrink-0 bg-[#252526] border-b border-[#454545]">
                <div className="flex-1 flex overflow-x-auto">
                  {files.length > 0 ? (
                    files.map(file => (
                      <div
                        key={file.path}
                        className={`flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] text-[13px] border-r border-[#1e1e1e] cursor-pointer transition ${
                          activePath === file.path ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d2d] text-[#969696] hover:bg-[#333333]"
                        }`}
                        onClick={() => setActivePath(file.path)}
                      >
                        <CodeIcon className="size-3.5 shrink-0 text-sky-400" />
                        <span className="truncate flex-1">{file.path}</span>
                        {dirtyPaths.includes(file.path) && <div className="size-2 rounded-full bg-[#cccccc] shrink-0" />}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center px-4 text-xs italic text-[#858585]">No files open</div>
                  )}
                </div>
                <div className="flex items-center gap-1 px-2 border-l border-[#454545]">
                  <button
                    className="p-1.5 hover:bg-white/10 text-[#cccccc] rounded transition"
                    onClick={handleRun}
                    disabled={isRunning || !activePath}
                    title="Run (Ctrl+Enter)"
                  >
                    {isRunning ? <Loader2Icon className="size-4 animate-spin" /> : <CheckCircleIcon className="size-4 text-emerald-400" />}
                  </button>
                  <button
                    className="p-1.5 hover:bg-white/10 text-[#cccccc] rounded transition"
                    onClick={handleSave}
                    disabled={!activePath}
                    title="Save (Ctrl+S)"
                  >
                    <SaveIcon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Breadcrumbs */}
              <div className="flex h-6 shrink-0 items-center px-4 text-[11px] text-[#858585] bg-[#1e1e1e]">
                <span className="hover:text-[#cccccc] cursor-pointer">workspace</span>
                <span className="mx-1">›</span>
                <span className="text-[#cccccc]">{activePath || "README.md"}</span>
              </div>

              {/* Editor */}
              <div className="flex-1 min-h-0 relative">
                {!activePath && files.length > 0 ? (
                  <div className="flex h-full items-center justify-center text-[#858585] italic">Select a file to start editing</div>
                ) : files.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-[#858585] gap-4">
                    <CodeIcon className="size-16 opacity-20" />
                    <p>Empty Workspace</p>
                    <button
                      className="btn btn-xs bg-[#007acc] text-white border-0 hover:bg-[#0062a3]"
                      onClick={() => {
                        setNewFilePath("main.js");
                        setActiveSideBar("explorer");
                      }}
                    >
                      Create your first file
                    </button>
                  </div>
                ) : (
                  <Editor
                    key={activePath || "workspace-editor"}
                    language={activeLanguage}
                    value={activeDraft}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    height="100%"
                    options={{
                      readOnly: spotlightWorkspace || (!isHost && isLivestream) || (!isHost && workspace?.followMode),
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: 13,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      padding: { top: 12, bottom: 12 },
                      lineNumbers: "on",
                      renderLineHighlight: "all",
                      scrollbar: {
                        vertical: "visible",
                        horizontal: "visible",
                        useShadows: false,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                      },
                      cursorBlinking: "solid",
                      cursorSmoothCaretAnimation: "on",
                    }}
                  />
                )}
              </div>

              {/* Panel Area (Bottom) */}
              <div
                className="flex shrink-0 flex-col border-t border-[#454545]"
                style={{ height: activePanel === "none" ? "0" : "200px", backgroundColor: colors.panelBg }}
              >
                <div className="flex h-9 items-center justify-between px-4 border-b border-[#454545] bg-[#1e1e1e]">
                  <div className="flex items-center gap-4">
                    <button
                      className={`text-[11px] font-bold uppercase tracking-wider transition ${
                        activePanel === "output" ? "text-white border-b-2 border-white pb-2 mt-2" : "text-[#858585] hover:text-[#cccccc]"
                      }`}
                      onClick={() => togglePanel("output")}
                    >
                      Output
                    </button>
                    <button
                      className={`text-[11px] font-bold uppercase tracking-wider transition ${
                        activePanel === "problems" ? "text-white border-b-2 border-white pb-2 mt-2" : "text-[#858585] hover:text-[#cccccc]"
                      }`}
                      onClick={() => togglePanel("problems")}
                    >
                      Problems
                    </button>
                    <button
                      className={`text-[11px] font-bold uppercase tracking-wider transition ${
                        activePanel === "terminal" ? "text-white border-b-2 border-white pb-2 mt-2" : "text-[#858585] hover:text-[#cccccc]"
                      }`}
                      onClick={() => togglePanel("terminal")}
                    >
                      Terminal
                    </button>
                  </div>
                  <button
                    className="p-1 hover:bg-white/10 rounded"
                    onClick={() => togglePanel(activePanel)}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden p-3 font-mono text-[12px] leading-relaxed">
                  {activePanel === "output" && (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      {output ? (
                        output.success ? (
                          <pre className="whitespace-pre-wrap text-[#cccccc]">{output.output}</pre>
                        ) : (
                          <pre className="whitespace-pre-wrap text-rose-400">
                            {output.error || output.output}
                          </pre>
                        )
                      ) : (
                        <p className="text-[#858585] italic">Run the active file to see output.</p>
                      )}
                    </div>
                  )}
                  {activePanel === "problems" && (
                    <div className="flex flex-col items-center justify-center h-full text-[#858585]">
                      <CheckCircleIcon className="size-8 mb-2 opacity-20" />
                      <p>No problems have been detected in the workspace.</p>
                    </div>
                  )}
                  {activePanel === "terminal" && (
                    <div className="flex h-full items-center justify-center text-[#858585]">
                      <TerminalIcon className="size-8 mb-2 opacity-20 mr-2" />
                      <p>Interactive terminal is currently unavailable.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detach Intent Modal */}
      {showDetachPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] bg-[#252526] border border-[#454545] rounded-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">Intentional Detach</h3>
            <p className="text-sm text-[#858585] mb-4">
              Taking a moment to articulate your goal helps learning. What are you going to try?
            </p>
            <input
              autoFocus
              className="w-full bg-[#1e1e1e] border border-[#454545] rounded px-3 py-2 text-sm text-white outline-none focus:border-[#007acc] mb-6"
              placeholder="e.g. Try a different loop structure"
              value={detachIntent}
              onChange={(e) => setDetachIntent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && detachIntent.trim() && handleDetachWithIntent()}
            />
            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 text-sm text-[#858585] hover:text-white transition"
                onClick={() => { setShowDetachPrompt(false); setDetachIntent(""); }}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 text-sm bg-[#007acc] text-white rounded hover:bg-[#0062a3] transition disabled:opacity-50"
                disabled={!detachIntent.trim()}
                onClick={handleDetachWithIntent}
              >
                Confirm Detach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fresh Set Countdown Overlay */}
      {freshCountdown > 0 && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-rose-950/90 text-white p-12 text-center">
          <SparklesIcon className="size-24 mb-6 animate-pulse text-rose-400" />
          <h2 className="text-4xl font-bold mb-4">New Topic Starting</h2>
          <p className="text-xl text-rose-200 mb-8 max-w-lg">
            The professor is starting a fresh set in <span className="text-5xl font-black">{freshCountdown}</span> seconds. 
            Your current work is being safely archived.
          </p>
          {isHost && (
            <div className="flex gap-4">
              <button 
                className="btn btn-outline border-white text-white hover:bg-white/10"
                onClick={() => setFreshCountdown(0)}
              >
                Cancel
              </button>
              <button 
                className="btn bg-white text-rose-900 border-0 hover:bg-rose-100"
                onClick={() => {
                  freshMutation.mutate(sessionId);
                  setFreshCountdown(0);
                }}
              >
                Start Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div
        className="flex h-6 shrink-0 items-center justify-between px-3 text-[12px] text-white select-none"
        style={{ backgroundColor: colors.statusBar }}
      >
        <div className="flex items-center gap-4">
          {!isHost && (
            <div className="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer transition"
                 onClick={() => (workspace.followMode 
                   ? detachMutation.mutate({ workspaceId: workspace._id, sessionId }) 
                   : followMutation.mutate({ workspaceId: workspace._id, sessionId }))}>
              {workspace.followMode ? <UserCheckIcon className="size-3.5" /> : <ArchiveIcon className="size-3.5" />}
              <span>{workspace.followMode ? "Following" : "Detached"}</span>
            </div>
          )}
          <div className="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer transition">
            <RadioTowerIcon className="size-3.5" />
            <span>v{lessonState?.currentLessonVersion || 0}</span>
          </div>
          {dirtyPaths.length > 0 && (
            <div className="flex items-center gap-1 text-white font-medium">
              <div className="size-1.5 rounded-full bg-white" />
              <span>{dirtyPaths.length} unsaved</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer transition uppercase">
            <span>{activeLanguage}</span>
          </div>
          <div className="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer transition">
            <WarningIcon className="size-3.5" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer transition">
            <CheckCircleIcon className="size-3.5" />
            <span>Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspacePanel;
