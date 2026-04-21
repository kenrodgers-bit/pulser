import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Plus } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { PageTransition } from "@/components/ui/PageTransition";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import type { ChatParticipant } from "@/types";

type SearchUser = ChatParticipant & {
  relationship: "friends" | "pending" | "received" | "none";
  bio?: string;
};

export const DiscoverPage = () => {
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.user)!;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [received, setReceived] = useState<SearchUser[]>([]);
  const [friends, setFriends] = useState<SearchUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupOpen, setGroupOpen] = useState(searchParams.get("compose") === "1");
  const navigate = useNavigate();
  const upsertChat = useChatStore((state) => state.upsertChat);
  const pushToast = useUIStore((state) => state.pushToast);

  const fetchDiscoveryData = async () => {
    const [requestsResponse, friendsResponse] = await Promise.all([
      api.get("/users/friend-requests"),
      api.get("/users/friends"),
    ]);

    setReceived(requestsResponse.data.data.received as SearchUser[]);
    setFriends(friendsResponse.data.data.friends as SearchUser[]);
  };

  useEffect(() => {
    void fetchDiscoveryData();
  }, []);

  useEffect(() => {
    if (!deferredQuery.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      const response = await api.get("/users/search", {
        params: { q: deferredQuery },
      });

      startTransition(() => {
        setResults(response.data.data.users as SearchUser[]);
      });
    };

    void search();
  }, [deferredQuery]);

  const actionableResults = useMemo(
    () => results.filter((result) => result.id !== currentUser.id),
    [currentUser.id, results],
  );

  return (
    <PageTransition className="space-y-4">
      <section className="glass-panel rounded-[20px] p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
              Discover
            </p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.03em]">
              Search usernames, accept requests, and launch new chats
            </h2>
          </div>
          <Button
            variant="secondary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => setGroupOpen(true)}
          >
            Create group
          </Button>
        </div>

        <input
          className="mt-5 h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
          placeholder="Search @username"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {actionableResults.map((person) => (
              <div
                key={person.id}
                className="glass-elevated flex items-center justify-between gap-3 rounded-[14px] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={person.avatarUrl} alt={person.displayName} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{person.displayName}</p>
                    <p className="truncate text-sm text-[var(--muted)]">
                      @{person.username}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {person.relationship === "none" ? (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await api.post(`/users/friend-requests/${person.id}`);
                        pushToast({
                          title: "Request sent",
                          description: `Pulse notified @${person.username}.`,
                        });
                      }}
                    >
                      Add
                    </Button>
                  ) : person.relationship === "received" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await api.post(`/users/friend-requests/${person.id}/accept`);
                          await fetchDiscoveryData();
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await api.post(`/users/friend-requests/${person.id}/reject`);
                          await fetchDiscoveryData();
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : person.relationship === "friends" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const response = await api.post("/chats/direct", {
                          participantId: person.id,
                        });
                        const chat = response.data.data.chat;
                        upsertChat(chat);
                        navigate(`/chat/${chat.id}`);
                      }}
                    >
                      Message
                    </Button>
                  ) : (
                    <span className="rounded-full bg-white/6 px-3 py-2 text-xs text-[var(--muted)]">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="glass-panel rounded-[16px] p-4">
              <p className="font-semibold">Incoming requests</p>
              <div className="mt-4 space-y-3">
                {received.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    No pending requests right now.
                  </p>
                ) : (
                  received.map((person) => (
                    <div key={person.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={person.avatarUrl} alt={person.displayName} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{person.displayName}</p>
                          <p className="text-xs text-[var(--muted)]">@{person.username}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await api.post(`/users/friend-requests/${person.id}/accept`);
                          await fetchDiscoveryData();
                        }}
                      >
                        Accept
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-panel rounded-[16px] p-4">
              <p className="font-semibold">Friend roster</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Tap friends into a new group or launch a DM.
              </p>
              <div className="mt-4 space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={friend.avatarUrl} alt={friend.displayName} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{friend.displayName}</p>
                        <p className="text-xs text-[var(--muted)]">@{friend.username}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedMembers((current) =>
                          current.includes(friend.id)
                            ? current.filter((value) => value !== friend.id)
                            : [...current, friend.id],
                        )
                      }
                    >
                      {selectedMembers.includes(friend.id) ? "Selected" : "Pick"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal open={groupOpen} onClose={() => setGroupOpen(false)} title="Create group chat">
        <div className="space-y-4">
          <input
            className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            placeholder="Group name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {friends.map((friend) => (
              <button
                key={friend.id}
                className={`flex w-full items-center justify-between rounded-[14px] border px-4 py-3 transition ${
                  selectedMembers.includes(friend.id)
                    ? "border-accent/30 bg-accent/10"
                    : "border-border bg-white/4 hover:bg-white/7"
                }`}
                onClick={() =>
                  setSelectedMembers((current) =>
                    current.includes(friend.id)
                      ? current.filter((value) => value !== friend.id)
                      : [...current, friend.id],
                  )
                }
                type="button"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={friend.avatarUrl} alt={friend.displayName} size="sm" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{friend.displayName}</p>
                    <p className="text-xs text-[var(--muted)]">@{friend.username}</p>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {selectedMembers.includes(friend.id) ? "Added" : "Tap to add"}
                </span>
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!groupName.trim() || selectedMembers.length === 0}
            onClick={async () => {
              const response = await api.post("/chats/groups", {
                groupName,
                memberIds: selectedMembers,
              });
              const chat = response.data.data.chat;
              upsertChat(chat);
              setGroupOpen(false);
              setSelectedMembers([]);
              setGroupName("");
              navigate(`/chat/${chat.id}`);
            }}
          >
            Build group
          </Button>
        </div>
      </Modal>
    </PageTransition>
  );
};
