import { useCallback, useEffect, useMemo, useState } from "react";

import {
  BellOff,
  BellRing,
  Copy,
  Settings2,
  ShieldCheck,
  ShieldOff,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useMessages } from "@/hooks/useMessages";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import type { Chat, ChatParticipant, Message } from "@/types";

type Friend = ChatParticipant & {
  bio?: string;
};

const resolveParticipantName = (participant?: ChatParticipant | null) =>
  participant?.displayName || participant?.username || null;

const resolveChatTitle = (chat: Chat, currentUserId: string) => {
  if (chat.isGroup) {
    return chat.groupName || "Group";
  }

  const participant = chat.participants.find(
    (item) => typeof item !== "string" && item.id !== currentUserId,
  );

  return typeof participant === "string"
    ? "Direct chat"
    : participant?.displayName || "Direct chat";
};

const resolveChatAvatar = (chat: Chat, currentUserId: string) => {
  if (chat.isGroup) {
    return chat.groupAvatar;
  }

  const participant = chat.participants.find(
    (item) => typeof item !== "string" && item.id !== currentUserId,
  );

  return typeof participant === "string" ? undefined : participant?.avatarUrl;
};

const getPopulatedParticipants = (chat: Chat) =>
  chat.participants.filter(
    (participant): participant is ChatParticipant => typeof participant !== "string",
  );

const resolveTypingNames = (
  chat: Chat | null,
  messages: Message[],
  typingUserIds: string[],
  currentUserId: string,
) => {
  if (!chat || typingUserIds.length === 0) {
    return [];
  }

  const namesByUserId = new Map<string, string>();

  getPopulatedParticipants(chat).forEach((participant) => {
    const name = resolveParticipantName(participant);

    if (name) {
      namesByUserId.set(participant.id, name);
    }
  });

  messages.forEach((message) => {
    const name = resolveParticipantName(message.sender);

    if (message.sender?.id && name && !namesByUserId.has(message.sender.id)) {
      namesByUserId.set(message.sender.id, name);
    }
  });

  return typingUserIds.flatMap((userId) => {
    if (userId === currentUserId) {
      return [];
    }

    const name = namesByUserId.get(userId);
    return name ? [name] : [];
  });
};

export const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user)!;
  const chats = useChatStore((state) => state.chats);
  const typingUserIds = useChatStore((state) => state.typingByRoom[chatId ?? ""] ?? []);
  const messages = useChatStore((state) => state.messagesByChatId[chatId ?? ""] ?? []);
  const upsertChat = useChatStore((state) => state.upsertChat);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(
    chats.find((item) => item.id === chatId) ?? null,
  );
  const [loadError, setLoadError] = useState("");
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [groupForm, setGroupForm] = useState({
    groupName: "",
    groupDescription: "",
  });
  const pushToast = useUIStore((state) => state.pushToast);
  const {
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    markMessagesRead,
    openViewOnceMedia,
  } = useMessages();

  const applyChatUpdate = useCallback(
    (nextChat: Chat) => {
      setChat(nextChat);
      upsertChat(nextChat);
      setGroupForm({
        groupName: nextChat.groupName ?? "",
        groupDescription: nextChat.groupDescription ?? "",
      });
    },
    [upsertChat],
  );

  useEffect(() => {
    if (!chatId) return;

    const inviteCode = searchParams.get("invite");

    const loadChat = async () => {
      setLoadError("");

      try {
        const chatResponse = await api.get(`/chats/${chatId}`);
        const nextChat = chatResponse.data.data.chat as Chat;

        applyChatUpdate(nextChat);
        setPinnedMessages(chatResponse.data.data.pinnedMessages as Message[]);
        await fetchMessages(chatId);
      } catch (error: any) {
        if (inviteCode) {
          try {
            const joinResponse = await api.post(`/chats/invite/${inviteCode}`);
            const joinedChat = joinResponse.data.data.chat as Chat;

            applyChatUpdate(joinedChat);
            setPinnedMessages([]);
            await fetchMessages(joinedChat.id);
            pushToast({
              title: "Group joined",
              description: `You are now in ${joinedChat.groupName ?? "this group"}.`,
            });
          } catch (inviteError: any) {
            setLoadError(
              inviteError?.response?.data?.message ??
                "This invite link is no longer valid.",
            );
          }
          return;
        }

        setLoadError(
          error?.response?.data?.message ?? "This conversation could not be loaded.",
        );
      }
    };

    void loadChat();
  }, [applyChatUpdate, chatId, fetchMessages, pushToast, searchParams]);

  useEffect(() => {
    if (!groupPanelOpen || !chat?.isGroup) {
      return;
    }

    const loadGroupPanelData = async () => {
      const requests: Array<Promise<unknown>> = [
        api.get("/users/friends").then((response) => {
          setFriends(response.data.data.friends as Friend[]);
        }),
      ];

      if (chat.ownerId === user.id || chat.admins.includes(user.id)) {
        requests.push(
          api.get(`/chats/${chat.id}/invite-link`).then((response) => {
            setInviteLink(response.data.data.inviteLink as string);
          }),
        );
      }

      await Promise.all(requests);
    };

    void loadGroupPanelData();
  }, [chat, groupPanelOpen, user.id]);

  useEffect(() => {
    const syncedChat = chats.find((item) => item.id === chatId);

    if (syncedChat) {
      setChat(syncedChat);
    }
  }, [chatId, chats]);

  useEffect(() => {
    const unread = messages
      .filter((message) => message.senderId !== user.id)
      .filter((message) => !message.readBy.includes(user.id))
      .map((message) => message.id);

    if (unread.length > 0) {
      void markMessagesRead(unread);
    }
  }, [markMessagesRead, messages, user.id]);

  const roomName = useMemo(
    () => (chat ? resolveChatTitle(chat, user.id) : "Conversation"),
    [chat, user.id],
  );
  const groupParticipants = useMemo(
    () => (chat?.isGroup ? getPopulatedParticipants(chat) : []),
    [chat],
  );
  const canManageGroup = Boolean(
    chat?.isGroup && (chat.ownerId === user.id || chat.admins.includes(user.id)),
  );
  const isGroupOwner = chat?.ownerId === user.id;
  const availableFriends = useMemo(() => {
    const participantIds = new Set(groupParticipants.map((participant) => participant.id));
    return friends.filter((friend) => !participantIds.has(friend.id));
  }, [friends, groupParticipants]);
  const typingNames = useMemo(
    () => resolveTypingNames(chat, messages, typingUserIds, user.id),
    [chat, messages, typingUserIds, user.id],
  );

  if (!chatId) {
    return null;
  }

  if (loadError && !chat) {
    return (
      <div className="ig-empty-state">
        <div className="ig-empty-art" />
        <p className="text-[15px] text-[var(--text-secondary)]">Conversation unavailable</p>
        <p className="text-sm text-[var(--text-secondary)]">{loadError}</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="ig-empty-state">
        <div className="ig-empty-art" />
        <p className="text-sm text-[var(--text-secondary)]">Loading chat...</p>
      </div>
    );
  }

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
        title: roomName,
        warning: result.warning,
        layoutId: `media-${message.id}`,
      });
      return;
    }

    if (!message.content) {
      pushToast({
        title: "Media unavailable",
        description: "This attachment cannot be opened right now.",
      });
      return;
    }

    useUIStore.getState().openMediaViewer({
      open: true,
      src: message.content,
      type: message.type === "video" ? "video" : "image",
      title: message.metadata?.originalName ?? roomName,
      warning:
        message.viewMode === "once" ? "This media was shared as View Once." : undefined,
      layoutId: `media-${message.id}`,
    });
  };

  return (
    <>
      <motion.div
        className="ig-panel h-[calc(100vh-9rem)]"
        drag={window.innerWidth < 1024 ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_event, info) => {
          if (window.innerWidth < 1024 && info.offset.x > 120) {
            navigate(-1);
          }
        }}
      >
        <ChatWindow
          roomId={chatId}
          roomName={roomName}
          avatarUrl={resolveChatAvatar(chat, user.id)}
          currentUser={user}
          messages={messages}
          typingNames={typingNames}
          pinnedMessages={pinnedMessages}
          muted={chat.mutedBy.includes(user.id)}
          onBack={() => navigate(-1)}
          headerActions={
            <>
              <Button
                size="sm"
                variant="ghost"
                iconLeft={
                  chat.mutedBy.includes(user.id) ? (
                    <BellRing className="h-3.5 w-3.5" />
                  ) : (
                    <BellOff className="h-3.5 w-3.5" />
                  )
                }
                onClick={async () => {
                  const response = await api.post(`/chats/${chatId}/mute`);
                  const muted = response.data.data.muted as boolean;
                  applyChatUpdate({
                    ...chat,
                    mutedBy: muted
                      ? [...new Set([...chat.mutedBy, user.id])]
                      : chat.mutedBy.filter((id) => id !== user.id),
                  });
                }}
              >
                {chat.mutedBy.includes(user.id) ? "Unmute" : "Mute"}
              </Button>
              {chat.isGroup ? (
                <Button
                  size="sm"
                  variant="ghost"
                  iconLeft={<Settings2 className="h-3.5 w-3.5" />}
                  onClick={() => setGroupPanelOpen(true)}
                >
                  Group
                </Button>
              ) : null}
            </>
          }
          onSend={async ({ content, file, viewMode }) => {
            await sendMessage({
              roomId: chatId,
              content,
              file,
              viewMode,
            });
          }}
          onEdit={async (messageId, content) => {
            await editMessage(messageId, content);
          }}
          onDelete={async (messageId, mode) => {
            await deleteMessage(messageId, mode);
          }}
          onReact={async (messageId, emoji) => {
            await reactToMessage(messageId, emoji);
          }}
          onOpenMedia={handleOpenMedia}
          onPinMessage={async (messageId) => {
            const response = await api.post(`/chats/${chatId}/pin/${messageId}`);
            const pinnedIds = response.data.data.pinnedMessages as string[];
            setPinnedMessages(messages.filter((message) => pinnedIds.includes(message.id)));
          }}
        />
      </motion.div>

      <Modal open={groupPanelOpen} onClose={() => setGroupPanelOpen(false)} title="Group details">
        {chat.isGroup ? (
          <div className="space-y-5">
            <div className="ig-soft-card p-4">
              <div className="flex items-center gap-3">
                <Avatar src={chat.groupAvatar} alt={chat.groupName ?? "Group"} />
                <div>
                  <p className="font-semibold">{chat.groupName}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {groupParticipants.length} members
                  </p>
                </div>
              </div>
            </div>

            {canManageGroup ? (
              <section className="space-y-3">
                <p className="text-sm font-semibold">Update group</p>
                <input
                  className="ig-field"
                  placeholder="Group name"
                  value={groupForm.groupName}
                  onChange={(event) =>
                    setGroupForm((current) => ({
                      ...current,
                      groupName: event.target.value,
                    }))
                  }
                />
                <textarea
                  className="ig-textarea"
                  placeholder="Group description"
                  value={groupForm.groupDescription}
                  onChange={(event) =>
                    setGroupForm((current) => ({
                      ...current,
                      groupDescription: event.target.value,
                    }))
                  }
                />
                <Button
                  className="w-full"
                  disabled={!groupForm.groupName.trim()}
                  onClick={async () => {
                    const response = await api.put(`/chats/${chat.id}`, groupForm);
                    applyChatUpdate(response.data.data.chat as Chat);
                    pushToast({
                      title: "Group updated",
                      description: "Your group details are now live.",
                    });
                  }}
                >
                  Save group details
                </Button>
              </section>
            ) : null}

            {canManageGroup ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Invite link</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    iconLeft={<Copy className="h-3.5 w-3.5" />}
                    onClick={async () => {
                      if (!inviteLink) return;
                      await navigator.clipboard.writeText(inviteLink);
                      pushToast({
                        title: "Invite copied",
                        description: "Your group invite link is on the clipboard.",
                      });
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <div className="ig-soft-card px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {inviteLink || "Generating invite link..."}
                </div>
              </section>
            ) : null}

            {canManageGroup && availableFriends.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-[var(--unread)]" />
                  <p className="text-sm font-semibold">Add friends</p>
                </div>
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {availableFriends.map((friend) => (
                    <button
                      key={friend.id}
                      className={`ig-list-row w-full text-left ${
                        selectedMemberIds.includes(friend.id)
                          ? "ring-1 ring-[var(--unread)]"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedMemberIds((current) =>
                          current.includes(friend.id)
                            ? current.filter((value) => value !== friend.id)
                            : [...current, friend.id],
                        )
                      }
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={friend.avatarUrl} alt={friend.displayName} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{friend.displayName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">@{friend.username}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {selectedMemberIds.includes(friend.id) ? "Selected" : "Tap to add"}
                      </span>
                    </button>
                  ))}
                </div>
                <Button
                  className="w-full"
                  disabled={selectedMemberIds.length === 0}
                  onClick={async () => {
                    const response = await api.post(`/chats/${chat.id}/members`, {
                      memberIds: selectedMemberIds,
                    });
                    applyChatUpdate(response.data.data.chat as Chat);
                    setSelectedMemberIds([]);
                    pushToast({
                      title: "Members added",
                      description: "Your selected friends joined the group.",
                    });
                  }}
                >
                  Add selected friends
                </Button>
              </section>
            ) : null}

            <section className="space-y-3">
              <p className="text-sm font-semibold">Members</p>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {groupParticipants.map((participant) => {
                  const isOwner = participant.id === chat.ownerId;
                  const isAdmin = chat.admins.includes(participant.id);

                  return (
                    <div key={participant.id} className="ig-soft-card px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={participant.avatarUrl} alt={participant.displayName} size="sm" />
                          <div>
                            <p className="text-sm font-medium">{participant.displayName}</p>
                            <p className="text-xs text-[var(--text-secondary)]">@{participant.username}</p>
                          </div>
                        </div>
                        <span className="ig-pill">
                          {isOwner ? "Owner" : isAdmin ? "Admin" : "Member"}
                        </span>
                      </div>

                      {isGroupOwner && !isOwner ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            iconLeft={
                              isAdmin ? (
                                <ShieldOff className="h-3.5 w-3.5" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              )
                            }
                            onClick={async () => {
                              const response = await api.patch(
                                `/chats/${chat.id}/members/${participant.id}/role`,
                                {
                                  role: isAdmin ? "member" : "admin",
                                },
                              );
                              applyChatUpdate(response.data.data.chat as Chat);
                            }}
                          >
                            {isAdmin ? "Demote" : "Promote"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            iconLeft={<UserMinus className="h-3.5 w-3.5" />}
                            onClick={async () => {
                              const response = await api.delete(
                                `/chats/${chat.id}/members/${participant.id}`,
                              );
                              applyChatUpdate(response.data.data.chat as Chat);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </>
  );
};
