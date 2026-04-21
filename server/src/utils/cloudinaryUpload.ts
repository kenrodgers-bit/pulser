import { Readable } from "node:stream";

import { v2 as cloudinary } from "cloudinary";

import { env } from "../config/env";
import { AppError } from "./http";

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export const ensureCloudinaryConfigured = () => {
  if (
    !env.cloudinary.cloudName ||
    !env.cloudinary.apiKey ||
    !env.cloudinary.apiSecret
  ) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      500,
    );
  }
};

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  options: {
    folder: string;
    resourceType?: "image" | "video" | "raw" | "auto";
    filename?: string;
  },
) => {
  ensureCloudinaryConfigured();

  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType ?? "auto",
        use_filename: Boolean(options.filename),
        unique_filename: true,
        filename_override: options.filename,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve(result);
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

export const buildMediaPreviewUrl = (
  publicId: string,
  mediaType: "image" | "video",
) =>
  cloudinary.url(publicId, {
    secure: true,
    resource_type: mediaType === "video" ? "video" : "image",
    transformation:
      mediaType === "video"
        ? [
            { start_offset: "0" },
            { width: 960, crop: "limit" },
            { effect: "blur:1500" },
            { quality: "auto:low" },
          ]
        : [
            { width: 960, crop: "limit" },
            { effect: "blur:1500" },
            { quality: "auto:low" },
          ],
  });
