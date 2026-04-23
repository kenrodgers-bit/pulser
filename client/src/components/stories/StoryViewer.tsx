import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eye, MessageCircle, X } from "lucide-react";

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

const reactionChoices = ["😂", "❤️", "🔥", "😮", "😢"] as const;

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
  const isPhoto = story?.mediaType === "image";

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

  useEffect(() => {
    if (!story || !group || !isPhoto) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIndex((currentIndex) =>
        currentIndex >= group.stories.length - 1 ? currentIndex : currentIndex + 1,
      );
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [group, isPhoto, story]);

  return (
    <AnimatePresence>
      {open && group && story ? (
        <motion.div
          className="fixed inset-0 z-[75] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background:
              "radial-gradient(circle at top, color-mix(in srgb, var(--pulse-accent2) 45%, transparent), transparent 30%), var(--black)",
          }}
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
                <div key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    className="h-full bg-white"
                    animate={{ width: itemIndex <= index ? "100%" : "0%" }}
                    transition={{ duration: 0.25 }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <motion.div layoutId={`story-circle-${group.user.id}`}>
                  <Avatar src={group.user.avatarUrl} alt={group.user.displayName} />
                </motion.div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--white)]">
                    {group.user.displayName}
                  </p>
                  <p className="truncate text-xs text-white/70">@{group.user.username}</p>
                </div>
              </div>
              <button
                className="ig-icon-button"
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
                  className="relative w-full overflow-hidden rounded-[20px] border border-white/10 bg-black/20"
                  initial={{ scale: 0.92, opacity: 0.35 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0.2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {story.mediaType === "video" ? (
                    <video
                      autoPlay
                      controls
                      onEnded={() =>
                        setIndex((currentIndex) =>
                          currentIndex >= group.stories.length - 1
                            ? currentIndex
                            : currentIndex + 1,
                        )
                      }
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
              {story.caption ? <p className="text-sm text-white/80">{story.caption}</p> : null}

              <div className="flex flex-wrap gap-2" onPointerDown={stopViewerDrag}>
                {reactionChoices.map((emoji) => (
                  <motion.button
                    key={emoji}
                    className="rounded-full bg-white/10 px-3 py-2 text-lg text-[var(--white)] transition hover:bg-white/14"
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
                  className="h-12 flex-1 rounded-full border border-white/10 bg-black/30 px-4 text-sm text-[var(--white)] outline-none placeholder:text-white/50"
                  placeholder="Reply to story..."
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleReply();
                    }
                  }}
                />
                <Button iconLeft={<MessageCircle className="h-4 w-4" />} onClick={handleReply}>
                  Send
                </Button>
              </div>

              <div className="flex items-center justify-between" onPointerDown={stopViewerDrag}>
                <p className="text-sm text-white/70">
                  <Eye className="mr-1 inline h-4 w-4" />
                  {story.viewers.length}
                </p>
                <div className="flex items-center gap-2">
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
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
