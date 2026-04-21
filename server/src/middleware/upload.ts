import multer from "multer";

import { AppError } from "../utils/http";

const memoryStorage = multer.memoryStorage();

const ensureValidMediaSize = (file: Express.Multer.File) => {
  if (file.mimetype.startsWith("video/") && file.size > 50 * 1024 * 1024) {
    throw new AppError("Videos must be 50MB or smaller.", 400);
  }

  if (file.mimetype.startsWith("image/") && file.size > 10 * 1024 * 1024) {
    throw new AppError("Images must be 10MB or smaller.", 400);
  }
};

const mediaFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) => {
  const allowed =
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("audio/") ||
    [
      "application/pdf",
      "application/zip",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.mimetype);

  if (!allowed) {
    callback(new AppError("Unsupported file type.", 400));
    return;
  }

  callback(null, true);
};

export const mediaUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: mediaFilter,
});

export const avatarUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new AppError("Avatars must be images.", 400));
      return;
    }

    callback(null, true);
  },
});

export const validateUploadedFile = (file?: Express.Multer.File | null) => {
  if (!file) {
    return;
  }

  ensureValidMediaSize(file);
};
