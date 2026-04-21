import { Router } from "express";

import {
  getNotifications,
  markNotificationRead,
} from "../controllers/notificationsController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);

// GET /api/notifications - Fetch recent in-app notifications for the current user.
router.get("/", getNotifications);

// POST /api/notifications/:notificationId/read - Mark a notification as read.
router.post("/:notificationId/read", markNotificationRead);

export default router;
