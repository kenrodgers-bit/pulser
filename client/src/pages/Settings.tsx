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
      <section className="ig-panel">
        <p className="ig-section-label">Appearance</p>
        <h2 className="ig-section-title mt-3">Look and feel</h2>
        <div
          className="ig-segmented mt-5"
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        >
          {appearanceOptions.map((option, index) => (
            <button
              key={option.id}
              className={`ig-segmented__option ${
                theme === option.id ? "ig-segmented__option--active" : ""
              }`}
              onClick={() => setTheme(option.id)}
              type="button"
            >
              {theme === option.id ? (
                <motion.span
                  className="ig-segmented__indicator"
                  layoutId="pulse-appearance-tab"
                  style={{ width: "calc(33.333% - 4px)", transform: `translateX(${index * 100}%)` }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative z-10 capitalize">{option.id}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 ig-soft-card p-4">
          <p className="text-sm font-semibold">Live preview</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-[14px] bg-[var(--bg-base)] p-3">
              <div className="rounded-[12px] bg-[var(--bg-surface)] px-3 py-3 text-sm">
                Chat bubble
              </div>
            </div>
            <div className="rounded-[14px] bg-[var(--bg-base)] p-3">
              <div className="rounded-[12px] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
                Elevated card
              </div>
            </div>
            <div className="rounded-[14px] bg-[var(--bg-base)] p-3">
              <div
                className="rounded-[12px] px-3 py-3 text-sm text-[var(--white)]"
                style={{
                  background: "var(--grad-brand-2)",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                Accent action
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ig-panel">
        <h3 className="text-sm font-semibold">Profile and privacy</h3>
        <div className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="ig-soft-card p-4">
            <div className="flex flex-col items-center text-center">
              <Avatar src={avatarPreview} alt={user.displayName} size="xl" />
              <p className="mt-4 text-sm font-semibold">{form.displayName || user.displayName}</p>
              <p className="text-sm text-[var(--text-secondary)]">@{form.username || user.username}</p>
              <label className="mt-5 ig-pill cursor-pointer">
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
              className="ig-field"
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
              className="ig-field"
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
              className="ig-textarea"
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
                <label key={key} className="ig-soft-card block px-4 py-4">
                  <span className="text-sm font-medium">{label}</span>
                  <select
                    className="ig-select mt-3"
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

      <section className="ig-panel">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--unread)]" />
          <h3 className="text-sm font-semibold">Notification preferences</h3>
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
              className="ig-list-row text-left"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
              type="button"
            >
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
              </div>
              <span className={form[key] ? "ig-badge" : "ig-pill"}>{form[key] ? "On" : "Off"}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Browser push subscription is enabled from your profile page; these settings
          control how Pulse behaves after the device is registered.
        </p>
      </section>

      <section className="ig-panel">
        <h3 className="text-sm font-semibold">Account security</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            className="ig-field"
            placeholder="Current password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
          />
          <input
            className="ig-field"
            placeholder="New password"
            type="password"
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
            await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
          }}
        >
          Change password
        </Button>
      </section>

      <section className="ig-panel border-[rgba(231,76,60,0.24)]">
        <h3 className="text-sm font-semibold text-[var(--danger)]">Danger zone</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Deleting your account removes your profile and signs you out on this device.
        </p>
        <Button
          className="mt-5"
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
          variant="danger"
        >
          Delete account
        </Button>
      </section>
    </PageTransition>
  );
};
