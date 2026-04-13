import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { workspaceApi } from "../api/workspaces";

const invalidateSessionWorkspace = (queryClient, sessionId) => {
  queryClient.invalidateQueries({ queryKey: ["workspace", sessionId] });
  queryClient.invalidateQueries({ queryKey: ["workspace-roster", sessionId] });
  queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
};

export const useMyWorkspace = (sessionId, options = {}) =>
  useQuery({
    queryKey: ["workspace", sessionId],
    queryFn: () => workspaceApi.getMyWorkspace(sessionId),
    enabled: Boolean(sessionId) && options.enabled !== false,
    refetchInterval: options.refetchInterval ?? 5000,
  });

export const useSessionWorkspaces = (sessionId, options = {}) =>
  useQuery({
    queryKey: ["workspace-roster", sessionId],
    queryFn: () => workspaceApi.getSessionWorkspaces(sessionId),
    enabled: Boolean(sessionId) && options.enabled === true,
    refetchInterval: options.refetchInterval ?? 7000,
  });

const createWorkspaceMutation = (
  mutationKey,
  mutationFn,
  successMessage,
  errorMessage,
) => () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [mutationKey],
    mutationFn,
    onSuccess: (data, variables) => {
      toast.success(data?.message || successMessage);
      const sessionId =
        typeof variables === "string"
          ? variables
          : variables?.sessionId || variables?.workspaceId || "";
      if (sessionId) invalidateSessionWorkspace(queryClient, sessionId);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || errorMessage);
    },
  });
};

export const useBootstrapSessionWorkspaces = createWorkspaceMutation(
  "bootstrap-session-workspaces",
  workspaceApi.bootstrapSessionWorkspaces,
  "Workspaces are ready",
  "Failed to prepare workspaces",
);

export const useCreateFreshWorkspaceSet = createWorkspaceMutation(
  "create-fresh-workspace-set",
  workspaceApi.createFreshWorkspaceSet,
  "Fresh classroom workspaces created",
  "Failed to create fresh workspaces",
);

export const usePublishLessonSnapshot = createWorkspaceMutation(
  "publish-lesson-snapshot",
  workspaceApi.publishLessonSnapshot,
  "Lesson published",
  "Failed to publish lesson state",
);

export const useForceResyncFollowers = createWorkspaceMutation(
  "force-resync-followers",
  workspaceApi.forceResyncFollowers,
  "Followers resynced",
  "Failed to resync followers",
);

export const useUpdateWorkspaceFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-workspace-file"],
    mutationFn: workspaceApi.updateFile,
    onSuccess: (data) => {
      const sessionId = data?.workspace?.sessionId;
      if (sessionId) invalidateSessionWorkspace(queryClient, sessionId);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to save file");
    },
  });
};

export const useCreateWorkspaceFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-workspace-file"],
    mutationFn: workspaceApi.createFile,
    onSuccess: (data) => {
      const sessionId = data?.workspace?.sessionId;
      if (sessionId) invalidateSessionWorkspace(queryClient, sessionId);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create file");
    },
  });
};

export const useDeleteWorkspaceFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-workspace-file"],
    mutationFn: workspaceApi.deleteFile,
    onSuccess: (data) => {
      const sessionId = data?.workspace?.sessionId;
      if (sessionId) invalidateSessionWorkspace(queryClient, sessionId);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete file");
    },
  });
};

export const useFollowWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["follow-workspace"],
    mutationFn: workspaceApi.followWorkspace,
    onSuccess: (data) => {
      const sessionId = data?.workspace?.sessionId;
      if (sessionId) invalidateSessionWorkspace(queryClient, sessionId);
      toast.success("Following the teacher");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to follow lesson");
    },
  });
};

export const useDetachWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["detach-workspace"],
    mutationFn: workspaceApi.detachWorkspace,
    onSuccess: (data) => {
      const sessionId = data?.workspace?.sessionId;
      if (sessionId) invalidateSessionWorkspace(queryClient, sessionId);
      toast.success("Detached from teacher sync");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to detach");
    },
  });
};

export const useResyncWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["resync-workspace"],
    mutationFn: workspaceApi.resyncWorkspace,
    onSuccess: (data) => {
      const sessionId = data?.workspace?.sessionId;
      if (sessionId) invalidateSessionWorkspace(queryClient, sessionId);
      toast.success(data?.message || "Workspace resynced");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to resync workspace");
    },
  });
};
