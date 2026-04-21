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
        <section className="glass-panel rounded-[20px] p-4 md:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
                Home
              </p>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.03em]">
                Stories, chats, and late-night updates
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
                Keep your closest circle moving with story drops, view-once photos,
                and instant chat handoff across mobile and desktop.
              </p>
            </div>
            <div className="hidden lg:block">
              <StoryUploader onUploaded={refreshStories} />
            </div>
          </div>

          <div className="mt-6">
            <StoriesBar
              currentUserId={user.id}
              stories={stories}
              onOpen={(group) => setActiveStoryGroup(group)}
              leading={
                ownStoryGroup ? (
                  <motion.button
                    className="flex min-w-[4.75rem] flex-col items-center gap-2 text-center"
                    onClick={() => setActiveStoryGroup(ownStoryGroup)}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                  >
                    <motion.div layoutId={`story-circle-${user.id}`}>
                      <Avatar src={user.avatarUrl} alt={user.displayName} size="lg" />
                    </motion.div>
                    <span className="line-clamp-2 text-xs text-[var(--muted)]">Your story</span>
                  </motion.button>
                ) : (
                  <StoryUploader
                    onUploaded={refreshStories}
                    trigger={(open) => (
                      <motion.button
                        className="flex min-w-[4.75rem] flex-col items-center gap-2 text-center"
                        onClick={open}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                      >
                        <div className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-border bg-white/4">
                          <Plus className="h-5 w-5 text-accent" />
                        </div>
                        <span className="line-clamp-2 text-xs text-[var(--muted)]">Your story</span>
                      </motion.button>
                    )}
                  />
                )
              }
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="glass-panel rounded-[20px] p-4 md:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
                  Conversations
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Pick up exactly where the thread stopped.
                </p>
              </div>
              <Button variant="secondary" onClick={() => navigate("/discover?compose=1")}>
                New chat
              </Button>
            </div>

            <div className="lg:hidden">
              <ChatList chats={chats} currentUser={user} onlineUserIds={onlineUserIds} />
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-border bg-white/4 p-4">
                <p className="text-sm font-semibold">Story rails</p>
                <p className="mt-3 font-heading text-4xl font-semibold">
                  {stories.length}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Active across your friend graph right now.
                </p>
              </div>
              <div className="rounded-[16px] border border-border bg-white/4 p-4">
                <p className="text-sm font-semibold">Open chats</p>
                <p className="mt-3 font-heading text-4xl font-semibold">
                  {chats.length}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Synced and ready across screens.
                </p>
              </div>
            </div>

            {chats.length === 0 ? (
              <div className="mt-5 rounded-[18px] border border-dashed border-border bg-white/4 px-6 py-10 text-center">
                <div className="mx-auto mb-5 h-20 w-20 rounded-[22px] border border-border bg-white/4" />
                <p className="font-heading text-2xl font-semibold">No conversations yet</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Search for friends and start chatting.
                </p>
                <Button className="mt-5" onClick={() => navigate("/discover")}>
                  Find Friends
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <section className="glass-panel rounded-[20px] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
                Quick launch
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  {
                    title: "Find friends",
                    copy: "Search usernames, accept requests, and open fresh DMs.",
                    to: "/discover",
                  },
                  {
                    title: "Browse channels",
                    copy: "Jump into public broadcasts or manage your private invites.",
                    to: "/channels",
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    className="glass-elevated flex items-center justify-between rounded-[16px] border border-border px-4 py-4 text-left transition hover:bg-white/10"
                    onClick={() => navigate(item.to)}
                    type="button"
                  >
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{item.copy}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-accent-2" />
                  </button>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-[20px] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
                Tonight on Pulse
              </p>
              <ul className="mt-4 space-y-4 text-sm text-[var(--muted)]">
                <li>{stories.length} story rails are active for your close friends.</li>
                <li>{chats.length} chats are synced and ready to reopen instantly.</li>
                <li>View Once media is available the moment you attach a photo or video.</li>
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
