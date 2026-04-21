import { Reply, X } from "lucide-react";

import type { Message } from "@/types";
import { cn } from "@/utils/cn";

type ReplyPreviewProps = {
  message: Message;
  compact?: boolean;
  onClear?: () => void;
};

export const ReplyPreview = ({
  message,
  compact = false,
  onClear,
}: ReplyPreviewProps) => (
  <div
    className={cn(
      "relative flex items-start gap-3 overflow-hidden rounded-[12px] border border-white/8 bg-white/5 px-3 py-2",
      compact && "px-2.5 py-2",
    )}
  >
    <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
    <Reply className="mt-0.5 h-4 w-4 text-accent" />
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent/80">
        Replying
      </p>
      <p className="truncate text-sm text-[var(--muted)]">
        {message.type === "text"
          ? message.content
          : `${message.type[0].toUpperCase()}${message.type.slice(1)} attachment`}
      </p>
    </div>
    {onClear ? (
      <button
        className="rounded-full bg-white/6 p-1.5 text-[var(--muted)] transition hover:bg-white/10 hover:text-[var(--ink)]"
        onClick={onClear}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    ) : null}
  </div>
);
