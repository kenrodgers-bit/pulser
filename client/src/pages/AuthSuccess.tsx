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
    <PageTransition className="ig-auth-shell">
      <div className="ig-auth-card text-center">
        <div className="ig-logo-square ig-logo-square--large mx-auto">P</div>
        <p className="ig-wordmark mt-5 text-[28px] text-[var(--white)]">Signing you in...</p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Pulse is syncing your account and preparing your inbox.
        </p>
      </div>
    </PageTransition>
  );
};
