import { useEffect, useMemo, useRef, useState } from "react";
import {
  NavLink,
  useLocation,
  useNavigate,
  useOutlet,
} from "react-router-dom";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  Compass,
  House,
  MessageSquarePlus,
  RadioTower,
  Search,
  UserCircle2,
} from "lucide-react";

import { ChatList } from "@/components/chat/ChatList";
import { MediaViewer } from "@/components/media/MediaViewer";
import { StoryUploader } from "@/components/stories/StoryUploader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ChatListSkeleton } from "@/components/ui/Skeleton";
import { ToastViewport } from "@/components/ui/Toast";
import { APP_EASE, type RouteMotionKind, shellRouteVariants } from "@/lib/motion";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import type { AppNotification, Channel, Chat, StoryGroup } from "@/types";
import { formatRelativeTime } from "@/utils/format";

const navItems = [
  {
    key: "home",
    to: "/",
    label: "Home",
    icon: House,
  },
  {
    key: "discover",
    to: "/discover",
    label: "Discover",
    icon: Compass,
  },
  {
    key: "new",
    to: "/discover?compose=1",
    label: "New",
    icon: MessageSquarePlus,
  },
  {
    key: "channels",
    to: "/channels",
    label: "Channels",
    icon: RadioTower,
  },
  {
    key: "profile",
    to: "/profile",
    label: "Profile",
    icon: UserCircle2,
  },
];

const isStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const getRouteMotionKind = (
  previousPath: string,
  nextPath: string,
): RouteMotionKind => {
  const wasChat = previousPath.startsWith("/chat/");
  const isChat = nextPath.startsWith("/chat/");

  if (!wasChat && isChat) {
    return "chat-forward";
  }

  if (wasChat && !isChat) {
    return "chat-back";
  }

  return "tab";
};

const getPageMeta = (pathname: string) => {
  if (pathname.startsWith("/discover")) {
    return {
      title: "Discover",
      subtitle: "Find people, requests, and fresh groups",
      showBack: false,
    };
  }

  if (pathname.startsWith("/channels")) {
    return {
      title: "Channels",
      subtitle: "Broadcasts, drops, and live threads",
      showBack: false,
    };
  }

  if (pathname.startsWith("/profile")) {
    return {
      title: "Profile",
      subtitle: "Identity, installs, and device state",
      showBack: false,
    };
  }

  if (pathname.startsWith("/settings")) {
    return {
      title: "Settings",
      subtitle: "Privacy, notifications, and appearance",
      showBack: true,
    };
  }

  return {
    title: "Pulse",
    subtitle: "Stories and messaging at live speed",
    showBack: false,
  };
};

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const previousPathRef = useRef(location.pathname);
  const user = useAuthStore((state) => state.user)!;
  const chats = useChatStore((state) => state.chats);
  const notifications = useChatStore((state) => state.notifications);
  const onlineUserIds = useChatStore((state) => state.onlineUserIds);
  const setChats = useChatStore((state) => state.setChats);
  const setStories = useChatStore((state) => state.setStories);
  const setChannels = useChatStore((state) => state.setChannels);
  const setNotifications = useChatStore((state) => state.setNotifications);
  const markNotificationRead = useChatStore((state) => state.markNotificationRead);
  const installPromptEvent = useUIStore((state) => state.installPromptEvent);
  const setInstallPromptEvent = useUIStore((state) => state.setInstallPromptEvent);
  const pushToast = useUIStore((state) => state.pushToast);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [shellLoading, setShellLoading] = useState(true);
  const [installBannerVisible, setInstallBannerVisible] = useState(false);

  const routeMotionKind = useMemo(
    () => getRouteMotionKind(previousPathRef.current, location.pathname),
    [location.pathname],
  );
  const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);
  const activeChatId = useMemo(
    () => (location.pathname.startsWith("/chat/") ? location.pathname.split("/").pop() : null),
    [location.pathname],
  );
  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const isChatRoute = location.pathname.startsWith("/chat/");

  useEffect(() => {
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [setInstallPromptEvent]);

  useEffect(() => {
    const loadShellData = async () => {
      setShellLoading(true);

      try {
        const [chatsResponse, storiesResponse, channelsResponse, notificationsResponse] =
          await Promise.all([
            api.get("/chats"),
            api.get("/stories"),
            api.get("/channels/mine"),
            api.get("/notifications"),
          ]);

        setChats(chatsResponse.data.data.chats as Chat[]);
        setStories(storiesResponse.data.data.stories as StoryGroup[]);
        setChannels(channelsResponse.data.data.channels as Channel[]);
        setNotifications(
          notificationsResponse.data.data.notifications as AppNotification[],
        );
      } catch {
        pushToast({
          title: "Pulse is reconnecting",
          description: "Some shell data could not be synced yet. Try refreshing shortly.",
        });
      } finally {
        setShellLoading(false);
      }
    };

    void loadShellData();
  }, [pushToast, setChannels, setChats, setNotifications, setStories]);

  useEffect(() => {
    if (!installPromptEvent || isStandaloneMode()) {
      setInstallBannerVisible(false);
      return;
    }

    const dismissedUntil = Number(
      localStorage.getItem("pulse-install-dismissed-until") ?? "0",
    );

    if (Date.now() < dismissedUntil) {
      setInstallBannerVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setInstallBannerVisible(true);
    }, 30_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [installPromptEvent]);

  const openNotificationDestination = async (notification: AppNotification) => {
    try {
      if (!notification.isRead) {
        await api.post(`/notifications/${notification.id}/read`);
        markNotificationRead(notification.id);
      }

      setNotificationsOpen(false);

      if (notification.data.channelId) {
        navigate(`/channels/${notification.data.channelId}`);
        return;
      }

      if (notification.data.chatId) {
        navigate(`/chat/${notification.data.chatId}`);
        return;
      }

      navigate("/discover");
    } catch {
      pushToast({
        title: "Notification unavailable",
        description: "That destination could not be opened right now.",
      });
    }
  };

  const dismissInstallBanner = () => {
    localStorage.setItem(
      "pulse-install-dismissed-until",
      String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    setInstallBannerVisible(false);
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <ToastViewport />
      <MediaViewer />

      {!isChatRoute ? (
        <div className="pulse-topbar mask-safe-bottom fixed inset-x-0 top-0 z-30 border-b border-transparent px-4 pt-3 lg:hidden">
          <div className="mx-auto flex h-[52px] max-w-[1600px] items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {pageMeta.showBack ? (
                <button
                  className="rounded-full bg-white/6 p-2 text-[var(--ink)] transition hover:bg-white/10"
                  onClick={() => navigate(-1)}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : null}
              <div className="min-w-0">
                <p className="truncate font-heading text-xl font-semibold">
                  {pageMeta.title}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {pageMeta.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-[var(--ink)]"
                onClick={() => navigate("/discover")}
                type="button"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                className="relative rounded-full bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-[var(--ink)]"
                onClick={() => setNotificationsOpen(true)}
                type="button"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 px-4 pb-28 pt-[4.6rem] lg:px-6 lg:pb-6 lg:pt-5">
        <aside className="hidden w-[300px] shrink-0 flex-col gap-4 lg:flex">
          <div className="glass-panel rounded-[14px] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-[2rem] font-semibold tracking-[-0.03em]">
                  Pulse
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Deep-space chat, built for fast hands and late nights.
                </p>
              </div>
              <div className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-2">
                Live
              </div>
            </div>

            <div className="mt-5 rounded-[14px] border border-border bg-white/4 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.displayName}</p>
                  <p className="truncate text-sm text-[var(--muted)]">@{user.username}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    if (!installPromptEvent) {
                      pushToast({
                        title: "Install prompt unavailable",
                        description: "Open Pulse in a supported mobile browser to install it.",
                      });
                      return;
                    }

                    await installPromptEvent.prompt();
                    setInstallPromptEvent(null);
                    setInstallBannerVisible(false);
                  }}
                >
                  Install
                </Button>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-[14px] border border-border bg-white/4 px-4 py-3">
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                className="h-6 w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[var(--muted)]"
                placeholder="Search chats"
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <StoryUploader onUploaded={async () => {
                const response = await api.get("/stories");
                setStories(response.data.data.stories as StoryGroup[]);
              }} />
              <button
                className="relative rounded-full bg-white/6 p-3 text-[var(--ink)] transition hover:bg-white/10"
                onClick={() => setNotificationsOpen(true)}
                type="button"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="glass-panel flex-1 rounded-[14px] p-4">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
                Conversations
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Direct messages, groups, and view-once drops.
              </p>
            </div>
            <div className="scrollbar-hidden max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {shellLoading ? (
                <ChatListSkeleton />
              ) : (
                <ChatList
                  chats={chats}
                  currentUser={user}
                  activeChatId={activeChatId}
                  onlineUserIds={onlineUserIds}
                />
              )}
            </div>
          </div>
        </aside>

        <main className="pulse-route-layer min-w-0 flex-1 overflow-hidden">
          <AnimatePresence custom={routeMotionKind} initial={false} mode="wait">
            <motion.div
              key={`${location.pathname}${location.search}`}
              className="will-transform"
              custom={routeMotionKind}
              variants={shellRouteVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="pulse-tabbar glass-elevated fixed inset-x-3 bottom-3 z-40 rounded-[24px] border border-border px-3 pt-3 lg:hidden">
        <div className="grid grid-cols-5 items-end gap-1">
          {navItems.map((item) => {
            const isActive =
              item.key === "home"
                ? location.pathname === "/"
                : item.key === "new"
                  ? location.pathname === "/discover" && location.search.includes("compose=1")
                  : location.pathname.startsWith(item.to);

            if (item.key === "new") {
              return (
                <button
                  key={item.key}
                  className="flex flex-col items-center gap-1"
                  onClick={() => navigate(item.to)}
                  type="button"
                >
                  <motion.span
                    className="grid h-12 w-12 place-items-center rounded-full bg-accent text-white shadow-glow"
                    whileTap={{ scale: 0.95 }}
                    animate={isActive ? { y: [-1, 1, 0] } : undefined}
                    transition={{ duration: 0.24, ease: APP_EASE }}
                  >
                    <item.icon className="h-5 w-5" />
                  </motion.span>
                  <span className="text-[11px] text-[var(--muted)]">{item.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.key}
                to={item.to}
                className="relative flex flex-col items-center gap-1 rounded-[16px] px-2 py-1.5 text-xs text-[var(--muted)] transition"
              >
                <motion.span
                  className={isActive ? "text-accent" : ""}
                  animate={
                    isActive
                      ? {
                          scale: [1, 1.2, 1],
                        }
                      : {
                          scale: 1,
                        }
                  }
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                >
                  <item.icon className="h-4 w-4" />
                </motion.span>
                <span className={isActive ? "text-accent" : ""}>{item.label}</span>
                {isActive ? (
                  <motion.span
                    className="absolute -bottom-0.5 h-1.5 w-1.5 rounded-full bg-accent"
                    layoutId="pulse-active-tab"
                  />
                ) : null}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {installBannerVisible ? (
          <motion.div
            className="glass-elevated fixed inset-x-4 bottom-24 z-50 rounded-[20px] border border-border p-4 shadow-modal lg:hidden"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-accent/18 text-lg font-heading text-accent">
                P
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Install Pulse</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Add it to your home screen for the full standalone experience.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={dismissInstallBanner}>
                Not now
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!installPromptEvent) {
                    return;
                  }

                  await installPromptEvent.prompt();
                  setInstallPromptEvent(null);
                  setInstallBannerVisible(false);
                }}
              >
                Install
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Modal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notifications"
      >
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-border bg-white/4 px-4 py-8 text-center text-sm text-[var(--muted)]">
              No notifications yet. Pulse will surface friend requests, messages, stories,
              and channel posts here.
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                className={`w-full rounded-[14px] border px-4 py-4 text-left transition ${
                  notification.isRead
                    ? "border-border bg-white/4 hover:bg-white/7"
                    : "border-accent/20 bg-accent/10 hover:bg-accent/14"
                }`}
                onClick={() => void openNotificationDestination(notification)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{notification.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{notification.body}</p>
                  </div>
                  {!notification.isRead ? (
                    <span className="mt-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AppShell;
