import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { Camera, FileImage, FileVideo, Paperclip, X } from "lucide-react";

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

  const placeholderTiles = Array.from({ length: 9 }, (_, index) => ({
    id: `${activeTab}-${index}`,
    icon:
      activeTab === "Videos" ? (
        <FileVideo className="h-5 w-5" />
      ) : activeTab === "Files" ? (
        <Paperclip className="h-5 w-5" />
      ) : activeTab === "Camera" ? (
        <Camera className="h-5 w-5" />
      ) : (
        <FileImage className="h-5 w-5" />
      ),
  }));

  return (
    <div className="space-y-4">
      <div
        className="ig-segmented"
        style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
      >
        {pickerTabs.map((tab) => (
          <button
            key={tab}
            className="ig-segmented__option"
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {activeTab === tab ? (
              <motion.span
                className="ig-segmented__indicator"
                layoutId="pulse-picker-tab"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                style={{ width: "calc(20% - 4px)" }}
              />
            ) : null}
            <span className={`relative z-10 ${activeTab === tab ? "text-white" : ""}`}>
              {tab}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-elevated)]">
        {placeholderTiles.map((tile) => (
          <button
            key={tile.id}
            className="flex aspect-square items-center justify-center border-[0.5px] border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            type="button"
          >
            {tile.icon}
          </button>
        ))}
      </div>

      <div className="ig-soft-card p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-[14px] border border-dashed border-[var(--border)] px-4 py-4 text-sm text-[var(--text-secondary)] transition hover:border-[var(--unread)]">
            {file?.type.startsWith("image/") ? (
              <FileImage className="h-4 w-4 text-[var(--unread)]" />
            ) : file?.type.startsWith("video/") ? (
              <FileVideo className="h-4 w-4 text-[var(--unread)]" />
            ) : activeTab === "Camera" ? (
              <Camera className="h-4 w-4 text-[var(--unread)]" />
            ) : (
              <Paperclip className="h-4 w-4 text-[var(--unread)]" />
            )}
            <span className="truncate">
              {file ? file.name : "Choose photo, video, audio, or file"}
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
            <button className="ig-icon-button" onClick={() => onFileChange(null)} type="button">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file?.name ?? "Preview"}
            className="mt-4 h-40 w-full rounded-[14px] object-cover"
          />
        ) : null}

        {file?.type.startsWith("image/") || file?.type.startsWith("video/") ? (
          <div className="mt-4">
            <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={file?.name ?? "Selected file"}
                className="h-full w-full rounded-[12px] object-cover"
              />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {file?.name ?? "No media selected"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Caption comes from the message composer below.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
