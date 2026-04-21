import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X,
} from "lucide-react";

import type { StoryGroup } from "@/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

type StoryViewerProps = {
  open: boolean;
  group: StoryGroup | null;
  onClose: () => void;
  onReact: (storyId: string, emoji: string) => void;
  onReply: (storyId: string, content: string) => void;
  onViewed: (storyId: string) => void;
};

const reactionChoices = [
  "❤️",
  "🔥",
  "😍",
  "👏",
] as const;

export const StoryViewer = ({
  open,
  group,
  onClose,
  onReact,
  onReply,
  onViewed,
}: StoryViewerProps) => {
  const [index, setIndex] = useState(0);
  const [reply, setReply] = useState("");
  const story = useMemo(() => group?.stories[index] ?? null, [group, index]);

  const stopViewerDrag = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleReaction = (emoji: string) => {
    if (!story) {
      return;
    }

    const normalizedEmoji = emoji.trim();

    if (!normalizedEmoji) {
      return;
    }

    void onReact(story.id, normalizedEmoji);
  };

  const handleReply = () => {
    if (!story) {
      return;
    }

    const content = reply.trim();

    if (!content) {
      return;
    }

    void onReply(story.id, content);
    setReply("");
  };

  useEffect(() => {
    setIndex(0);
  }, [group?.user.id]);

  useEffect(() => {
    if (!story) {
      return;
    }

    void onViewed(story.id);
  }, [onViewed, story]);

  return (
    <AnimatePresence>
      {open && group && story ? (
        <motion.div
          className="fixed inset-0 z-[75] bg-black/95 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="mx-auto flex h-full max-w-3xl flex-col"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onClick={(event) => event.stopPropagation()}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 140 || info.velocity.y > 700) {
                onClose();
              }
            }}
          >
            <div className="mb-4 flex gap-1">
              {group.stories.map((item, itemIndex) => (
                <div
                  key={item.id}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"
                >
                  <motion.div
                    className="h-full bg-white"
                    animate={{ width: itemIndex <= index ? "100%" : "0%" }}
                    transition={{ duration: 0.25 }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <motion.div layoutId={`story-circle-${group.user.id}`}>
                  <Avatar src={group.user.avatarUrl} alt={group.user.displayName} />
                </motion.div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{group.user.displayName}</p>
                  <p className="truncate text-sm text-[var(--muted)]">@{group.user.username}</p>
                </div>
              </div>
              <button
                className="rounded-full bg-white/6 p-2 text-[var(--ink)] transition hover:bg-white/10"
                onClick={onClose}
                onPointerDown={stopViewerDrag}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-1 items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={story.id}
                  className="relative w-full overflow-hidden rounded-[20px] border border-white/10 bg-white/4"
                  initial={{ scale: 0.92, opacity: 0.35 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0.2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {story.mediaType === "video" ? (
                    <video
                      autoPlay
                      controls
                      playsInline
                      className="max-h-[62vh] w-full object-contain"
                      src={story.mediaUrl}
                    />
                  ) : (
                    <img
                      src={story.mediaUrl}
                      alt={story.caption ?? group.user.displayName}
                      className="max-h-[62vh] w-full object-contain"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-5 space-y-4">
              {story.caption ? (
                <p className="text-sm text-[var(--muted)]">{story.caption}</p>
              ) : null}

              <div className="flex gap-2" onPointerDown={stopViewerDrag}>
                {reactionChoices.map((emoji) => (
                  <motion.button
                    key={emoji}
                    className="rounded-full bg-white/6 px-3 py-2 text-lg transition hover:bg-white/10"
                    onClick={() => handleReaction(emoji)}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-3" onPointerDown={stopViewerDrag}>
                <input
                  className="h-12 flex-1 rounded-[12px] border border-border bg-white/6 px-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
                  placeholder="Reply to this story..."
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleReply();
                    }
                  }}
                />
                <Button
                  iconLeft={<MessageCircle className="h-4 w-4" />}
                  onClick={handleReply}
                >
                  Send
                </Button>
              </div>

              <div
                className="flex items-center justify-between"
                onPointerDown={stopViewerDrag}
              >
                <Button
                  variant="ghost"
                  iconLeft={<ChevronLeft className="h-4 w-4" />}
                  onClick={() => setIndex((value) => Math.max(value - 1, 0))}
                  disabled={index === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  iconLeft={<ChevronRight className="h-4 w-4" />}
                  onClick={() =>
                    setIndex((value) => Math.min(value + 1, group.stories.length - 1))
                  }
                  disabled={index === group.stories.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
