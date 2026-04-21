# Pulse

Pulse is a full-stack Progressive Web App messaging platform that blends Instagram-style stories with Telegram-inspired chats, groups, and broadcast channels. It ships as a React + Vite + TypeScript client and a Node + Express + MongoDB + Socket.IO backend, with Cloudinary-powered media, JWT auth in `httpOnly` cookies, and installable PWA support.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Zustand, Framer Motion
- Backend: Node.js, Express, TypeScript, MongoDB, Mongoose
- Real-time: Socket.IO
- Media: Cloudinary
- Auth: JWT access + refresh token rotation in `httpOnly` cookies
- PWA: `vite-plugin-pwa`, manifest, service worker, install prompt, Web Push
- OAuth: Google sign-in via Passport + Google OAuth 2.0

## Features

- Register, login, logout, refresh-token rotation, profile editing
- Google sign-in alongside email/password auth
- Search users, send/accept/reject friend requests, friends list
- One-on-one chats and group chats
- Channel discovery plus channel membership and posting
- Real-time messaging with typing state, reactions, edits, deletes, read states
- Media messages with sender-controlled `View Once` or `Unlimited` mode
- Instagram-style stories with reactions and DM replies
- In-app notifications plus Web Push subscription support
- Dark-first responsive UI with mobile bottom nav and desktop shell

## Project Structure

```text
/
├─ client/   # React + Vite PWA
├─ server/   # Express + Socket.IO API
├─ package.json
└─ README.md
```

## Local Setup

1. Install dependencies from the repo root:

```bash
npm install
```

2. Copy the example env files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

On Windows PowerShell you can use:

```powershell
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
```

3. Fill in the environment variables described below.
4. Start both apps from the repo root:

```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173).

## Environment Variables

### Client

`client/.env`

- `VITE_API_URL`: Full API base URL including `/api`, for example `http://localhost:4000/api`
- `VITE_SERVER_URL`: Socket.IO server origin, for example `http://localhost:4000`
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID for the auth screen
- `VITE_WEB_PUSH_PUBLIC_KEY`: Public VAPID key used when subscribing browsers to Web Push

For local development you can leave `VITE_API_URL` and `VITE_SERVER_URL` blank and use the built-in Vite proxy. This keeps auth cookies same-origin on `http://localhost:5173`.

### Server

`server/.env`

- `NODE_ENV`: `development` or `production`
- `PORT`: Express + Socket.IO port
- `CLIENT_URL`: Allowed frontend origin for CORS and cookies
- `MONGODB_URI`: MongoDB Atlas or local Mongo connection string
- `JWT_ACCESS_SECRET`: Access token signing secret
- `JWT_REFRESH_SECRET`: Refresh token signing secret
- `JWT_ACCESS_TTL`: Access token lifetime, default `15m`
- `JWT_REFRESH_TTL`: Refresh token lifetime, default `7d`
- `COOKIE_DOMAIN`: Optional shared cookie domain for production
- `SESSION_SECRET`: Secret used by `express-session` for the Google OAuth handshake
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_CALLBACK_URL`: Google OAuth callback URL, default `http://localhost:4000/api/auth/google/callback`
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `WEB_PUSH_PUBLIC_KEY`: VAPID public key
- `WEB_PUSH_PRIVATE_KEY`: VAPID private key
- `WEB_PUSH_SUBJECT`: Contact email/URL used by Web Push, for example `mailto:you@example.com`

## MongoDB Atlas Setup

1. Create a MongoDB Atlas cluster.
2. Create a database user with read/write access.
3. Add your dev machine IP in Network Access.
4. Copy the connection string into `server/.env` as `MONGODB_URI`.
5. Replace the placeholder database credentials with your own values.

Note: the conversation included a direct connection string. For safety, keep secrets in `.env` only and avoid committing them.

## Cloudinary Setup

1. Create a Cloudinary account.
2. Open the Dashboard and copy:
   - Cloud name
   - API key
   - API secret
3. Put those values into `server/.env`.
4. Pulse uploads avatars, stories, chat media, and channel artwork to Cloudinary folders automatically.

## Google OAuth Setup

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project named `Pulse`.
3. Enable Google Identity / OAuth APIs for the project.
4. Open `APIs & Services -> Credentials`.
5. Create an `OAuth 2.0 Client ID`.
6. Choose `Web application`.
7. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://your-production-domain.com`
8. Add authorized redirect URIs:
   - `http://localhost:4000/api/auth/google/callback`
   - `https://your-api-domain.com/api/auth/google/callback`
9. Copy the client ID and client secret into:
   - `server/.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `SESSION_SECRET`
   - `client/.env`: `VITE_GOOGLE_CLIENT_ID`

Notes:

- In production, update the Google Console redirect URI to your live API domain.
- Google OAuth requires HTTPS in production. Railway, Render, and similar hosts provide this automatically.
- Keep `GOOGLE_CLIENT_SECRET` on the server only. Never expose it in the client bundle.

## Web Push / VAPID Setup

Generate a VAPID keypair once:

```bash
npx web-push generate-vapid-keys
```

Use the generated keys like this:

- `server/.env`: `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`
- `client/.env`: `VITE_WEB_PUSH_PUBLIC_KEY`

Push notifications require HTTPS in production.

## Scripts

From the repo root:

- `npm run dev` — run client and server together
- `npm run build` — build both workspaces
- `npm run preview` — preview the Vite production build

From inside each workspace:

- `client`: `npm run dev`, `npm run build`
- `server`: `npm run dev`, `npm run build`, `npm run start`

## Deployment

### Backend on Railway or Render

1. Create a new Node service pointing to this repo.
2. Set the service root to `server`.
3. Build command:

```bash
npm install && npm run build
```

4. Start command:

```bash
npm run start
```

5. Add all server environment variables.
6. Set `CLIENT_URL` to your deployed frontend URL.
7. Ensure cookies use HTTPS in production.

### Frontend on Vercel

1. Import the repo into Vercel.
2. Set the project root to `client`.
3. Framework preset: `Vite`.
4. Add:
   - `VITE_API_URL=https://your-backend-domain/api`
   - `VITE_SERVER_URL=https://your-backend-domain`
   - `VITE_GOOGLE_CLIENT_ID=your-google-client-id`
   - `VITE_WEB_PUSH_PUBLIC_KEY=...`
5. Deploy.

## PWA Notes

- `client/public/manifest.json` defines `Pulse` as a standalone portrait app
- `vite-plugin-pwa` generates the production service worker bundle
- `client/src/sw.ts` handles app-shell precaching and Web Push notifications
- The UI listens for `beforeinstallprompt` and surfaces an install action when the browser supports it

## API Notes

API routes are documented inline inside `server/src/routes/*.ts`. Each route file includes short comments describing the route purpose and behavior.

## Verification

The current repo passes:

- `server`: `npm run build`
- `client`: `npm run build`

## Deployment Considerations

- Use secure secrets instead of the sample placeholders
- Use HTTPS in production for cookies, service workers, and push notifications
- For cross-origin cookies, ensure frontend/backend domains and `CLIENT_URL`/`COOKIE_DOMAIN` are aligned
- For Google OAuth in production, update both the frontend origin and backend callback URL in Google Cloud Console
- Cloudinary and MongoDB credentials should never be committed
