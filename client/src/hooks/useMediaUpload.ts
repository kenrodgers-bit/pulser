import { useState } from "react";

import { api } from "@/lib/api";

export const useMediaUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadMedia = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);

    try {
      const response = await api.post("/media/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data.data as {
        url: string;
        publicId: string;
        previewUrl?: string | null;
        mediaType: string;
      };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadMedia,
  };
};
