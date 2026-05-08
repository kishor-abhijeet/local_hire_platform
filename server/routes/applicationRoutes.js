import express from "express";
import {
  applyForJob,
  getApplicationsForJob,
  getMyApplications,
  updateApplicationStatus
} from "../controllers/applicationController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:jobId", protect, authorizeRoles("jobseeker"), applyForJob);
router.get("/me", protect, authorizeRoles("jobseeker", "admin"), getMyApplications);
router.get("/job/:jobId", protect, authorizeRoles("employer", "admin"), getApplicationsForJob);
router.patch("/:id/status", protect, authorizeRoles("employer", "admin"), updateApplicationStatus);

export default router;
