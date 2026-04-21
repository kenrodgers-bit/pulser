import { validateUploadedFile } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";
import {
  buildMediaPreviewUrl,
  uploadBufferToCloudinary,
} from "../utils/cloudinaryUpload";
import { AppError, sendSuccess } from "../utils/http";

export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("A file is required.");
  }

  validateUploadedFile(req.file);

  const mediaType = req.file.mimetype.startsWith("image/")
    ? "image"
    : req.file.mimetype.startsWith("video/")
      ? "video"
      : req.file.mimetype.startsWith("audio/")
        ? "audio"
        : "file";

  const upload = await uploadBufferToCloudinary(req.file.buffer, {
    folder: "pulse/uploads",
    resourceType:
      mediaType === "image"
        ? "image"
        : mediaType === "video"
          ? "video"
          : "raw",
    filename: req.file.originalname,
  });

  sendSuccess(
    res,
    {
      url: upload.secure_url,
      publicId: upload.public_id,
      previewUrl:
        mediaType === "image" || mediaType === "video"
          ? buildMediaPreviewUrl(upload.public_id, mediaType)
          : null,
      mediaType,
      size: req.file.size,
      originalName: req.file.originalname,
    },
    201,
  );
});
