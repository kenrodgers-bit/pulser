export const isCloudinaryAsset = (url?: string | null) =>
  Boolean(url && url.includes("res.cloudinary.com"));

export const canDownloadMedia = (type: string) =>
  type === "image" || type === "video" || type === "file";
