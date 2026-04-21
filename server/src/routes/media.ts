import { Router } from "express";

import { uploadMedia } from "../controllers/mediaController";
import { requireAuth } from "../middleware/authMiddleware";
import { mediaUpload } from "../middleware/upload";

const router = Router();

router.use(requireAuth);

// POST /api/media/upload - Upload a file to Cloudinary and return the hosted URL.
router.post("/upload", mediaUpload.single("file"), uploadMedia);

export default router;
