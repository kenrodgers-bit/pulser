import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { zodResolver } from "@hookform/resolvers/zod";
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
  server_error: "Something went wrong. Please try again.",
  fetch_failed: "Couldn't load your account. Try logging in.",
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
    />
    <path
      fill="#EA4335"
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
  const googleAuthUrl = useMemo(() => resolveApiUrl("/api/auth/google"), []);
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
    <PageTransition className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,92,252,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(165,140,245,0.12),transparent_22%)]" />
      <div className="relative w-full max-w-[420px]">
        <div className="glass-elevated rounded-[24px] border border-border p-6 shadow-modal md:p-8">
          <div className="text-center">
            <p className="font-heading text-3xl font-semibold tracking-[-0.04em]">Pulse</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Message freely.</p>
          </div>

          <div className="mt-8 rounded-[14px] border border-border bg-white/6 p-1">
            <div className="grid grid-cols-2 gap-2">
              {([
                ["login", "Log in"],
                ["register", "Sign up"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  className={`h-11 rounded-[12px] text-sm font-semibold transition ${
                    mode === value
                      ? "bg-accent text-white shadow-glow"
                      : "text-[var(--muted)] hover:bg-white/6"
                  }`}
                  onClick={() => {
                    setMode(value);
                    setError("");
                  }}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <button
              className="flex h-12 w-full items-center justify-center gap-3 rounded-[12px] bg-white px-4 text-sm font-semibold text-[#161616] transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                if (!googleAuthUrl) {
                  setError(missingBackendMessage);
                  return;
                }

                window.location.href = googleAuthUrl;
              }}
              disabled={authDisabled || !googleAuthUrl}
              type="button"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          {authDisabled ? (
            <div className="mt-4 rounded-[14px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              This Pulse deployment is online, but its backend is not connected yet.
              Add `VITE_API_URL` and `VITE_SERVER_URL` to enable sign-in, stories, and chat.
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              or continue with email
            </span>
            <div className="h-px flex-1 bg-border" />
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
                    className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
                    placeholder="kenny"
                    disabled={authDisabled}
                    {...loginForm.register("identifier")}
                  />
                  {loginForm.formState.errors.identifier ? (
                    <p className="text-xs text-danger">
                      {loginForm.formState.errors.identifier.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <input
                    type="password"
                    className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
                    placeholder="At least 8 characters"
                    disabled={authDisabled}
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password ? (
                    <p className="text-xs text-danger">
                      {loginForm.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
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
                  <input
                    className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
                    placeholder="kenny"
                    disabled={authDisabled}
                    {...registerForm.register("username")}
                  />
                  {registerForm.formState.errors.username ? (
                    <p className="text-xs text-danger">
                      {registerForm.formState.errors.username.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display name</label>
                  <input
                    className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
                    placeholder="Kenny"
                    disabled={authDisabled}
                    {...registerForm.register("displayName")}
                  />
                  {registerForm.formState.errors.displayName ? (
                    <p className="text-xs text-danger">
                      {registerForm.formState.errors.displayName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
                    placeholder="you@example.com"
                    disabled={authDisabled}
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email ? (
                    <p className="text-xs text-danger">
                      {registerForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <input
                    type="password"
                    className="h-12 w-full rounded-[12px] border border-border bg-white/5 px-4 outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
                    placeholder="At least 8 characters"
                    disabled={authDisabled}
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password ? (
                    <p className="text-xs text-danger">
                      {registerForm.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button className="w-full" disabled={authDisabled} type="submit">
                  Create your space
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              className="font-semibold text-accent-2 transition hover:text-white"
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
      </div>
    </PageTransition>
  );
};
