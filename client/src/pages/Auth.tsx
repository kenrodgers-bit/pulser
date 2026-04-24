import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { resolveApiUrl } from "@/lib/api";
import { isBackendConfigured, missingBackendMessage } from "@/lib/runtimeConfig";
import { useUIStore } from "@/store/uiStore";

const loginSchema = z.object({
  identifier: z.string().min(3, "Use your email or username."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters.").max(24),
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(40),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const errorMessages: Record<string, string> = {
  google_failed: "Google sign-in failed. Try again.",
  google_unavailable: "Google sign-in is not configured yet. Use email instead.",
  server_error: "Something went wrong. Please try again.",
  fetch_failed: "Couldn't load your account. Try logging in.",
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="var(--google-blue)"
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
    />
    <path
      fill="var(--google-green)"
      d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="var(--google-yellow)"
      d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
    />
    <path
      fill="var(--google-red)"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
    />
  </svg>
);

export const AuthPage = () => {
  const { user, login, register } = useAuth();
  const pushToast = useUIStore((state) => state.pushToast);
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const googleAuthEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
  const googleAuthUrl = useMemo(
    () => (googleAuthEnabled ? resolveApiUrl("/api/auth/google") : null),
    [googleAuthEnabled],
  );
  const authDisabled = !isBackendConfigured;
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const nextError = searchParams.get("error");

    if (!nextError) {
      return;
    }

    pushToast({
      title: "Authentication update",
      description: errorMessages[nextError] || "An error occurred.",
    });
  }, [pushToast, searchParams]);

  if (user) {
    return <Navigate to={user.needsUsernameSetup ? "/setup-profile" : "/"} replace />;
  }

  return (
    <PageTransition className="ig-auth-shell">
      <div className="ig-auth-card">
        <div className="text-center">
          <div className="ig-logo-square ig-logo-square--large mx-auto">P</div>
          <p className="ig-wordmark mt-5 text-[32px] text-[var(--white)]">Pulse</p>
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">Message freely.</p>
        </div>

        <div
          className="ig-segmented mt-8"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          {([
            ["login", "Log in"],
            ["register", "Sign up"],
          ] as const).map(([value, label], index) => (
            <button
              key={value}
              className={`ig-segmented__option ${
                mode === value ? "ig-segmented__option--active" : ""
              }`}
              onClick={() => {
                setMode(value);
                setError("");
              }}
              type="button"
            >
              {mode === value ? (
                <motion.span
                  className="ig-segmented__indicator"
                  layoutId="auth-mode-toggle"
                  style={{ width: "calc(50% - 4px)", transform: `translateX(${index * 100}%)` }}
                />
              ) : null}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>

        {googleAuthEnabled ? (
          <button
            className="ig-google-button mt-6"
            disabled={authDisabled || !googleAuthUrl}
            onClick={() => {
              if (!googleAuthUrl) {
                setError(missingBackendMessage);
                return;
              }

              window.location.href = googleAuthUrl;
            }}
            type="button"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        ) : null}

        {authDisabled ? (
          <div
            className="ig-soft-card mt-4 p-4 text-sm text-[var(--danger)]"
            style={{ borderColor: "var(--danger-soft)" }}
          >
            This Pulse deployment is online, but its backend is not connected yet.
          </div>
        ) : null}

        <div className="ig-auth-divider mt-5">
          {googleAuthEnabled ? "or" : "email"}
        </div>

        <div className="mt-5 space-y-4">
          {mode === "login" ? (
            <form
              className="space-y-4"
              onSubmit={loginForm.handleSubmit(async (values) => {
                if (authDisabled) {
                  setError(missingBackendMessage);
                  return;
                }

                try {
                  setError("");
                  await login(values.identifier, values.password);
                } catch (caughtError: any) {
                  setError(caughtError?.response?.data?.message ?? "Unable to sign in.");
                }
              })}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Email or username</label>
                <input
                  className="ig-field"
                  disabled={authDisabled}
                  placeholder="kenny"
                  {...loginForm.register("identifier")}
                />
                {loginForm.formState.errors.identifier ? (
                  <p className="text-[11px] text-[var(--danger)]">
                    {loginForm.formState.errors.identifier.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <input
                  className="ig-field"
                  disabled={authDisabled}
                  placeholder="At least 8 characters"
                  type="password"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password ? (
                  <p className="text-[11px] text-[var(--danger)]">
                    {loginForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              {error ? <p className="text-[11px] text-[var(--danger)]">{error}</p> : null}
              <Button className="w-full" disabled={authDisabled} type="submit">
                Enter Pulse
              </Button>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={registerForm.handleSubmit(async (values) => {
                if (authDisabled) {
                  setError(missingBackendMessage);
                  return;
                }

                try {
                  setError("");
                  await register(values);
                } catch (caughtError: any) {
                  setError(
                    caughtError?.response?.data?.message ??
                      "Unable to create your account.",
                  );
                }
              })}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <input className="ig-field" disabled={authDisabled} placeholder="kenny" {...registerForm.register("username")} />
                {registerForm.formState.errors.username ? (
                  <p className="text-[11px] text-[var(--danger)]">
                    {registerForm.formState.errors.username.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Display name</label>
                <input
                  className="ig-field"
                  disabled={authDisabled}
                  placeholder="Kenny"
                  {...registerForm.register("displayName")}
                />
                {registerForm.formState.errors.displayName ? (
                  <p className="text-[11px] text-[var(--danger)]">
                    {registerForm.formState.errors.displayName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  className="ig-field"
                  disabled={authDisabled}
                  placeholder="you@example.com"
                  type="email"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email ? (
                  <p className="text-[11px] text-[var(--danger)]">
                    {registerForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <input
                  className="ig-field"
                  disabled={authDisabled}
                  placeholder="At least 8 characters"
                  type="password"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password ? (
                  <p className="text-[11px] text-[var(--danger)]">
                    {registerForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              {error ? <p className="text-[11px] text-[var(--danger)]">{error}</p> : null}
              <Button className="w-full" disabled={authDisabled} type="submit">
                Create account
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            className="font-semibold text-[var(--brand-violet)]"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            type="button"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </PageTransition>
  );
};
