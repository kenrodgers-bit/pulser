import { Router } from "express";
import { body } from "express-validator";

import {
  createStory,
  getStories,
  markStoryViewed,
  reactToStory,
  replyToStory,
} from "../controllers/storiesController";
import { requireAuth } from "../middleware/authMiddleware";
import { mediaUpload } from "../middleware/upload";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.use(requireAuth);

// GET /api/stories - Fetch active 24-hour stories for the current user and friends.
router.get("/", getStories);

// POST /api/stories - Upload a new story item.
router.post(
  "/",
  mediaUpload.single("file"),
  body("caption").optional().isString().trim().isLength({ max: 180 }),
  validateRequest,
  createStory,
);

// POST /api/stories/:storyId/view - Mark a story as viewed.
router.post("/:storyId/view", markStoryViewed);

// POST /api/stories/:storyId/reactions - React to a story with an emoji.
router.post(
  "/:storyId/reactions",
  body("emoji").isString().trim().isLength({ min: 1, max: 8 }),
  validateRequest,
  reactToStory,
);

// POST /api/stories/:storyId/reply - Reply to a story by sending a DM.
router.post(
  "/:storyId/reply",
  body("content").isString().trim().isLength({ min: 1, max: 500 }),
  validateRequest,
  replyToStory,
);

export default router;
