import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  Compass,
  House,
  MessageCircle,
  MessageSquarePlus,
  RadioTower,
  Search,
  UserCircle2,
} from "lucide-react";

import { ChatList } from "@/components/chat/ChatList";
import { MediaViewer } from "@/components/media/MediaViewer";
import { StoryUploader } from "@/components/stories/StoryUploader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ChatListSkeleton } from "@/components/ui/Skeleton";
import { ToastViewport } from "@/components/ui/Toast";
import { type RouteMotionKind, shellRouteVariants } from "@/lib/motion";
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
      subtitle: "Find people and start something new",
      showBack: false,
    };
  }

  if (pathname.startsWith("/channels")) {
    return {
      title: "Channels",
      subtitle: "Broadcasts, drops, and community threads",
      showBack: false,
    };
  }

  if (pathname.startsWith("/profile")) {
    return {
      title: "Profile",
      subtitle: "Your stories, media, and device state",
      showBack: false,
    };
  }

  if (pathname.startsWith("/settings")) {
    return {
      title: "Settings",
      subtitle: "Privacy, alerts, and appearance",
      showBack: true,
    };
  }

  return {
    title: "Pulse",
    subtitle: "Stories and messages in dark mode",
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
    <div className="pulse-app-shell">
      <ToastViewport />
      <MediaViewer />

      {!isChatRoute ? (
        <div className="ig-mobile-topbar lg:hidden">
          <div className="ig-mobile-topbar__inner">
            <div className="flex min-w-0 items-center gap-3">
              {pageMeta.showBack ? (
                <button className="ig-icon-button" onClick={() => navigate(-1)} type="button">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : null}
              <div className="min-w-0">
                <p className={pageMeta.title === "Pulse" ? "ig-wordmark text-2xl" : "text-lg font-semibold"}>
                  {pageMeta.title}
                </p>
                <p className="truncate text-xs text-[var(--text-secondary)]">
                  {pageMeta.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="ig-icon-button" onClick={() => navigate("/discover")} type="button">
                <Search className="h-4 w-4" />
              </button>
              <button
                className="ig-icon-button relative"
                onClick={() => setNotificationsOpen(true)}
                type="button"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 ig-badge">{unreadNotifications}</span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 px-4 pb-28 pt-[4.5rem] lg:px-6 lg:pb-6 lg:pt-6">
        <aside className="ig-desktop-rail">
          <div className="flex flex-col items-center gap-4">
            <button
              aria-label="Pulse home"
              className="ig-logo-square"
              onClick={() => navigate("/")}
              type="button"
            >
              P
            </button>

            <div className="flex flex-col items-center gap-3">
              {[
                { key: "home", to: "/", icon: House },
                { key: "search", to: "/discover", icon: Search },
                { key: "new", to: "/discover?compose=1", icon: MessageSquarePlus },
                { key: "messages", to: "/", icon: MessageCircle },
                { key: "channels", to: "/channels", icon: RadioTower },
              ].map((item) => {
                const active =
                  item.key === "channels"
                    ? location.pathname.startsWith("/channels")
                    : item.key === "search"
                      ? location.pathname.startsWith("/discover")
                      : item.key === "new"
                        ? location.pathname.startsWith("/discover") &&
                          location.search.includes("compose=1")
                        : item.key === "messages"
                          ? location.pathname.startsWith("/chat/")
                          : location.pathname === "/";

                return (
                  <button
                    key={item.key}
                    className="relative flex flex-col items-center gap-1"
                    onClick={() => navigate(item.to)}
                    type="button"
                  >
                    <span
                      className={`ig-icon-button ${active ? "text-[var(--text-primary)]" : ""}`}
                    >
                      <item.icon className="h-[22px] w-[22px]" />
                    </span>
                    {active ? <span className="ig-bottom-nav__dot static" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="rounded-full p-[2px]"
            onClick={() => navigate("/profile")}
            style={{ background: "var(--grad-brand-3)" }}
            type="button"
          >
            <Avatar src={user.avatarUrl} alt={user.displayName} size="sm" />
          </button>
        </aside>

        <aside className="ig-desktop-sidebar">
          <div className="ig-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="ig-wordmark text-[32px] leading-none">Pulse</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Instagram polish, Telegram speed
                </p>
              </div>
              <button
                className="ig-icon-button relative"
                onClick={() => setNotificationsOpen(true)}
                type="button"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 ig-badge">{unreadNotifications}</span>
                ) : null}
              </button>
            </div>

            <div className="ig-search mt-4">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
              <input className="ig-search__input" placeholder="Search" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <StoryUploader
                onUploaded={async () => {
                  const response = await api.get("/stories");
                  setStories(response.data.data.stories as StoryGroup[]);
                }}
              />
              {installPromptEvent ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await installPromptEvent.prompt();
                    setInstallPromptEvent(null);
                    setInstallBannerVisible(false);
                  }}
                >
                  Install
                </Button>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <div className="mb-3 px-2">
              <p className="ig-section-label">Messages</p>
            </div>
            <div className="scrollbar-hidden max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
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

        <main className="pulse-route-layer">
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

      <nav className="ig-bottom-nav lg:hidden">
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
                className="ig-bottom-nav__item"
                onClick={() => navigate(item.to)}
                type="button"
              >
                <motion.span
                  animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  className="ig-bottom-nav__center"
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                >
                  <item.icon className="h-5 w-5" />
                </motion.span>
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.key}
              className={`ig-bottom-nav__item ${isActive ? "ig-bottom-nav__item--active" : ""}`}
              onClick={() => navigate(item.to)}
              type="button"
            >
              <motion.span
                animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
              >
                <item.icon className="h-4 w-4" />
              </motion.span>
              <span>{item.label}</span>
              {isActive ? <span className="ig-bottom-nav__dot" /> : null}
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {installBannerVisible ? (
          <motion.div
            className="ig-install-card lg:hidden"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="flex items-start gap-3">
              <div className="ig-logo-square ig-logo-square--large">P</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Install Pulse</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Add it to your home screen for the full experience.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={dismissInstallBanner}>
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
            <div className="ig-empty-state min-h-[180px]">
              <div className="ig-empty-art" />
              <p className="text-[15px] text-[var(--text-secondary)]">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                className="ig-list-row w-full text-left"
                onClick={() => void openNotificationDestination(notification)}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{notification.body}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.isRead ? <span className="ig-badge">New</span> : null}
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AppShell;
