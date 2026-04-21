import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";

import { canDownloadMedia } from "@/lib/cloudinary";
import { useUIStore } from "@/store/uiStore";
import { Button } from "../ui/Button";

export const MediaViewer = () => {
  const viewer = useUIStore((state) => state.mediaViewer);
  const close = useUIStore((state) => state.closeMediaViewer);
  const [privacyReminder, setPrivacyReminder] = useState("");

  useEffect(() => {
    if (!viewer.open || !viewer.warning) {
      setPrivacyReminder("");
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") {
        setPrivacyReminder(
          "Browsers may still allow screenshots or screen recording. View Once mainly limits replay inside Pulse.",
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setPrivacyReminder(
          "This media is marked View Once, but web browsers cannot fully block capture outside the app.",
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [viewer.open, viewer.warning]);

  return (
    <AnimatePresence>
      {viewer.open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col bg-black/95 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{viewer.title ?? "Media viewer"}</p>
              {viewer.warning || privacyReminder ? (
                <p className="mt-1 text-sm text-amber-300">
                  {viewer.warning ?? privacyReminder}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {viewer.src && viewer.type && canDownloadMedia(viewer.type) ? (
                <a
                  href={viewer.src}
                  download
                  className="rounded-full bg-white/6 p-2.5 text-[var(--ink)] transition hover:bg-white/12"
                >
                  <Download className="h-4 w-4" />
                </a>
              ) : null}
              <button
                className="rounded-full bg-white/6 p-2.5 text-[var(--ink)] transition hover:bg-white/12"
                onClick={close}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-1 items-center justify-center" onClick={(event) => event.stopPropagation()}>
            {viewer.type === "video" ? (
              <motion.video
                layoutId={viewer.layoutId}
                className="max-h-full max-w-full rounded-[10px] object-contain"
                controls
                autoPlay
                playsInline
                src={viewer.src}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(_event, info) => {
                  if (Math.abs(info.offset.y) > 140) {
                    close();
                  }
                }}
              />
            ) : (
              <motion.img
                layoutId={viewer.layoutId}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(_event, info) => {
                  if (Math.abs(info.offset.y) > 120) {
                    close();
                  }
                }}
                className="max-h-full max-w-full rounded-[10px] object-contain"
                src={viewer.src}
                alt={viewer.title ?? "Media"}
              />
            )}
          </div>

          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={close}>
              Dismiss
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
