import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  BellOff,
  BellRing,
  Copy,
  DoorOpen,
  Lock,
  Plus,
  Settings2,
} from "lucide-react";

import { api } from "@/lib/api";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useMessages } from "@/hooks/useMessages";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import type { Channel, Message } from "@/types";

export const ChannelsPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user)!;
  const channels = useChatStore((state) => state.channels);
  const messages = useChatStore((state) => state.messagesByChannelId[channelId ?? ""] ?? []);
  const setChannels = useChatStore((state) => state.setChannels);
  const upsertChannel = useChatStore((state) => state.upsertChannel);
  const [search, setSearch] = useState("");
  const [discovered, setDiscovered] = useState<Channel[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [channelForm, setChannelForm] = useState({
    name: "",
    description: "",
    visibility: "public",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    visibility: "public" as "public" | "private",
  });
  const pushToast = useUIStore((state) => state.pushToast);
  const {
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    openViewOnceMedia,
  } = useMessages();

  const loadChannels = useCallback(
    async (query: string = search) => {
      const [mineResponse, discoverResponse] = await Promise.all([
        api.get("/channels/mine"),
        api.get("/channels", {
          params: { q: query },
        }),
      ]);

      setChannels(mineResponse.data.data.channels as Channel[]);
      setDiscovered(discoverResponse.data.data.channels as Channel[]);
    },
    [search, setChannels],
  );

  const showActionError = (title: string, error: any) => {
    pushToast({
      title,
      description:
        error?.response?.data?.message ?? "Pulse could not complete that action.",
    });
  };

  useEffect(() => {
    void loadChannels(search);
  }, [loadChannels, search]);

  const selectedChannel = useMemo(
    () =>
      channels.find((channel) => channel.id === channelId) ??
      discovered.find((channel) => channel.id === channelId) ??
      null,
    [channelId, channels, discovered],
  );
  const isMember = Boolean(selectedChannel?.members.includes(user.id));
  const canManageChannel = Boolean(
    selectedChannel &&
      (selectedChannel.ownerId === user.id || selectedChannel.admins.includes(user.id)),
  );
  const canPublish = Boolean(
    selectedChannel &&
      (selectedChannel.ownerId === user.id || selectedChannel.admins.includes(user.id)),
  );

  useEffect(() => {
    if (!selectedChannel) {
      return;
    }

    setEditForm({
      name: selectedChannel.name,
      description: selectedChannel.description,
      visibility: selectedChannel.visibility,
    });
  }, [selectedChannel]);

  useEffect(() => {
    if (!channelId || !selectedChannel || !isMember) return;
    void fetchMessages(channelId, true);
  }, [channelId, fetchMessages, isMember, selectedChannel]);

  const handleOpenMedia = async (message: Message) => {
    if (message.type === "audio" || message.type === "file") {
      if (message.content) {
        window.open(message.content, "_blank", "noopener,noreferrer");
        return;
      }

      pushToast({
        title: "Attachment unavailable",
        description: "This attachment cannot be opened right now.",
      });
      return;
    }

    if (message.viewMode === "once" && !message.content) {
      const result = await openViewOnceMedia(message.id);
      useUIStore.getState().openMediaViewer({
        open: true,
        src: result.mediaUrl,
        type: message.type === "video" ? "video" : "image",
        title: selectedChannel?.name ?? "Channel",
        warning: result.warning,
        layoutId: `media-${message.id}`,
      });
      return;
    }

    if (!message.content) {
      return;
    }

    useUIStore.getState().openMediaViewer({
      open: true,
      src: message.content,
      type: message.type === "video" ? "video" : "image",
      title: selectedChannel?.name ?? "Channel",
      warning:
        message.viewMode === "once" ? "This media was shared as View Once." : undefined,
      layoutId: `media-${message.id}`,
    });
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="glass-panel rounded-[20px] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent/80">
                Channels
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold">
                Broadcast like Telegram, react like Instagram
              </h2>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setInviteOpen(true)}>
                Join private
              </Button>
              <Button
                variant="secondary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={() => setCreateOpen(true)}
              >
                New
              </Button>
            </div>
          </div>

          <input
            className="mt-5 h-12 w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            placeholder="Search channels"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="mt-5 space-y-3">
            {[...channels, ...discovered.filter((channel) => !channels.some((item) => item.id === channel.id))].map(
              (channel) => (
                <button
                  key={channel.id}
                  className={`glass-panel flex w-full items-center justify-between gap-3 rounded-[1.5rem] px-4 py-3 text-left transition ${
                    channelId === channel.id ? "border-accent/30 bg-accent-soft/60" : "hover:bg-white/8"
                  }`}
                  onClick={() => navigate(`/channels/${channel.id}`)}
                  type="button"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={channel.avatarUrl} alt={channel.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{channel.name}</p>
                      <p className="truncate text-sm text-[var(--muted)]">
                        {channel.description || "Tap to open the channel feed"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[var(--muted)]">
                    <p>{channel.subscriberCount} subs</p>
                    <p className="mt-1 uppercase tracking-[0.2em] text-accent/80">
                      {channel.visibility}
                    </p>
                  </div>
                </button>
              ),
            )}
          </div>
        </section>

        <section className="glass-panel min-h-[70vh] rounded-[20px] p-4 md:p-5">
          {selectedChannel ? (
            isMember ? (
              <ChatWindow
                roomId={selectedChannel.id}
                roomName={selectedChannel.name}
                currentUser={user}
                messages={messages}
                typingUsers={[]}
                isChannel
                muted={selectedChannel.mutedBy.includes(user.id)}
                avatarUrl={selectedChannel.avatarUrl}
                composerPlaceholder={
                  canPublish
                    ? "Publish a new update or reply to a post..."
                    : "Reply to a post to comment as a member..."
                }
                headerActions={
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft={
                        selectedChannel.mutedBy.includes(user.id) ? (
                          <BellRing className="h-3.5 w-3.5" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5" />
                        )
                      }
                      onClick={async () => {
                        try {
                          const response = await api.post(`/channels/${selectedChannel.id}/mute`);
                          const muted = response.data.data.muted as boolean;
                          upsertChannel({
                            ...selectedChannel,
                            mutedBy: muted
                              ? [...new Set([...selectedChannel.mutedBy, user.id])]
                              : selectedChannel.mutedBy.filter((id) => id !== user.id),
                          });
                        } catch (error) {
                          showActionError("Channel update failed", error);
                        }
                      }}
                    >
                      {selectedChannel.mutedBy.includes(user.id) ? "Unmute" : "Mute"}
                    </Button>
                    {canManageChannel ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        iconLeft={<Settings2 className="h-3.5 w-3.5" />}
                        onClick={() => setManageOpen(true)}
                      >
                        Manage
                      </Button>
                    ) : null}
                    {selectedChannel.ownerId !== user.id ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        iconLeft={<DoorOpen className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          try {
                            await api.delete(`/channels/${selectedChannel.id}/membership`);
                            await loadChannels();
                            navigate("/channels");
                            pushToast({
                              title: "Channel left",
                              description: `You left ${selectedChannel.name}.`,
                            });
                          } catch (error) {
                            showActionError("Leave failed", error);
                          }
                        }}
                      >
                        Leave
                      </Button>
                    ) : null}
                  </>
                }
                onSend={async ({ content, file, viewMode }) => {
                  await sendMessage({
                    roomId: selectedChannel.id,
                    isChannel: true,
                    content,
                    file,
                    viewMode,
                  });
                }}
                onEdit={editMessage}
                onDelete={deleteMessage}
                onReact={reactToMessage}
                onOpenMedia={handleOpenMedia}
              />
            ) : (
              <div className="grid h-full place-items-center rounded-[1.7rem] border border-white/10 bg-white/4 p-6">
                <div className="max-w-md text-center">
                  <div className="flex justify-center">
                    <Avatar
                      src={selectedChannel.avatarUrl}
                      alt={selectedChannel.name}
                      size="xl"
                    />
                  </div>
                  <p className="mt-5 font-heading text-3xl font-semibold">
                    {selectedChannel.name}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {selectedChannel.description || "Join this channel to read posts and leave reactions or comments."}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-accent/80">
                    <span>{selectedChannel.subscriberCount} subscribers</span>
                    <span>{selectedChannel.visibility}</span>
                  </div>
                  <div className="mt-6 flex justify-center gap-3">
                    {selectedChannel.visibility === "public" ? (
                      <Button
                        onClick={async () => {
                          try {
                            const response = await api.post(`/channels/${selectedChannel.id}/join`);
                            upsertChannel(response.data.data.channel as Channel);
                            await loadChannels();
                            pushToast({
                              title: "Channel joined",
                              description: `You joined ${selectedChannel.name}.`,
                            });
                          } catch (error) {
                            showActionError("Join failed", error);
                          }
                        }}
                      >
                        Join channel
                      </Button>
                    ) : (
                      <Button
                        iconLeft={<Lock className="h-4 w-4" />}
                        onClick={() => setInviteOpen(true)}
                      >
                        Enter invite code
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="grid h-full place-items-center rounded-[1.7rem] border border-dashed border-white/10 bg-white/4">
              <div className="max-w-sm text-center">
                <p className="font-heading text-2xl font-semibold">Choose a channel</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Public channels show up on the left. Open one to browse posts, join it, or create your own broadcast space.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a channel">
        <div className="space-y-4">
          <input
            className="h-12 w-full rounded-[1.3rem] border border-white/10 bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            placeholder="Channel name"
            value={channelForm.name}
            onChange={(event) =>
              setChannelForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
          <textarea
            className="min-h-24 w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            placeholder="Description"
            value={channelForm.description}
            onChange={(event) =>
              setChannelForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
          <div className="grid grid-cols-2 gap-2 rounded-[1.3rem] bg-white/6 p-1">
            {(["public", "private"] as const).map((visibility) => (
              <button
                key={visibility}
                className={`h-11 rounded-[1rem] text-sm font-semibold transition ${
                  channelForm.visibility === visibility
                    ? "bg-accent text-slate-950"
                    : "text-[var(--muted)] hover:bg-white/6"
                }`}
                onClick={() =>
                  setChannelForm((current) => ({
                    ...current,
                    visibility,
                  }))
                }
                type="button"
              >
                {visibility}
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!channelForm.name.trim()}
            onClick={async () => {
              try {
                const response = await api.post("/channels", channelForm);
                const channel = response.data.data.channel as Channel;
                upsertChannel(channel);
                setCreateOpen(false);
                setChannelForm({
                  name: "",
                  description: "",
                  visibility: "public",
                });
                pushToast({
                  title: "Channel created",
                  description: `@${channel.slug} is ready to broadcast.`,
                });
                navigate(`/channels/${channel.id}`);
              } catch (error) {
                showActionError("Create failed", error);
              }
            }}
          >
            Create channel
          </Button>
        </div>
      </Modal>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Join private channel">
        <div className="space-y-4">
          <input
            className="h-12 w-full rounded-[1.3rem] border border-white/10 bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            placeholder="Paste invite code"
            value={joinInviteCode}
            onChange={(event) => setJoinInviteCode(event.target.value)}
          />
          <Button
            className="w-full"
            disabled={!joinInviteCode.trim()}
            onClick={async () => {
              try {
                const response = await api.post("/channels/join", {
                  inviteCode: joinInviteCode.trim(),
                });
                const channel = response.data.data.channel as Channel;
                upsertChannel(channel);
                await loadChannels();
                setInviteOpen(false);
                setJoinInviteCode("");
                navigate(`/channels/${channel.id}`);
                pushToast({
                  title: "Channel joined",
                  description: `You joined ${channel.name}.`,
                });
              } catch (error) {
                showActionError("Invite invalid", error);
              }
            }}
          >
            Join with code
          </Button>
        </div>
      </Modal>

      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title="Manage channel">
        {selectedChannel ? (
          <div className="space-y-5">
            <input
              className="h-12 w-full rounded-[1.3rem] border border-white/10 bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
              placeholder="Channel name"
              value={editForm.name}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <textarea
              className="min-h-24 w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
              placeholder="Description"
              value={editForm.description}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <div className="grid grid-cols-2 gap-2 rounded-[1.3rem] bg-white/6 p-1">
              {(["public", "private"] as const).map((visibility) => (
                <button
                  key={visibility}
                  className={`h-11 rounded-[1rem] text-sm font-semibold transition ${
                    editForm.visibility === visibility
                      ? "bg-accent text-slate-950"
                      : "text-[var(--muted)] hover:bg-white/6"
                  }`}
                  onClick={() =>
                    setEditForm((current) => ({
                      ...current,
                      visibility,
                    }))
                  }
                  type="button"
                >
                  {visibility}
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!editForm.name.trim()}
              onClick={async () => {
                try {
                  const response = await api.put(`/channels/${selectedChannel.id}`, editForm);
                  upsertChannel(response.data.data.channel as Channel);
                  await loadChannels();
                  setManageOpen(false);
                  pushToast({
                    title: "Channel updated",
                    description: `${editForm.name} has been updated.`,
                  });
                } catch (error) {
                  showActionError("Update failed", error);
                }
              }}
            >
              Save channel settings
            </Button>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Invite code</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Share this code to let people join your channel.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  iconLeft={<Copy className="h-3.5 w-3.5" />}
                  onClick={async () => {
                    if (!selectedChannel.inviteCode) return;
                    await navigator.clipboard.writeText(selectedChannel.inviteCode);
                    pushToast({
                      title: "Invite code copied",
                      description: "Share it privately with the people you want to add.",
                    });
                  }}
                >
                  Copy
                </Button>
              </div>
              <div className="mt-3 rounded-[1.1rem] border border-white/10 bg-slate-950/40 px-4 py-3 text-sm tracking-[0.18em] text-[var(--muted)]">
                {selectedChannel.inviteCode ?? "Unavailable"}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};
