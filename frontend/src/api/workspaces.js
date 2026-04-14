import axiosInstance from "../lib/axios";

export const workspaceApi = {
  getMyWorkspace: async (sessionId) => {
    const response = await axiosInstance.get(`/workspaces/sessions/${sessionId}/me`);
    return response.data;
  },

  getSessionWorkspaces: async (sessionId) => {
    const response = await axiosInstance.get(`/workspaces/sessions/${sessionId}`);
    return response.data;
  },

  bootstrapSessionWorkspaces: async (sessionId) => {
    const response = await axiosInstance.post(`/workspaces/sessions/${sessionId}/bootstrap`);
    return response.data;
  },

  createFreshWorkspaceSet: async (sessionId) => {
    const response = await axiosInstance.post(`/workspaces/sessions/${sessionId}/fresh`);
    return response.data;
  },

  publishLessonSnapshot: async (sessionId) => {
    const response = await axiosInstance.post(`/workspaces/sessions/${sessionId}/publish`);
    return response.data;
  },

  forceResyncFollowers: async (sessionId) => {
    const response = await axiosInstance.post(`/workspaces/sessions/${sessionId}/force-resync`);
    return response.data;
  },

  forceDetachFollowers: async (sessionId) => {
    const response = await axiosInstance.post(`/workspaces/sessions/${sessionId}/force-detach`);
    return response.data;
  },

  updateFile: async ({ workspaceId, path, content, activeFilePath }) => {
    const response = await axiosInstance.patch(`/workspaces/${workspaceId}/files`, {
      path,
      content,
      activeFilePath,
    });
    return response.data;
  },

  createFile: async ({ workspaceId, path, content = "", language = "plaintext" }) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/files`, {
      path,
      content,
      language,
    });
    return response.data;
  },

  deleteFile: async ({ workspaceId, path }) => {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/files`, {
      params: { path },
    });
    return response.data;
  },

  followWorkspace: async ({ workspaceId, sessionId }) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/follow`, {});
    return { ...response.data, sessionId };
  },

  detachWorkspace: async ({ workspaceId, sessionId, intent }) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/detach`, { intent });
    return { ...response.data, sessionId };
  },

  resyncWorkspace: async ({ workspaceId, sessionId }) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/resync`, {});
    return { ...response.data, sessionId };
  },
};
