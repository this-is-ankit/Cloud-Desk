import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  approveEnrollment,
  archiveCourse,
  createAssignment,
  createClassSession,
  createCourse,
  getCourseById,
  getCourses,
  joinCourseWithInvite,
  publishCourse,
  rejectEnrollment,
  requestEnrollment,
  reviewAssignmentSubmission,
  startClassSession,
  startPersistentRoom,
  submitAssignment,
  updateClassSession,
  updateCourse,
} from "../controllers/courseController.js";

const router = express.Router();

router.get("/", protectRoute, getCourses);
router.post("/", protectRoute, createCourse);
router.get("/:id", protectRoute, getCourseById);
router.patch("/:id", protectRoute, updateCourse);
router.post("/:id/publish", protectRoute, publishCourse);
router.post("/:id/archive", protectRoute, archiveCourse);
router.post("/:id/enrollment-request", protectRoute, requestEnrollment);
router.post("/:id/join-invite", protectRoute, joinCourseWithInvite);
router.post("/:id/enrollments/:enrollmentId/approve", protectRoute, approveEnrollment);
router.post("/:id/enrollments/:enrollmentId/reject", protectRoute, rejectEnrollment);
router.post("/:id/classes", protectRoute, createClassSession);
router.patch("/:id/classes/:classId", protectRoute, updateClassSession);
router.post("/:id/classes/:classId/start", protectRoute, startClassSession);
router.post("/:id/persistent-room/start", protectRoute, startPersistentRoom);
router.post("/:id/assignments", protectRoute, createAssignment);
router.post("/:id/assignments/:assignmentId/submissions", protectRoute, submitAssignment);
router.post("/:id/assignments/:assignmentId/submissions/:submissionId/review", protectRoute, reviewAssignmentSubmission);

export default router;
