import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BellOff, BellRing, Download, LogOut } from "lucide-react";

import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

type SavedPushSubscription = {
  endpoint: string;
  createdAt: string;
};

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useAuthStore((state) => state.user)!;
  const chats = useChatStore((state) => state.chats);
  const channels = useChatStore((state) => state.channels);
  const stories = useChatStore((state) => state.stories);
  const installPromptEvent = useUIStore((state) => state.installPromptEvent);
  const setInstallPromptEvent = useUIStore((state) => state.setInstallPromptEvent);
  const pushToast = useUIStore((state) => state.pushToast);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof Notification === "undefined" ? "default" : Notification.permission,
  );
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState("");
  const [pushSavedOnServer, setPushSavedOnServer] = useState(false);
  const [pushStatusLoaded, setPushStatusLoaded] = useState(false);

  const activeStoryCount = useMemo(
    () =>
      stories
        .filter((group) => group.user.id === user.id)
        .flatMap((group) => group.stories).length,
    [stories, user.id],
  );

  const refreshPushState = async () => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supported);
    setPushPermission(
      typeof Notification === "undefined" ? "default" : Notification.permission,
    );

    if (!supported) {
      setPushEndpoint("");
      setPushSavedOnServer(false);
      setPushStatusLoaded(true);
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const endpoint = subscription?.endpoint ?? "";
    setPushEndpoint(endpoint);

    const response = await api.get("/users/push-subscriptions");
    const subscriptions = response.data.data.subscriptions as SavedPushSubscription[];
    setPushSavedOnServer(Boolean(endpoint) && subscriptions.some((item) => item.endpoint === endpoint));
    setPushStatusLoaded(true);
  };

  useEffect(() => {
    void refreshPushState().catch(() => {
      setPushStatusLoaded(true);
    });
  }, []);

  const pushStatusLabel = !pushSupported
    ? "This browser does not support Web Push."
    : !pushStatusLoaded
      ? "Checking this device..."
      : pushEndpoint && pushSavedOnServer
        ? "Push is active on this device."
        : pushEndpoint
          ? "This device has a browser subscription that still needs to be synced with Pulse."
          : pushPermission === "denied"
            ? "Browser notification permission is blocked."
            : "Push is not active on this device yet.";

  return (
    <PageTransition className="space-y-4">
      <section className="glass-panel rounded-[20px] p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={user.avatarUrl} alt={user.displayName} size="xl" />
            <div>
              <p className="font-heading text-3xl font-semibold tracking-[-0.03em]">{user.displayName}</p>
              <p className="mt-1 text-[var(--muted)]">@{user.username}</p>
              <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
                {user.bio || "Add a bio in Settings to personalise your Pulse card."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate("/settings")}>
              Edit profile
            </Button>
            <Button
              variant="secondary"
              iconLeft={<Download className="h-4 w-4" />}
              onClick={async () => {
                if (!installPromptEvent) {
                  pushToast({
                    title: "Install unavailable",
                    description:
                      "The Add to Home Screen prompt only appears in supported mobile browsers.",
                  });
                  return;
                }

                await installPromptEvent.prompt();
                setInstallPromptEvent(null);
              }}
            >
              Install Pulse
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Chats", chats.length.toString()],
          ["Channels", channels.length.toString()],
          ["Your active stories", activeStoryCount.toString()],
        ].map(([label, value]) => (
          <div key={label} className="glass-panel rounded-[16px] p-5">
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-4 font-heading text-4xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-[20px] p-5">
        <p className="font-semibold">Device and notification setup</p>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Pulse is ready to install as a standalone app and can subscribe to Web Push
          so new messages show up even when the tab is closed.
        </p>
        <div className="mt-5 rounded-[16px] border border-border bg-white/4 px-4 py-4">
          <p className="text-sm font-medium">Push status</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{pushStatusLabel}</p>
          {pushEndpoint ? (
            <p className="mt-2 truncate text-xs text-[var(--muted)]">
              Endpoint: {pushEndpoint}
            </p>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            iconLeft={
              pushEndpoint && pushSavedOnServer ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <BellRing className="h-4 w-4" />
              )
            }
            disabled={pushLoading || !pushSupported}
            onClick={async () => {
              try {
                setPushLoading(true);
                const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;

                if (pushEndpoint && pushSavedOnServer) {
                  const registration = await navigator.serviceWorker.ready;
                  const subscription = await registration.pushManager.getSubscription();
                  const endpoint = subscription?.endpoint ?? pushEndpoint;

                  if (subscription) {
                    await subscription.unsubscribe();
                  }

                  if (endpoint) {
                    await api.delete("/users/push-subscriptions", {
                      data: { endpoint },
                    });
                  }

                  await refreshPushState();
                  pushToast({
                    title: "Push disabled",
                    description: "This device will stop receiving Pulse push notifications.",
                  });
                  return;
                }

                if (!vapidPublicKey) {
                  pushToast({
                    title: "Push key missing",
                    description:
                      "Set VITE_WEB_PUSH_PUBLIC_KEY before enabling push notifications.",
                  });
                  return;
                }

                if (Notification.permission !== "granted") {
                  const permission = await Notification.requestPermission();
                  setPushPermission(permission);

                  if (permission !== "granted") {
                    pushToast({
                      title: "Notification permission blocked",
                      description: "Allow notifications to enable push alerts in Pulse.",
                    });
                    return;
                  }
                }

                const registration = await navigator.serviceWorker.ready;
                let subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                  subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                  });
                }

                await api.post("/users/push-subscriptions", {
                  subscription: subscription.toJSON(),
                });

                await refreshPushState();
                pushToast({
                  title: pushSavedOnServer ? "Push updated" : "Push enabled",
                  description: "Pulse will now deliver web push notifications to this device.",
                });
              } catch (error: any) {
                pushToast({
                  title: "Push update failed",
                  description:
                    error?.response?.data?.message ??
                    "Pulse could not update push notifications for this device.",
                });
              } finally {
                setPushLoading(false);
              }
            }}
          >
            {pushLoading
              ? "Working..."
              : pushEndpoint && pushSavedOnServer
                ? "Disable push"
                : pushEndpoint
                  ? "Sync push"
                  : "Enable push"}
          </Button>
          <Button
            variant="danger"
            iconLeft={<LogOut className="h-4 w-4" />}
            onClick={async () => {
              await logout();
              navigate("/auth");
            }}
          >
            Logout
          </Button>
        </div>
      </section>
    </PageTransition>
  );
};
