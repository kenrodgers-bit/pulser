import { motion } from "framer-motion";
import { Download, Eye, FileAudio, FileText, Lock, PlayCircle } from "lucide-react";

import type { Message } from "@/types";
import { cn } from "@/utils/cn";

type MediaMessageProps = {
  message: Message;
  isOwn: boolean;
  onOpen: () => void;
};

export const MediaMessage = ({
  message,
  isOwn,
  onOpen,
}: MediaMessageProps) => {
  const isImage = message.type === "image";
  const isVideo = message.type === "video";
  const preview = message.metadata?.previewUrl || message.metadata?.thumbnailUrl;
  const formattedSize = message.metadata?.size
    ? `${(message.metadata.size / 1024 / 1024).toFixed(message.metadata.size > 1024 * 1024 ? 1 : 2)} MB`
    : null;

  if (message.type === "audio") {
    return (
      <div className="w-full rounded-[1.4rem] border border-white/10 bg-white/6 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileAudio className="h-4 w-4 text-accent" />
          {message.metadata?.originalName ?? "Voice note"}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {formattedSize ?? "Audio attachment"}
        </p>
        {message.content ? (
          <audio
            controls
            className="mt-3 w-full"
            preload="metadata"
            src={message.content}
          />
        ) : (
          <p className="mt-3 text-xs text-[var(--muted)]">
            This voice note is no longer available.
          </p>
        )}
      </div>
    );
  }

  if (!isImage && !isVideo) {
    return (
      <div className="w-full rounded-[1.4rem] border border-white/10 bg-white/6 p-3 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-accent" />
          {message.metadata?.originalName ?? "Attachment"}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {formattedSize ?? message.metadata?.mimeType ?? "Tap below to open or download."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {message.content ? (
            <>
              <a
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-white/14"
                download={message.metadata?.originalName}
                href={message.content}
                rel="noreferrer"
                target="_blank"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
              <button
                className="rounded-full bg-white/6 px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-white/10 hover:text-[var(--ink)]"
                onClick={onOpen}
                type="button"
              >
                Open
              </button>
            </>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              This attachment is no longer available.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.button
      className="group relative overflow-hidden rounded-[10px] border border-white/10"
      onClick={onOpen}
      type="button"
      whileTap={{ scale: 0.98 }}
    >
      {preview ? (
        isVideo && !message.content ? (
          <div className="relative">
            <video className="max-h-[220px] w-full object-cover opacity-70 blur-[2px]" muted src={preview} />
            <PlayCircle className="absolute inset-0 m-auto h-10 w-10 text-white" />
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
        <div className="grid h-56 w-56 place-items-center bg-white/6">
          <Eye className="h-8 w-8 text-[var(--muted)]" />
        </div>
      )}

      {message.viewMode === "once" && !isOwn ? (
        <div className="absolute inset-0 flex flex-col justify-between bg-[linear-gradient(180deg,rgba(13,15,20,0.14),rgba(13,15,20,0.76))] px-4 py-4">
          <div className="flex justify-end">
            <span className="rounded-full bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
              View Once
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              <Lock className="h-3.5 w-3.5" />
              {message.metadata?.wasOpened ? "Opened" : "Tap to reveal"}
            </div>
            <div className="rounded-full bg-white/14 px-3 py-1 text-xs text-white">
              <Eye className="inline h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      ) : null}
    </motion.button>
  );
};
