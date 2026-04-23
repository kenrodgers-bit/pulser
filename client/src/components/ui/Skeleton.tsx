import { cn } from "@/utils/cn";

type SkeletonBlockProps = {
  className?: string;
};

export const SkeletonBlock = ({ className }: SkeletonBlockProps) => (
  <div className={cn("ig-skeleton rounded-[12px]", className)} />
);

export const ChatListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className="ig-chat-item"
      >
        <SkeletonBlock className="h-[46px] w-[46px] rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-[140px]" />
          <SkeletonBlock className="h-3 w-[80px] opacity-80" />
        </div>
        <SkeletonBlock className="h-3 w-10 opacity-80" />
      </div>
    ))}
  </div>
);

export const MessageListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className={index % 2 === 0 ? "ig-message-row" : "ig-message-row ig-message-row--own"}>
        <SkeletonBlock className={cn("h-16", index % 2 === 0 ? "w-40 rounded-[18px_18px_18px_4px]" : "w-52 rounded-[18px_18px_4px_18px]")} />
      </div>
    ))}
  </div>
);
