import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import toast from "react-hot-toast";

import { useTheme } from "../context/ThemeProvider";
import { executeCode } from "../lib/piston";
import {
  useBootstrapSessionWorkspaces,
  useCreateFreshWorkspaceSet,
  useCreateWorkspaceFile,
  useDeleteWorkspaceFile,
  useDetachWorkspace,
  useFollowWorkspace,
  useForceResyncFollowers,
  usePublishLessonSnapshot,
  useResyncWorkspace,
  useSessionWorkspaces,
  useUpdateWorkspaceFile,
} from "../hooks/useWorkspaces";
import {
  ArchiveIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CodeIcon,
  DoorOpenIcon,
  Loader2Icon,
  PlusIcon,
  RadioTowerIcon,
  SaveIcon,
  SparklesIcon,
  UserCheckIcon,
} from "./icons/ModernIcons";
import {
  inferWorkspaceFileLanguage,
  sortWorkspaceFiles,
} from "../lib/workspaceFiles";

function WorkspacePanel({
  sessionId,
  sessionLanguage,
  workspace,
  lessonState,
  isHost,
}) {
  const { isDark } = useTheme();
  const rosterQuery = useSessionWorkspaces(sessionId, { enabled: isHost });
  const bootstrapMutation = useBootstrapSessionWorkspaces();
  const freshMutation = useCreateFreshWorkspaceSet();
  const publishMutation = usePublishLessonSnapshot();
  const forceResyncMutation = useForceResyncFollowers();
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
  }, [files, workspace?.activeFilePath]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFile = activePath ? fileMap[activePath] : null;
  const activeDraft =
    (activePath && drafts[activePath] !== undefined
      ? drafts[activePath]
      : activeFile?.content) || "";
  const activeLanguage = inferWorkspaceFileLanguage(
    activePath,
    sessionLanguage || "javascript",
  );

  const roster = rosterQuery.data?.workspaces || [];
  const followerCount = roster.filter((item) => item.followMode).length;

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
    const result = await executeCode(activeLanguage, activeDraft, sessionId);
    setIsRunning(false);
    setOutput(result);
  };

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (workspace.embedUrl && workspace.providerType !== "mock") {
    return (
      <div className="h-full rounded-xl border border-base-content/10 bg-base-100 overflow-hidden">
        <iframe
          src={workspace.embedUrl}
          title="Cloud Desk Workspace"
          className="h-full w-full border-0"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-base-content/10 bg-[#111827] text-slate-100">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0f172a] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CodeIcon className="size-4 text-sky-300" />
            <span className="truncate">
              {isHost ? "Teacher Workspace" : "Student Workspace"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-300">
              v{lessonState?.currentLessonVersion || 0}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {workspace.workspaceKind === "fresh"
              ? "Fresh classroom workspace"
              : "Persistent course workspace"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHost ? (
            <>
              <button
                type="button"
                className="btn btn-xs rounded-lg border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                onClick={() => bootstrapMutation.mutate(sessionId)}
                disabled={bootstrapMutation.isPending}
              >
                <DoorOpenIcon className="size-3.5" />
                Bootstrap
              </button>
              <button
                type="button"
                className="btn btn-xs rounded-lg border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                onClick={() => freshMutation.mutate(sessionId)}
                disabled={freshMutation.isPending}
              >
                <SparklesIcon className="size-3.5" />
                Fresh Set
              </button>
              <button
                type="button"
                className="btn btn-xs rounded-lg border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                onClick={() => publishMutation.mutate(sessionId)}
                disabled={publishMutation.isPending}
              >
                <RadioTowerIcon className="size-3.5" />
                Publish
              </button>
              <button
                type="button"
                className="btn btn-xs rounded-lg border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
                onClick={() => forceResyncMutation.mutate(sessionId)}
                disabled={forceResyncMutation.isPending}
              >
                <ArchiveIcon className="size-3.5" />
                Force Resync
              </button>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
                Followers: {followerCount}
              </span>
            </>
          ) : workspace.followMode ? (
            <>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-100">
                Following teacher
              </span>
              <button
                type="button"
                className="btn btn-xs rounded-lg border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                onClick={() => detachMutation.mutate(workspace._id)}
                disabled={detachMutation.isPending}
              >
                <ArchiveIcon className="size-3.5" />
                Detach
              </button>
            </>
          ) : (
            <>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
                Detached
              </span>
              <button
                type="button"
                className="btn btn-xs rounded-lg border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                onClick={() => followMutation.mutate(workspace._id)}
                disabled={followMutation.isPending}
              >
                <UserCheckIcon className="size-3.5" />
                Follow
              </button>
              <button
                type="button"
                className="btn btn-xs rounded-lg border-sky-400/30 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20"
                onClick={() => resyncMutation.mutate(workspace._id)}
                disabled={resyncMutation.isPending}
              >
                <ArrowRightIcon className="size-3.5" />
                Resync
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-h-0 border-r border-white/10 bg-[#0b1120]">
          <div className="border-b border-white/10 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Explorer
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="input input-xs min-w-0 flex-1 rounded-md border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
                placeholder="src/new-file.js"
                value={newFilePath}
                onChange={(event) => setNewFilePath(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-xs rounded-md border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                onClick={handleCreateFile}
                disabled={createFileMutation.isPending}
              >
                <PlusIcon className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-full space-y-1 overflow-y-auto px-2 py-2">
            {files.map((file) => {
              const isDirty = dirtyPaths.includes(file.path);
              const isActive = activePath === file.path;

              return (
                <div
                  key={file.path}
                  className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    isActive
                      ? "bg-sky-400/15 text-sky-100"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => setActivePath(file.path)}
                  >
                    {file.path}
                  </button>
                  {isDirty ? (
                    <span className="text-[10px] uppercase tracking-widest text-amber-300">
                      modified
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="opacity-0 transition group-hover:opacity-100"
                    onClick={() => handleDeleteFile(file.path)}
                    title="Delete file"
                  >
                    <ArchiveIcon className="size-3.5 text-slate-500 hover:text-rose-300" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_180px]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#111827] px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">
                {activePath || "No file selected"}
              </p>
              <p className="text-xs text-slate-500">
                {workspace.providerType === "mock"
                  ? "Embedded classroom workspace"
                  : "Remote workspace"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-xs rounded-md border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                onClick={handleSave}
                disabled={!activePath || updateFileMutation.isPending}
              >
                <SaveIcon className="size-3.5" />
                Save
              </button>
              <button
                type="button"
                className="btn btn-xs rounded-md border-sky-400/30 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20"
                onClick={handleRun}
                disabled={!activePath || isRunning}
              >
                {isRunning ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircleIcon className="size-3.5" />
                )}
                Run
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-hidden">
            <Editor
              key={activePath || "workspace-editor"}
              language={activeLanguage}
              value={activeDraft}
              onChange={(nextValue = "") => {
                if (!activePath) return;
                setDrafts((current) => ({
                  ...current,
                  [activePath]: nextValue,
                }));
                markDirty(activePath, nextValue !== (activeFile?.content || ""));
              }}
              theme={isDark ? "vs-dark" : "vs-dark"}
              height="100%"
              options={{
                fontFamily: "JetBrains Mono",
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          <div className="border-t border-white/10 bg-[#0f172a] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Output
              </p>
              <p className="text-xs text-slate-500">{activeLanguage}</p>
            </div>
            <div className="h-[132px] overflow-y-auto rounded-lg border border-white/10 bg-[#020617] p-3 font-mono text-xs leading-6 text-slate-300">
              {output ? (
                output.success ? (
                  <pre className="whitespace-pre-wrap">{output.output}</pre>
                ) : (
                  <pre className="whitespace-pre-wrap text-rose-300">
                    {output.error || output.output}
                  </pre>
                )
              ) : (
                <p className="text-slate-500">
                  Run the active file to inspect output here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspacePanel;
