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
  <div className="ig-story-row scrollbar-hidden">
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
            className="ig-story-item"
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
            <span className="ig-story-item__name">{group.user.displayName}</span>
          </motion.button>
        );
      })}
  </div>
);
