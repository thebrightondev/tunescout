# Tunescout

>Tunescout is a Next.js 15 application that combines shadcn/ui with NextAuth.js to let listeners sign in with Spotify and explore personalized music insights.

## Features

- ✨ Modern App Router architecture (React Server Components + Suspense)
- 🎨 shadcn/ui primitives styled with Tailwind CSS and lucide-react icons
- 🔐 NextAuth.js 5 with Spotify OAuth including automatic token refresh
- 📊 Auth-protected dashboard that surfaces access/refresh tokens for Spotify Web API calls
- 🎯 Dashboard recommendation preview powered by TuneHub ↔ MusicEngine when the backend stack is running
- 🧰 pnpm + TypeScript + ESLint + Turbopack for a fast DX
- 🩺 `/api/health` endpoint for uptime checks and integration testing anchors

## Prerequisites

- macOS or Linux shell with [nvm](https://github.com/nvm-sh/nvm) installed (`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`)
- Node.js LTS (install after sourcing nvm: `nvm install --lts`)
- pnpm (enabled via `corepack enable` once Node is available)

> ℹ️ If you encounter pnpm warnings about ignored build scripts (`pnpm approve-builds`), run the command once to whitelist required binaries such as `sharp`.

## Quick start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Generate values and paste them into `.env.local`:

   | Variable | Description |
   | --- | --- |
   | `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate a secret for signing JWTs. |
   | `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Provided by your Spotify app. |
   | `NEXTAUTH_URL` | Use `https://tunescout.local.com:3000` so Spotify callbacks match your HTTPS origin. |
   | `AUTH_REDIRECT_PROXY_URL` | Keep aligned with the origin you browse, e.g. `https://tunescout.local.com:3000`. |
   | `TUNEHUB_API_URL` | Base URL for the TuneHub backend (defaults to `http://tunescout.local.com:8080`). |

   > Legacy projects may still export `TUNESCOUT_API_URL`; the app will read it as a fallback during the rename.

3. **Register a Spotify application**

   - Visit the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
   - Create a new app and copy the client ID/secret into `.env.local`.
   - Add this redirect URI under **Settings → Redirect URIs** (the hostname must match your HTTPS origin exactly):

      ```text
      https://tunescout.local.com:3000/api/auth/callback/spotify
      ```

4. **Start the development server (HTTPS only)**

   1. Map the custom host to loopback by appending this line to `/etc/hosts` (requires sudo):

   ```text
      127.0.0.1 tunescout.local.com
      ```

   1. Install [mkcert](https://github.com/FiloSottile/mkcert) if you don’t have it yet:

      ```bash
      brew install mkcert nss
      mkcert -install
      ```

   1. Create certificates once for the custom host (stored in `.certs`):

      ```bash
      mkdir -p .certs
      mkcert -key-file .certs/tunescout-local.com-key.pem -cert-file .certs/tunescout-local.com.pem tunescout.local.com 127.0.0.1 ::1
      ```

   1. Launch the HTTPS dev server (explicitly bound to `tunescout.local.com` on port 3000):

      ```bash
      pnpm dev
      ```

      Visit [https://tunescout.local.com:3000](https://tunescout.local.com:3000). Because the site and Spotify callback both use the same HTTPS origin, no proxy URL juggling is required.

## Project structure

```text
src/
├─ app/
│  ├─ page.tsx           # Landing page using shadcn/ui components
│  ├─ dashboard/         # Auth-protected dashboard
│  └─ api/auth/[...nextauth]/route.ts # NextAuth handlers
├─ components/
│  ├─ auth/              # Client auth helpers & buttons
│  ├─ layout/            # Site chrome (header)
│  └─ ui/                # shadcn/ui primitives
├─ lib/utils.ts          # Tailwind cn helper
└─ types/next-auth.d.ts  # Type augmentation for session/JWT
```

### Related repositories

This frontend now lives alongside two sibling repositories. Clone them into the same parent directory (or add them as git submodules) so local Podman/docker-compose workflows can reference all services from predictable paths:

| Repository | Path (recommended) | Description |
| --- | --- | --- |
| `tunehub` | `../tunehub` | Spring Boot backend that persists Spotify data and proxies MusicEngine. |
| `music-engine` | `../music-engine` | FastAPI + ML service for training/serving personalized recommendations. |

If you prefer nested checkouts, the frontend repo ignores `tunehub/` and `music-engine/` directories so each project can maintain its own git history inside the same VS Code workspace. Just remember to push commits from within each repository individually.

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the HTTPS Next.js dev server with Turbopack using local certificates. |
| `pnpm lint` | Run ESLint across the project. |
| `pnpm build` | Create an optimized production build. |
| `pnpm start` | Start the production server (after building). |
| `pnpm start:https` | Start the production server behind HTTPS using the certificates in `.certs`. |
| `pnpm test:unit` | Execute fast unit tests against utilities and components with Vitest. |
| `pnpm test:integration` | Validate API routes and server logic with higher fidelity tests. |
| `pnpm test:e2e` | Launch Playwright to exercise critical user journeys in a real browser. |
| `pnpm test:all` | Run the entire testing pyramid (unit → integration → e2e). |

## Run the full stack e2e

Follow these steps to boot the entire TuneScout experience (Next.js frontend + TuneHub + MusicEngine + PostgreSQL):

1. **Install container tooling (first-run only)**

   ```bash
   brew install podman podman-compose
   podman machine init --now
   ```

   > Podman runs inside a managed VM on macOS. The script automatically prefers `podman-compose` when it is available; otherwise it falls back to `podman compose`.

2. **Start the full stack (frontend + services)**

   ```bash
   ./scripts/dev-up.sh
   ```

   The script builds images, mounts the TLS material from `./.certs`, applies Flyway migrations via TuneHub, and launches everything in detached mode. The Next.js container terminates HTTPS directly, so ensure your `/etc/hosts` contains `127.0.0.1 tunescout.local.com` and that the certificates in `.certs` match that hostname.

   > During the container build we set `NEXT_SKIP_BUILD_CHECKS=true` so Next.js skips linting and TypeScript validation inside the image. Run `pnpm lint` and `pnpm test` on the host (or in CI) to keep code quality gates in place.

   Once the command finishes you can validate each service:

   ```bash
      curl http://tunescout.local.com:8080/actuator/health
      curl http://tunescout.local.com:8000/health
   curl -k --resolve tunescout.local.com:3000:127.0.0.1 https://tunescout.local.com:3000/api/health
   ```

3. **Develop outside containers (optional)**

   If you prefer to run the Next.js dev server directly on the host you can still use the pnpm scripts:

   ```bash
   pnpm dev
   ```

   Visit [https://tunescout.local.com:3000](https://tunescout.local.com:3000). The dashboard will proxy API traffic to TuneHub automatically as long as `TUNEHUB_API_URL` in `.env.local` points to `http://tunescout.local.com:8080`.

4. **(Optional) Run smoke tests**

   ```bash
   pnpm test              # Frontend unit + integration
   brew install maven     # One-time setup if Maven isn't installed
   mvn -f tunehub/pom.xml clean verify
   ./music-engine/.venv/bin/python -m pytest
   ```

5. **Stop the stack**

   When you are finished, tear everything down to free resources:

   ```bash
   ./scripts/dev-down.sh
   ```

   This stops the containers and removes the transient network/volume. If you need to inspect logs before shutting down, run `podman logs -f tunescout_tunehub_1` (or the other service names) while the stack is running.

## Testing pyramid

1. **Unit tests** – Run `pnpm test:unit` for fast feedback on pure functions and React components. These use Vitest + Testing Library.
2. **Integration tests** – Run `pnpm test:integration` to execute API route logic end-to-end without mocking Next.js primitives.
3. **End-to-end tests** – Run `pnpm test:e2e` to start a temporary dev server and validate the primary onboarding journey in Chromium via Playwright.

> 💡 The first Playwright execution downloads browsers. If prompted, run `pnpm exec playwright install` once.

## OAuth scopes

Tunescout requests the following Spotify scopes to personalize recommendations from a listeners aggregated history:

- `user-read-email`  access the users email for optional notifications or linking to external services.
- `user-read-private`  read country and other profile details to localize concert suggestions.
- `user-top-read`  pull top artists/tracks over various time ranges.
- `user-read-recently-played`  examine the most recent listening activity.
- `user-read-playback-state`  inspect the active device and playback context.
- `user-read-currently-playing`  show the track thats playing right now.
- `user-read-playback-position`  resume podcasts/audiobooks in recommendations.
- `user-library-read`  learn from the users saved tracks, albums, and shows.
- `playlist-read-private`  read private playlists to enrich recommendations.
- `playlist-read-collaborative`  include collaborative playlists in the signal set.
- `user-follow-read`  prioritize artists the listener already follows.

Adjust the `scopes` array in `src/auth.ts` if your product needs a different balance of permissions.

## Deploying

1. Provide the same environment variables in your hosting platform.
2. Ensure `NEXTAUTH_URL` matches the deployed domain and add the corresponding redirect URI to your Spotify app.
3. Run `pnpm build` followed by `pnpm start` (or use your platform’s build command).

## Troubleshooting

- **Token refresh errors** – double-check the Spotify client credentials and verify that the refresh token is still valid in your Spotify dashboard.
- **Missing styles** – confirm `tailwind.config.ts` and `postcss.config.mjs` references are intact. Restart the dev server after installing new shadcn components.
- **ESLint or TypeScript issues** – run `pnpm lint` for detailed diagnostics and ensure you are using the Node.js version specified via nvm.

Happy hacking! 🎧
