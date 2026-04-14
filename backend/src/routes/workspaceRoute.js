import express from "express";

import { protectRoute } from "../middleware/protectRoute.js";
import {
  bootstrapSessionWorkspaces,
  createFreshWorkspaceSet,
  createWorkspaceFile,
  deleteWorkspaceFile,
  forceResyncFollowers,
  getMyWorkspace,
  listSessionWorkspaces,
  publishLessonSnapshot,
  resyncWorkspace,
  setWorkspaceFollowMode,
  updateWorkspaceFile,
  forceDetachFollowers,
  listStudentSnapshots,
} from "../controllers/workspaceController.js";

const router = express.Router();

router.get("/sessions/:sessionId/me", protectRoute, getMyWorkspace);
router.get("/sessions/:sessionId", protectRoute, listSessionWorkspaces);
router.post(
  "/sessions/:sessionId/bootstrap",
  protectRoute,
  bootstrapSessionWorkspaces,
);
router.post(
  "/sessions/:sessionId/fresh",
  protectRoute,
  createFreshWorkspaceSet,
);
router.post(
  "/sessions/:sessionId/publish",
  protectRoute,
  publishLessonSnapshot,
);
router.post(
  "/sessions/:sessionId/force-resync",
  protectRoute,
  forceResyncFollowers,
);
router.post(
  "/sessions/:sessionId/force-detach",
  protectRoute,
  forceDetachFollowers,
);
router.patch("/:id/files", protectRoute, updateWorkspaceFile);
router.post("/:id/files", protectRoute, createWorkspaceFile);
router.delete("/:id/files", protectRoute, deleteWorkspaceFile);
router.post("/:id/follow", protectRoute, (req, res, next) => {
  req.body.followMode = true;
  next();
}, setWorkspaceFollowMode);
router.post("/:id/detach", protectRoute, (req, res, next) => {
  req.body.followMode = false;
  next();
}, setWorkspaceFollowMode);
router.post("/:id/resync", protectRoute, resyncWorkspace);
router.get("/:id/snapshots", protectRoute, listStudentSnapshots);

export default router;
