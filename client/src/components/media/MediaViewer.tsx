import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useGesture } from "@use-gesture/react";
import { Download, X } from "lucide-react";

import { canDownloadMedia } from "@/lib/cloudinary";
import { useUIStore } from "@/store/uiStore";
import { Button } from "../ui/Button";

export const MediaViewer = () => {
  const viewer = useUIStore((state) => state.mediaViewer);
  const close = useUIStore((state) => state.closeMediaViewer);
  const [privacyReminder, setPrivacyReminder] = useState("");
  const [viewerOffset, setViewerOffset] = useState(0);
  const [viewerScale, setViewerScale] = useState(1);

  const mediaGestureBind = useGesture(
    {
      onDrag: ({ down, movement: [, movementY] }) => {
        setViewerOffset(down ? movementY : 0);
      },
      onDragEnd: ({ movement: [, movementY], velocity: [, velocityY] }) => {
        if (Math.abs(movementY) > 120 || Math.abs(velocityY) > 0.8) {
          close();
          return;
        }

        setViewerOffset(0);
      },
      onPinch: ({ offset: [scale] }) => {
        setViewerScale(scale);
      },
      onPinchEnd: ({ offset: [scale] }) => {
        if (scale < 0.84) {
          close();
          return;
        }

        setViewerScale(1);
      },
    },
    {
      drag: {
        axis: "y",
        filterTaps: true,
      },
      pinch: {
        scaleBounds: {
          min: 0.68,
          max: 2.4,
        },
        rubberband: true,
      },
    },
  );

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

  useEffect(() => {
    if (!viewer.open) {
      setViewerOffset(0);
      setViewerScale(1);
    }
  }, [viewer.open]);

  const gestureProps = mediaGestureBind();

  return (
    <AnimatePresence>
      {viewer.open ? (
        <motion.div
          className="ig-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--white)]">
                {viewer.title ?? "Media viewer"}
              </p>
              {viewer.warning || privacyReminder ? (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {viewer.warning ?? privacyReminder}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {viewer.src && viewer.type && canDownloadMedia(viewer.type) ? (
                <a className="ig-icon-button" download href={viewer.src}>
                  <Download className="h-4 w-4" />
                </a>
              ) : null}
              <button className="ig-icon-button" onClick={close} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <motion.div
            className="mt-6 flex flex-1 items-center justify-center"
            style={{
              y: viewerOffset,
              scale: viewerScale,
            }}
            animate={{
              y: viewerOffset,
              scale: viewerScale,
            }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <div
              className="flex flex-1 touch-none items-center justify-center"
              onClick={(event) => event.stopPropagation()}
              {...gestureProps}
            >
              {viewer.type === "video" ? (
                <motion.video
                  autoPlay
                  className="max-h-full max-w-full rounded-[14px] object-contain"
                  controls
                  layoutId={viewer.layoutId}
                  playsInline
                  src={viewer.src}
                />
              ) : (
                <motion.img
                  alt={viewer.title ?? "Media"}
                  className="max-h-full max-w-full rounded-[14px] object-contain"
                  layoutId={viewer.layoutId}
                  src={viewer.src}
                />
              )}
            </div>
          </motion.div>

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
