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
  <div className={cn("ig-reply-preview", compact && "px-3 py-2")}>
    <Reply className="mt-0.5 h-4 w-4 text-[var(--unread)]" />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-[var(--unread)]">Replying</p>
      <p className="truncate text-sm text-[var(--text-secondary)]">
        {message.type === "text"
          ? message.content
          : `${message.type[0].toUpperCase()}${message.type.slice(1)} attachment`}
      </p>
    </div>
    {onClear ? (
      <button
        className="ig-icon-button h-8 w-8 rounded-full"
        onClick={onClear}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    ) : null}
  </div>
);
