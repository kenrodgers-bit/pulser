import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Plus, Search } from "lucide-react";

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
      <section className="ig-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="ig-section-label">Discover</p>
            <h2 className="ig-section-title mt-3">
              Search usernames, accept requests, and launch new chats
            </h2>
          </div>
          <Button iconLeft={<Plus className="h-4 w-4" />} variant="secondary" onClick={() => setGroupOpen(true)}>
            Create group
          </Button>
        </div>

        <div className="ig-search mt-5">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            className="ig-search__input"
            placeholder="Search @username"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {actionableResults.length === 0 && query.trim() ? (
              <div className="ig-empty-state min-h-[220px]">
                <div className="ig-empty-art" />
                <p className="text-[15px] text-[var(--text-secondary)]">
                  No results for "{query}"
                </p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Try searching by username.
                </p>
              </div>
            ) : null}

            {actionableResults.map((person) => (
              <div key={person.id} className="ig-list-row">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={person.avatarUrl} alt={person.displayName} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{person.displayName}</p>
                    <p className="truncate text-sm text-[var(--text-secondary)]">@{person.username}</p>
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
                    <span className="ig-pill">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="ig-panel">
              <p className="text-sm font-semibold">Incoming requests</p>
              <div className="mt-4 space-y-3">
                {received.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No pending requests right now.
                  </p>
                ) : (
                  received.map((person) => (
                    <div key={person.id} className="ig-list-row">
                      <div className="flex items-center gap-3">
                        <Avatar src={person.avatarUrl} alt={person.displayName} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{person.displayName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">@{person.username}</p>
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

            <div className="ig-panel">
              <p className="text-sm font-semibold">Friend roster</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Tap friends into a new group or launch a DM.
              </p>
              <div className="mt-4 space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="ig-list-row">
                    <div className="flex items-center gap-3">
                      <Avatar src={friend.avatarUrl} alt={friend.displayName} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{friend.displayName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">@{friend.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={selectedMembers.includes(friend.id) ? "primary" : "ghost"}
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
            className="ig-field"
            placeholder="Group name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {friends.map((friend) => (
              <button
                key={friend.id}
                className="ig-list-row w-full text-left"
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
                    <p className="text-xs text-[var(--text-secondary)]">@{friend.username}</p>
                  </div>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
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
