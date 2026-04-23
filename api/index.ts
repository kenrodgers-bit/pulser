import { createPulseApp, ensureAppReady } from "../server/src/app";

const app = createPulseApp({
  initialize: ensureAppReady,
});

export default app;
