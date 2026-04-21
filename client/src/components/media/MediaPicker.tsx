import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { FileImage, FileVideo, Paperclip, X } from "lucide-react";

import type { ViewMode } from "@/types";
import { ViewModeToggle } from "./ViewModeToggle";

type PickerTab = "Recent" | "Photos" | "Videos" | "Files" | "Camera";

type MediaPickerProps = {
  file: File | null;
  viewMode: ViewMode;
  onFileChange: (file: File | null) => void;
  onViewModeChange: (value: ViewMode) => void;
};

const pickerTabs: PickerTab[] = ["Recent", "Photos", "Videos", "Files", "Camera"];

export const MediaPicker = ({
  file,
  viewMode,
  onFileChange,
  onViewModeChange,
}: MediaPickerProps) => {
  const [activeTab, setActiveTab] = useState<PickerTab>("Recent");
  const previewUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : ""),
    [file],
  );

  useEffect(() => {
    if (!file) {
      setActiveTab("Recent");
      return;
    }

    if (file.type.startsWith("image/")) {
      setActiveTab("Photos");
      return;
    }

    if (file.type.startsWith("video/")) {
      setActiveTab("Videos");
      return;
    }

    setActiveTab("Files");
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const accept =
    activeTab === "Photos"
      ? "image/*"
      : activeTab === "Videos"
        ? "video/*"
        : activeTab === "Files"
          ? "audio/*,.pdf,.zip,.doc,.docx"
          : "image/*,video/*,audio/*,.pdf,.zip,.doc,.docx";

  return (
    <div className="space-y-3 rounded-[14px] border border-border bg-white/5 p-3">
      <div className="grid grid-cols-5 gap-2">
        {pickerTabs.map((tab) => (
          <button
            key={tab}
            className="relative overflow-hidden rounded-[10px] px-2 py-2 text-center text-xs font-medium text-[var(--muted)]"
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {activeTab === tab ? (
              <motion.span
                className="absolute inset-0 rounded-[10px] bg-accent/16"
                layoutId="pulse-picker-tab"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
            <span className={`relative z-10 ${activeTab === tab ? "text-white" : ""}`}>
              {tab}
            </span>
          </button>
        ))}
      </div>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={file?.name ?? "Preview"}
          className="h-40 w-full rounded-[10px] object-cover"
        />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-dashed border-border px-3 py-3 text-sm text-[var(--muted)] transition hover:border-accent/40 hover:bg-white/6">
          {file?.type.startsWith("image/") ? (
            <FileImage className="h-4 w-4 text-accent" />
          ) : file?.type.startsWith("video/") ? (
            <FileVideo className="h-4 w-4 text-accent" />
          ) : (
            <Paperclip className="h-4 w-4 text-accent" />
          )}
          <span className="truncate">
            {file ? file.name : "Attach photo, video, audio, or file"}
          </span>
          <input
            className="hidden"
            type="file"
            accept={accept}
            capture={activeTab === "Camera" ? "environment" : undefined}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
        {file ? (
          <button
            className="rounded-full bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-[var(--ink)]"
            onClick={() => onFileChange(null)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {file?.type.startsWith("image/") || file?.type.startsWith("video/") ? (
        <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
      ) : null}

      <div className="rounded-[12px] border border-border bg-white/4 px-4 py-3 text-sm text-[var(--muted)]">
        Caption text comes from the composer. Send when you are ready.
      </div>
    </div>
  );
};
