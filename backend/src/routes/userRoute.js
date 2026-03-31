import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  completeOnboarding,
  getCurrentUser,
  getTeacherById,
  getTeachers,
  updateProfile,
  updateRole,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", protectRoute, getCurrentUser);
router.post("/onboarding", protectRoute, completeOnboarding);
router.patch("/role", protectRoute, updateRole);
router.patch("/profile", protectRoute, updateProfile);
router.get("/teachers", protectRoute, getTeachers);
router.get("/teachers/:id", protectRoute, getTeacherById);

export default router;
