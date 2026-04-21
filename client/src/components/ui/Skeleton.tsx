import { cn } from "@/utils/cn";

type SkeletonBlockProps = {
  className?: string;
};

export const SkeletonBlock = ({ className }: SkeletonBlockProps) => (
  <div className={cn("skeleton-shimmer rounded-[1rem]", className)} />
);

export const ChatListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className="glass-panel flex items-center gap-3 rounded-[1.35rem] px-3 py-3"
      >
        <SkeletonBlock className="h-11 w-11 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-3 w-40 opacity-80" />
        </div>
        <SkeletonBlock className="h-3 w-10 opacity-80" />
      </div>
    ))}
  </div>
);

export const MessageListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
      >
        <SkeletonBlock
          className={`h-16 ${
            index % 2 === 0 ? "bubble-other w-40" : "bubble-own w-52"
          }`}
        />
      </div>
    ))}
  </div>
);
