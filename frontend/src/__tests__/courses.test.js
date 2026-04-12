import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the axios instance before importing the module under test
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock("../lib/axios", () => ({
  default: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
  },
}));

const { courseApi } = await import("../api/courses.js");

describe("courseApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCourses", () => {
    it("GETs /courses with no params by default", async () => {
      const responseData = { courses: [] };
      mockGet.mockResolvedValue({ data: responseData });

      const result = await courseApi.getCourses();

      expect(mockGet).toHaveBeenCalledWith("/courses", { params: {} });
      expect(result).toEqual(responseData);
    });

    it("passes query params to /courses", async () => {
      const responseData = { courses: [] };
      mockGet.mockResolvedValue({ data: responseData });

      const params = { category: "Math", level: "Beginner" };
      await courseApi.getCourses(params);

      expect(mockGet).toHaveBeenCalledWith("/courses", { params });
    });
  });

  describe("createCourse", () => {
    it("POSTs to /courses with provided data", async () => {
      const payload = { title: "My Course", code: "MC101" };
      const responseData = { course: { _id: "c1", ...payload } };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await courseApi.createCourse(payload);

      expect(mockPost).toHaveBeenCalledWith("/courses", payload);
      expect(result).toEqual(responseData);
    });

    it("propagates API errors", async () => {
      mockPost.mockRejectedValue(new Error("403 Forbidden"));
      await expect(courseApi.createCourse({})).rejects.toThrow("403 Forbidden");
    });
  });

  describe("getCourseById", () => {
    it("GETs /courses/:courseId", async () => {
      const responseData = { course: { _id: "c2" } };
      mockGet.mockResolvedValue({ data: responseData });

      const result = await courseApi.getCourseById("c2");

      expect(mockGet).toHaveBeenCalledWith("/courses/c2");
      expect(result).toEqual(responseData);
    });
  });

  describe("updateCourse", () => {
    it("PATCHes /courses/:courseId with data", async () => {
      const data = { title: "Updated Title" };
      const responseData = { course: { _id: "c3", ...data } };
      mockPatch.mockResolvedValue({ data: responseData });

      const result = await courseApi.updateCourse({ courseId: "c3", data });

      expect(mockPatch).toHaveBeenCalledWith("/courses/c3", data);
      expect(result).toEqual(responseData);
    });
  });

  describe("publishCourse", () => {
    it("POSTs to /courses/:courseId/publish", async () => {
      const responseData = { message: "published" };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await courseApi.publishCourse("c4");

      expect(mockPost).toHaveBeenCalledWith("/courses/c4/publish");
      expect(result).toEqual(responseData);
    });
  });

  describe("archiveCourse", () => {
    it("POSTs to /courses/:courseId/archive", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.archiveCourse("c5");

      expect(mockPost).toHaveBeenCalledWith("/courses/c5/archive");
    });
  });

  describe("requestEnrollment", () => {
    it("POSTs to /courses/:courseId/enrollment-request", async () => {
      const responseData = { enrollmentStatus: "pending" };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await courseApi.requestEnrollment("c6");

      expect(mockPost).toHaveBeenCalledWith(
        "/courses/c6/enrollment-request",
      );
      expect(result).toEqual(responseData);
    });
  });

  describe("joinCourseWithInvite", () => {
    it("POSTs to /courses/:courseId/join-invite with inviteCode", async () => {
      const responseData = { enrollmentStatus: "approved" };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await courseApi.joinCourseWithInvite({
        courseId: "c7",
        inviteCode: "INVITE01",
      });

      expect(mockPost).toHaveBeenCalledWith("/courses/c7/join-invite", {
        inviteCode: "INVITE01",
      });
      expect(result).toEqual(responseData);
    });
  });

  describe("approveEnrollment", () => {
    it("POSTs to /courses/:courseId/enrollments/:enrollmentId/approve", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.approveEnrollment({
        courseId: "c8",
        enrollmentId: "e1",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/courses/c8/enrollments/e1/approve",
      );
    });
  });

  describe("rejectEnrollment", () => {
    it("POSTs to /courses/:courseId/enrollments/:enrollmentId/reject", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.rejectEnrollment({ courseId: "c9", enrollmentId: "e2" });

      expect(mockPost).toHaveBeenCalledWith(
        "/courses/c9/enrollments/e2/reject",
      );
    });
  });

  describe("createClassSession", () => {
    it("POSTs to /courses/:courseId/classes with data", async () => {
      const data = { title: "Week 1", scheduledStart: "2026-05-01T10:00:00Z" };
      const responseData = { course: {} };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await courseApi.createClassSession({
        courseId: "c10",
        data,
      });

      expect(mockPost).toHaveBeenCalledWith("/courses/c10/classes", data);
      expect(result).toEqual(responseData);
    });
  });

  describe("updateClassSession", () => {
    it("PATCHes /courses/:courseId/classes/:classId with data", async () => {
      const data = { title: "Updated Week 1" };
      mockPatch.mockResolvedValue({ data: {} });

      await courseApi.updateClassSession({
        courseId: "c11",
        classId: "class-1",
        data,
      });

      expect(mockPatch).toHaveBeenCalledWith(
        "/courses/c11/classes/class-1",
        data,
      );
    });
  });

  describe("startClassSession", () => {
    it("POSTs to /courses/:courseId/classes/:classId/start", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.startClassSession({
        courseId: "c12",
        classId: "class-2",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/courses/c12/classes/class-2/start",
      );
    });
  });

  describe("startPersistentRoom", () => {
    it("POSTs to /courses/:courseId/persistent-room/start", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.startPersistentRoom("c13");

      expect(mockPost).toHaveBeenCalledWith(
        "/courses/c13/persistent-room/start",
      );
    });
  });

  describe("createAssignment", () => {
    it("POSTs to /courses/:courseId/assignments with data", async () => {
      const data = { title: "HW1", dueDate: "2026-05-10" };
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.createAssignment({ courseId: "c14", data });

      expect(mockPost).toHaveBeenCalledWith("/courses/c14/assignments", data);
    });
  });

  describe("submitAssignment", () => {
    it("POSTs to /courses/:courseId/assignments/:assignmentId/submissions with content", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.submitAssignment({
        courseId: "c15",
        assignmentId: "a1",
        content: "My solution",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/courses/c15/assignments/a1/submissions",
        { content: "My solution" },
      );
    });
  });

  describe("reviewAssignmentSubmission", () => {
    it("POSTs to /courses/:courseId/assignments/:assignmentId/submissions/:submissionId/review", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.reviewAssignmentSubmission({
        courseId: "c16",
        assignmentId: "a2",
        submissionId: "sub1",
        feedback: "Great work!",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/courses/c16/assignments/a2/submissions/sub1/review",
        { feedback: "Great work!" },
      );
    });

    it("sends empty feedback when not provided", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await courseApi.reviewAssignmentSubmission({
        courseId: "c17",
        assignmentId: "a3",
        submissionId: "sub2",
        feedback: "",
      });

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        { feedback: "" },
      );
    });
  });
});