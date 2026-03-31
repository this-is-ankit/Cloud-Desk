import axiosInstance from "../lib/axios";

export const courseApi = {
  getCourses: async (params = {}) => {
    const response = await axiosInstance.get("/courses", { params });
    return response.data;
  },

  createCourse: async (data) => {
    const response = await axiosInstance.post("/courses", data);
    return response.data;
  },

  getCourseById: async (courseId) => {
    const response = await axiosInstance.get(`/courses/${courseId}`);
    return response.data;
  },

  updateCourse: async ({ courseId, data }) => {
    const response = await axiosInstance.patch(`/courses/${courseId}`, data);
    return response.data;
  },

  publishCourse: async (courseId) => {
    const response = await axiosInstance.post(`/courses/${courseId}/publish`);
    return response.data;
  },

  archiveCourse: async (courseId) => {
    const response = await axiosInstance.post(`/courses/${courseId}/archive`);
    return response.data;
  },

  requestEnrollment: async (courseId) => {
    const response = await axiosInstance.post(`/courses/${courseId}/enrollment-request`);
    return response.data;
  },

  approveEnrollment: async ({ courseId, enrollmentId }) => {
    const response = await axiosInstance.post(`/courses/${courseId}/enrollments/${enrollmentId}/approve`);
    return response.data;
  },

  rejectEnrollment: async ({ courseId, enrollmentId }) => {
    const response = await axiosInstance.post(`/courses/${courseId}/enrollments/${enrollmentId}/reject`);
    return response.data;
  },

  createClassSession: async ({ courseId, data }) => {
    const response = await axiosInstance.post(`/courses/${courseId}/classes`, data);
    return response.data;
  },

  updateClassSession: async ({ courseId, classId, data }) => {
    const response = await axiosInstance.patch(`/courses/${courseId}/classes/${classId}`, data);
    return response.data;
  },

  startClassSession: async ({ courseId, classId }) => {
    const response = await axiosInstance.post(`/courses/${courseId}/classes/${classId}/start`);
    return response.data;
  },

  startPersistentRoom: async (courseId) => {
    const response = await axiosInstance.post(`/courses/${courseId}/persistent-room/start`);
    return response.data;
  },

  createAssignment: async ({ courseId, data }) => {
    const response = await axiosInstance.post(`/courses/${courseId}/assignments`, data);
    return response.data;
  },

  submitAssignment: async ({ courseId, assignmentId, content }) => {
    const response = await axiosInstance.post(`/courses/${courseId}/assignments/${assignmentId}/submissions`, {
      content,
    });
    return response.data;
  },

  reviewAssignmentSubmission: async ({ courseId, assignmentId, submissionId, feedback }) => {
    const response = await axiosInstance.post(
      `/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/review`,
      { feedback },
    );
    return response.data;
  },
};
