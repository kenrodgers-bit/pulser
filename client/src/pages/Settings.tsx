import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { motion } from "framer-motion";
import { Bell, Camera, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

const appearanceOptions = [
  {
    id: "dark",
    description: "Keep Pulse dark-first.",
  },
  {
    id: "light",
    description: "Lift the glass surfaces for daytime use.",
  },
  {
    id: "system",
    description: "Match your device setting.",
  },
] as const;

export const SettingsPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user)!;
  const setUser = useAuthStore((state) => state.setUser);
  const { updateProfile, changePassword } = useAuth();
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const pushToast = useUIStore((state) => state.pushToast);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    displayName: user.displayName,
    username: user.username,
    bio: user.bio ?? "",
    lastSeen: user.privacy.lastSeen,
    avatar: user.privacy.avatar,
    stories: user.privacy.stories,
    pushEnabled: user.notificationSettings.pushEnabled,
    customSound: user.notificationSettings.customSound,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const avatarPreview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : user.avatarUrl),
    [avatarFile, user.avatarUrl],
  );

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  return (
    <PageTransition className="space-y-4">
      <section className="glass-panel rounded-[20px] p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
          Appearance
        </p>
        <h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.03em]">
          Look and feel
        </h2>
        <div className="mt-5 grid gap-2 rounded-[14px] border border-border bg-white/4 p-1 md:grid-cols-3">
          {appearanceOptions.map((option) => (
            <button
              key={option.id}
              className="relative overflow-hidden rounded-[12px] px-4 py-4 text-left transition"
              onClick={() => setTheme(option.id)}
              type="button"
            >
              {theme === option.id ? (
                <motion.span
                  className="absolute inset-0 rounded-[12px] border border-accent/35 bg-accent/14"
                  layoutId="pulse-appearance-tab"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <p className="relative z-10 font-semibold capitalize">{option.id}</p>
              <p className="relative z-10 mt-1 text-sm text-[var(--muted)]">
                {option.description}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-[14px] border border-border bg-white/4 p-4">
          <p className="text-sm font-semibold">Live preview</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-[14px] bg-[var(--pulse-bg)] p-3">
              <div className="rounded-[10px] bg-[var(--pulse-surface)] px-3 py-3 text-sm text-[var(--pulse-text)]">
                Chat bubble
              </div>
            </div>
            <div className="rounded-[14px] bg-[var(--pulse-bg)] p-3">
              <div className="rounded-[10px] bg-[var(--pulse-surface2)] px-3 py-3 text-sm text-[var(--pulse-text)]">
                Elevated card
              </div>
            </div>
            <div className="rounded-[14px] bg-[var(--pulse-bg)] p-3">
              <div className="rounded-[10px] bg-[var(--pulse-accent)] px-3 py-3 text-sm text-white shadow-glow">
                Accent action
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[20px] p-5">
        <h3 className="font-semibold">Profile and privacy</h3>
        <div className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[16px] border border-border bg-white/4 p-4">
            <div className="flex flex-col items-center text-center">
              <Avatar src={avatarPreview} alt={user.displayName} size="xl" />
              <p className="mt-4 font-semibold">{form.displayName || user.displayName}</p>
              <p className="text-sm text-[var(--muted)]">@{form.username || user.username}</p>
              <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/12">
                <Camera className="h-4 w-4" />
                Change avatar
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <input
              className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
              placeholder="Display name"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
            <input
              className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
              placeholder="Username"
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
            />
            <textarea
              className="min-h-28 w-full rounded-[12px] border border-border bg-white/5 px-4 py-3 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
              placeholder="Bio"
              value={form.bio}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
            />
            <div className="grid gap-4 md:grid-cols-3">
              {([
                ["lastSeen", "Who can see my last seen"],
                ["avatar", "Who can see my avatar"],
                ["stories", "Who can see my stories"],
              ] as const).map(([key, label]) => (
                <label
                  key={key}
                  className="block rounded-[14px] border border-border bg-white/4 px-4 py-4"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <select
                    className="mt-3 h-11 w-full rounded-[12px] border border-border bg-white/5 px-3 outline-none focus:border-accent/40"
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </label>
              ))}
            </div>

            <Button
              onClick={async () => {
                const privacy = {
                  lastSeen: form.lastSeen,
                  avatar: form.avatar,
                  stories: form.stories,
                };
                const notificationSettings = {
                  pushEnabled: form.pushEnabled,
                  customSound: form.customSound,
                };

                if (avatarFile) {
                  const payload = new FormData();
                  payload.append("avatar", avatarFile);
                  payload.append("displayName", form.displayName);
                  payload.append("username", form.username);
                  payload.append("bio", form.bio);
                  payload.append("privacy", JSON.stringify(privacy));
                  payload.append(
                    "notificationSettings",
                    JSON.stringify(notificationSettings),
                  );
                  await updateProfile(payload);
                  setAvatarFile(null);
                  return;
                }

                await updateProfile({
                  displayName: form.displayName,
                  username: form.username,
                  bio: form.bio,
                  privacy,
                  notificationSettings,
                });
              }}
            >
              Save profile settings
            </Button>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[20px] p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          <h3 className="font-semibold">Notification preferences</h3>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {([
            [
              "pushEnabled",
              "Push notifications",
              "Allow Pulse to send alerts to your installed PWA or browser.",
            ],
            [
              "customSound",
              "Custom sound",
              "Use your selected chat sound instead of the default tone.",
            ],
          ] as const).map(([key, label, description]) => (
            <button
              key={key}
              className={`rounded-[14px] border px-4 py-4 text-left transition ${
                form[key]
                  ? "border-accent/30 bg-accent/10"
                  : "border-border bg-white/4 hover:bg-white/8"
              }`}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
              type="button"
            >
              <p className="font-semibold">{label}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Browser push subscription is enabled from your profile page; these settings control
          how Pulse should behave after the device is registered.
        </p>
      </section>

      <section className="glass-panel rounded-[20px] p-5">
        <h3 className="font-semibold">Account security</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            type="password"
            className="h-12 rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            placeholder="Current password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
          />
          <input
            type="password"
            className="h-12 rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            placeholder="New password"
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                newPassword: event.target.value,
              }))
            }
          />
        </div>
        <Button
          className="mt-5"
          onClick={async () => {
            await changePassword(
              passwordForm.currentPassword,
              passwordForm.newPassword,
            );
          }}
        >
          Change password
        </Button>
      </section>

      <section className="glass-panel rounded-[20px] border border-danger/20 p-5">
        <h3 className="font-semibold text-danger">Danger zone</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Deleting your account removes your profile and signs you out on this device.
        </p>
        <Button
          className="mt-5"
          variant="danger"
          iconLeft={<Trash2 className="h-4 w-4" />}
          onClick={async () => {
            if (
              !window.confirm(
                "Delete your Pulse account permanently? This cannot be undone.",
              )
            ) {
              return;
            }

            await api.delete("/auth/account");
            setUser(null);
            pushToast({
              title: "Account deleted",
              description: "Your Pulse account has been removed.",
            });
            navigate("/auth");
          }}
        >
          Delete account
        </Button>
      </section>
    </PageTransition>
  );
};
