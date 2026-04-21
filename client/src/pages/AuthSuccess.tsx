import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { PageTransition } from "@/components/ui/PageTransition";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

export const AuthSuccessPage = () => {
  const navigate = useNavigate();
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const pushToast = useUIStore((state) => state.pushToast);

  useEffect(() => {
    const completeLogin = async () => {
      try {
        const user = await fetchCurrentUser();
        navigate(user.needsUsernameSetup ? "/setup-profile" : "/", {
          replace: true,
        });
      } catch {
        pushToast({
          title: "Authentication update",
          description: "Couldn't load your account. Try logging in.",
        });
        navigate("/auth?error=fetch_failed", { replace: true });
      }
    };

    void completeLogin();
  }, [fetchCurrentUser, navigate, pushToast]);

  return (
    <PageTransition className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-elevated rounded-[22px] border border-border px-8 py-10 text-center shadow-modal">
        <p className="font-heading text-2xl font-semibold tracking-[-0.04em] text-accent">
          Signing you in...
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Pulse is syncing your account and preparing your inbox.
        </p>
      </div>
    </PageTransition>
  );
};
