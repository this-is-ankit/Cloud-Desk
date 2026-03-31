import axiosInstance from "../lib/axios";

export const userApi = {
  getMe: async () => {
    const response = await axiosInstance.get("/users/me");
    return response.data;
  },

  completeOnboarding: async (data) => {
    const response = await axiosInstance.post("/users/onboarding", data);
    return response.data;
  },

  updateRole: async (data) => {
    const response = await axiosInstance.patch("/users/role", data);
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await axiosInstance.patch("/users/profile", data);
    return response.data;
  },

  getTeachers: async (params = {}) => {
    const response = await axiosInstance.get("/users/teachers", { params });
    return response.data;
  },

  getTeacherById: async (teacherId) => {
    const response = await axiosInstance.get(`/users/teachers/${teacherId}`);
    return response.data;
  },
};
