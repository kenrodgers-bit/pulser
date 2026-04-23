import { useEffect, useRef } from "react";

import { motion } from "framer-motion";
import { Download, Eye, FileAudio, FileText, Lock, PlayCircle } from "lucide-react";

import type { Message } from "@/types";
import { cn } from "@/utils/cn";

type MediaMessageProps = {
  message: Message;
  isOwn: boolean;
  onOpen: () => void;
};

const ViewOnceCanvasPreview = ({ previewUrl }: { previewUrl?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const computedStyles = getComputedStyle(document.documentElement);
    const elevatedSurface = computedStyles.getPropertyValue("--bg-elevated").trim();
    const accentSecondary =
      computedStyles.getPropertyValue("--pulse-accent2").trim() || elevatedSurface;
    const baseSurface = computedStyles.getPropertyValue("--bg-base").trim();

    const drawFallback = () => {
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, elevatedSurface);
      gradient.addColorStop(0.55, accentSecondary);
      gradient.addColorStop(1, baseSurface);
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    };

    drawFallback();

    if (!previewUrl) {
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      context.filter = "blur(12px)";
      context.drawImage(image, -14, -14, canvas.width + 28, canvas.height + 28);
      context.filter = "none";
      context.fillStyle = "rgba(0, 0, 0, 0.44)";
      context.fillRect(0, 0, canvas.width, canvas.height);
    };
    image.onerror = drawFallback;
    image.src = previewUrl;
  }, [previewUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={440}
      height={440}
      aria-label="View Once media preview"
      className="h-56 w-56 max-w-full rounded-[14px]"
    />
  );
};

export const MediaMessage = ({ message, isOwn, onOpen }: MediaMessageProps) => {
  const isImage = message.type === "image";
  const isVideo = message.type === "video";
  const preview = message.metadata?.previewUrl || message.metadata?.thumbnailUrl;
  const unopenedViewOnce =
    message.viewMode === "once" &&
    !isOwn &&
    !message.metadata?.wasOpened &&
    !message.content;
  const formattedSize = message.metadata?.size
    ? `${(message.metadata.size / 1024 / 1024).toFixed(
        message.metadata.size > 1024 * 1024 ? 1 : 2,
      )} MB`
    : null;

  if (message.type === "audio") {
    return (
      <div className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileAudio className="h-4 w-4 text-[var(--unread)]" />
          {message.metadata?.originalName ?? "Voice note"}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pulse-accent2)] text-[var(--white)]">
            <PlayCircle className="h-4 w-4" />
          </div>
          <div className="flex flex-1 items-end gap-1">
            {Array.from({ length: 20 }).map((_, index) => (
              <span
                key={index}
                className="rounded-full"
                style={{
                  width: 4,
                  height: 10 + ((index * 7) % 20),
                  background: index < 8 ? "var(--pulse-accent2)" : "var(--border)",
                }}
              />
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          {formattedSize ?? "Audio attachment"}
        </p>
        {message.content ? (
          <audio className="mt-3 w-full" controls preload="metadata" src={message.content} />
        ) : (
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            This voice note is no longer available.
          </p>
        )}
      </div>
    );
  }

  if (!isImage && !isVideo) {
    return (
      <div className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-[var(--unread)]" />
          {message.metadata?.originalName ?? "Attachment"}
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {formattedSize ?? message.metadata?.mimeType ?? "Tap below to open or download."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {message.content ? (
            <>
              <a
                className="ig-pill"
                download={message.metadata?.originalName}
                href={message.content}
                rel="noreferrer"
                target="_blank"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
              <button className="ig-pill" onClick={onOpen} type="button">
                Open
              </button>
            </>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">
              This attachment is no longer available.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.button className="ig-media-card group" onClick={onOpen} type="button" whileTap={{ scale: 0.98 }}>
      {unopenedViewOnce ? (
        <ViewOnceCanvasPreview previewUrl={preview} />
      ) : preview ? (
        isVideo && !message.content ? (
          <div className="relative">
            <video className="max-h-[220px] w-full object-cover opacity-70 blur-[2px]" muted src={preview} />
            <PlayCircle className="absolute inset-0 m-auto h-10 w-10 text-[var(--white)]" />
          </div>
        ) : (
          <motion.img
            layoutId={`media-${message.id}`}
            src={message.content || preview}
            alt={message.metadata?.originalName ?? "Media"}
            className={cn(
              "max-h-[220px] w-full object-cover transition duration-300",
              !message.content && "scale-105 blur-[12px]",
            )}
          />
        )
      ) : (
        <div className="grid h-56 w-56 place-items-center bg-[var(--bg-elevated)]">
          <Eye className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
      )}

      {message.viewMode === "once" && !isOwn ? (
        <div className="ig-media-card__overlay">
          <div className="flex justify-end">
            <span className="rounded-full bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--white)]">
              View Once
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--white)]">
              <Lock className="h-3.5 w-3.5" />
              {message.metadata?.wasOpened ? "Opened" : "Tap to reveal"}
            </div>
            <div className="rounded-full bg-white/14 px-3 py-1 text-xs text-[var(--white)]">
              <Eye className="inline h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      ) : null}
    </motion.button>
  );
};
