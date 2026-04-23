import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useUIStore } from "@/store/uiStore";

const AuthPage = lazy(() => import("@/pages/Auth").then((module) => ({ default: module.AuthPage })));
const AuthSuccessPage = lazy(() =>
  import("@/pages/AuthSuccess").then((module) => ({ default: module.AuthSuccessPage })),
);
const HomePage = lazy(() => import("@/pages/Home").then((module) => ({ default: module.HomePage })));
const DiscoverPage = lazy(() =>
  import("@/pages/Discover").then((module) => ({ default: module.DiscoverPage })),
);
const ChannelsPage = lazy(() =>
  import("@/pages/Channels").then((module) => ({ default: module.ChannelsPage })),
);
const ProfilePage = lazy(() =>
  import("@/pages/Profile").then((module) => ({ default: module.ProfilePage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/Settings").then((module) => ({ default: module.SettingsPage })),
);
const ChatPage = lazy(() => import("@/pages/Chat").then((module) => ({ default: module.ChatPage })));
const SetupProfilePage = lazy(() =>
  import("@/pages/SetupProfile").then((module) => ({ default: module.SetupProfilePage })),
);
const AppShell = lazy(() =>
  import("@/layouts/AppShell").then((module) => ({ default: module.AppShell })),
);

const RouteLoader = ({ message = "Loading..." }: { message?: string }) => (
  <div className="ig-auth-shell">
    <div className="ig-auth-card text-center">
      <div className="ig-logo-square ig-logo-square--large mx-auto">P</div>
      <p className="ig-wordmark mt-5 text-[32px] text-[var(--white)]">Pulse</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  </div>
);

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <RouteLoader message="Syncing your space..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppInner = () => {
  const { initialize } = useAuth();
  const pushToast = useUIStore((state) => state.pushToast);
  const theme = useUIStore((state) => state.theme);
  const location = useLocation();
  useSocket();

  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW() {
      pushToast({
        title: "Offline ready",
        description: "Pulse can now cache the shell for standalone use.",
      });
    },
  });

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") {
      const isLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      root.classList.toggle("light", isLight);
    } else {
      root.classList.toggle("light", theme === "light");
    }
  }, [theme]);

  useEffect(() => {
    if (offlineReady[0]) {
      pushToast({
        title: "Pulse is ready offline",
        description: "Install it to keep your shell cached on mobile.",
      });
    }
  }, [offlineReady, pushToast]);

  useEffect(() => {
    if (needRefresh[0]) {
      pushToast({
        title: "Updating Pulse",
        description: "Refreshing now so the latest production build is active.",
      });
      void updateServiceWorker(true);
    }
  }, [needRefresh, pushToast, updateServiceWorker]);

  return (
    <>
      <AnimatePresence initial={false} mode="wait">
        <Suspense fallback={<RouteLoader message="Loading Pulse..." />}>
          <Routes
            location={location}
            key={location.pathname.startsWith("/auth") ? "/auth" : "/app"}
          >
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/success" element={<AuthSuccessPage />} />
            <Route
              path="/setup-profile"
              element={
                <RequireAuth>
                  <SetupProfilePage />
                </RequireAuth>
              }
            />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="/chat/:chatId" element={<ChatPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/channels/:channelId" element={<ChannelsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AnimatePresence>
      {needRefresh[0] ? (
        <button
          className="ig-button ig-button--primary ig-button--md fixed bottom-28 right-4 z-50"
          onClick={() => updateServiceWorker(true)}
        >
          Update Pulse
        </button>
      ) : null}
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <AppInner />
  </BrowserRouter>
);

export default App;
