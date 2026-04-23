import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ArrowRight, Plus } from "lucide-react";
import { motion } from "framer-motion";

import { api } from "@/lib/api";
import { ChatList } from "@/components/chat/ChatList";
import { StoriesBar } from "@/components/stories/StoriesBar";
import { StoryUploader } from "@/components/stories/StoryUploader";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import type { StoryGroup } from "@/types";
import { Avatar } from "@/components/ui/Avatar";

export const HomePage = () => {
  const user = useAuthStore((state) => state.user)!;
  const stories = useChatStore((state) => state.stories);
  const chats = useChatStore((state) => state.chats);
  const onlineUserIds = useChatStore((state) => state.onlineUserIds);
  const setStories = useChatStore((state) => state.setStories);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const navigate = useNavigate();
  const pushToast = useUIStore((state) => state.pushToast);

  const ownStoryGroup = useMemo(
    () => stories.find((group) => group.user.id === user.id) ?? null,
    [stories, user.id],
  );

  const refreshStories = async () => {
    const response = await api.get("/stories");
    setStories(response.data.data.stories as StoryGroup[]);
  };

  return (
    <>
      <PageTransition className="space-y-4">
        <section className="ig-panel">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="ig-section-label">Home</p>
              <h2 className="ig-section-title mt-3">
                Stories, chats, and night-shift updates
              </h2>
              <p className="ig-copy mt-3 max-w-2xl">
                Keep your circle moving with polished stories, private chats, view-once
                media, and an installable dark-mode shell that feels native on mobile and
                desktop.
              </p>
            </div>
            <div className="hidden lg:block">
              <StoryUploader onUploaded={refreshStories} />
            </div>
          </div>

          <div className="mt-6 rounded-[20px] border border-[var(--border-soft)] bg-[var(--bg-surface)]">
            <StoriesBar
              currentUserId={user.id}
              stories={stories}
              onOpen={(group) => setActiveStoryGroup(group)}
              leading={
                ownStoryGroup ? (
                  <motion.button
                    className="ig-story-item"
                    onClick={() => setActiveStoryGroup(ownStoryGroup)}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                  >
                    <motion.div layoutId={`story-circle-${user.id}`}>
                      <Avatar src={user.avatarUrl} alt={user.displayName} size="lg" />
                    </motion.div>
                    <span className="ig-story-item__name">Your story</span>
                  </motion.button>
                ) : (
                  <StoryUploader
                    onUploaded={refreshStories}
                    trigger={(open) => (
                      <motion.button
                        className="ig-story-item"
                        onClick={open}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                      >
                        <div className="grid h-[52px] w-[52px] place-items-center rounded-full border border-dashed border-[var(--border)] bg-[var(--bg-surface)]">
                          <Plus className="h-4 w-4 text-[var(--unread)]" />
                        </div>
                        <span className="ig-story-item__name">Your story</span>
                      </motion.button>
                    )}
                  />
                )
              }
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="ig-panel">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="ig-section-label">Conversations</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Tap back into the thread exactly where it left off.
                </p>
              </div>
              <Button variant="secondary" onClick={() => navigate("/discover?compose=1")}>
                New chat
              </Button>
            </div>

            <div className="lg:hidden">
              <ChatList chats={chats} currentUser={user} onlineUserIds={onlineUserIds} />
            </div>

            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
              <div className="ig-stat-card">
                <p className="text-sm text-[var(--text-secondary)]">Story rails</p>
                <p className="ig-stat-card__value">{stories.length}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Active across your graph right now.
                </p>
              </div>
              <div className="ig-stat-card">
                <p className="text-sm text-[var(--text-secondary)]">Open chats</p>
                <p className="ig-stat-card__value">{chats.length}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Ready to reopen instantly.
                </p>
              </div>
            </div>

            {chats.length === 0 ? (
              <div className="mt-5 ig-empty-state">
                <div className="ig-empty-art" />
                <p className="text-[15px] text-[var(--text-secondary)]">No messages yet</p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Search for friends to start chatting.
                </p>
                <Button onClick={() => navigate("/discover")}>Find Friends</Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <section className="ig-panel">
              <p className="ig-section-label">Quick launch</p>
              <div className="mt-4 space-y-3">
                {[
                  {
                    title: "Find friends",
                    copy: "Search usernames, accept requests, and open fresh DMs.",
                    to: "/discover",
                  },
                  {
                    title: "Browse channels",
                    copy: "Jump into public broadcasts or manage private invites.",
                    to: "/channels",
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    className="ig-list-row w-full text-left"
                    onClick={() => navigate(item.to)}
                    type="button"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.copy}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--unread)]" />
                  </button>
                ))}
              </div>
            </section>

            <section className="ig-panel">
              <p className="ig-section-label">Tonight on Pulse</p>
              <ul className="mt-4 space-y-4 text-sm text-[var(--text-secondary)]">
                <li>{stories.length} story rails are active for your circle.</li>
                <li>{chats.length} chats are synced and ready to reopen instantly.</li>
                <li>View Once media is ready the moment you attach a photo or video.</li>
              </ul>
            </section>
          </div>
        </section>
      </PageTransition>

      <StoryViewer
        open={Boolean(activeStoryGroup)}
        group={activeStoryGroup}
        onClose={() => setActiveStoryGroup(null)}
        onViewed={async (storyId) => {
          await api.post(`/stories/${storyId}/view`);
        }}
        onReact={async (storyId, emoji) => {
          await api.post(`/stories/${storyId}/reactions`, { emoji });
        }}
        onReply={async (storyId, content) => {
          await api.post(`/stories/${storyId}/reply`, { content });
          pushToast({
            title: "Story reply sent",
            description: "Your reply landed in that chat instantly.",
          });
        }}
      />
    </>
  );
};
