import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { PageTransition } from "@/components/ui/PageTransition";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

type AvailabilityState = {
  checking: boolean;
  available: boolean;
  message: string;
};

export const SetupProfilePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const pushToast = useUIStore((state) => state.pushToast);
  const [username, setUsername] = useState(user?.username ?? "");
  const [availability, setAvailability] = useState<AvailabilityState>({
    checking: false,
    available: false,
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const nextValue = username.trim().toLowerCase();

    if (nextValue.length < 3) {
      setAvailability({
        checking: false,
        available: false,
        message: "Username must be at least 3 characters.",
      });
      return;
    }

    const timer = window.setTimeout(async () => {
      setAvailability((current) => ({
        ...current,
        checking: true,
      }));

      try {
        const response = await api.get("/users/username-availability", {
          params: {
            username: nextValue,
          },
        });

        setAvailability({
          checking: false,
          available: Boolean(response.data.data.available),
          message: response.data.data.available
            ? "Username available."
            : "That username is already taken.",
        });
      } catch {
        setAvailability({
          checking: false,
          available: false,
          message: "Could not check username availability.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [user, username]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!user.needsUsernameSetup) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageTransition className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="glass-elevated w-full max-w-md rounded-[24px] border border-border p-6 shadow-modal md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
          Setup profile
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em]">
          Choose your username
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Your Google account is connected. Pick the username people will use to find you in
          Pulse.
        </p>

        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium">Username</label>
          <input
            className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <p
            className={`text-xs ${
              availability.available ? "text-emerald-400" : "text-[var(--muted)]"
            }`}
          >
            {availability.checking ? "Checking username..." : availability.message}
          </p>
        </div>

        <Button
          className="mt-6 w-full"
          disabled={!availability.available || submitting}
          onClick={async () => {
            setSubmitting(true);

            try {
              const response = await api.patch("/users/username", {
                username,
              });
              setUser(response.data.data.user);
              pushToast({
                title: "Username saved",
                description: `You're live as @${response.data.data.user.username}.`,
              });
              navigate("/", { replace: true });
            } catch (error: any) {
              pushToast({
                title: "Could not save username",
                description:
                  error?.response?.data?.message ?? "Please try another username.",
              });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          Continue
        </Button>
      </div>
    </PageTransition>
  );
};
