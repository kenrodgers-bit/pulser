import type { ReactNode } from "react";

import { motion } from "framer-motion";

import type { StoryGroup } from "@/types";
import { Avatar } from "../ui/Avatar";

type StoriesBarProps = {
  currentUserId: string;
  stories: StoryGroup[];
  onOpen: (group: StoryGroup) => void;
  leading?: ReactNode;
};

export const StoriesBar = ({
  currentUserId,
  stories,
  onOpen,
  leading,
}: StoriesBarProps) => (
  <div className="scrollbar-hidden flex gap-3 overflow-x-auto pb-1">
    {leading}
    {stories
      .filter((group) => group.user.id !== currentUserId)
      .map((group) => {
      const unseen = group.stories.some(
        (story) => !story.viewers.some((viewer) => viewer.userId === currentUserId),
      );

      return (
        <motion.button
          key={group.user.id}
          className="flex min-w-[4.75rem] flex-col items-center gap-2 text-center"
          onClick={() => onOpen(group)}
          type="button"
          whileTap={{ scale: 0.96 }}
        >
          <motion.div layoutId={`story-circle-${group.user.id}`} className="will-transform">
            <Avatar
              src={group.user.avatarUrl}
              alt={group.user.displayName}
              ring={unseen}
              size="lg"
            />
          </motion.div>
          <span className="line-clamp-2 text-xs text-[var(--muted)]">
            {group.user.displayName}
          </span>
        </motion.button>
      );
    })}
  </div>
);
