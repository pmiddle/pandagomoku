# Panda Gomoku — three ways to play

A lightweight vanilla JavaScript game with original panda illustrations. No accounts, chat, paid AI, inference API, or frontend secrets.

## Run locally

Requires Node.js 22.13+ (24 recommended). No dependency installation is needed.

    npm run dev

Open http://127.0.0.1:5173. The development server provides the same room API as production using a persistent SQLite file at `.local/rooms.sqlite`. To test two player identities on this computer, host on `127.0.0.1:5173` and join on `localhost:5173` with the same room code. These are independent browser storage origins, connected to the same server. Two ordinary tabs on the same origin share the same saved player identity.

    npm test
    npm run build

The build emits a self-contained Cloudflare Worker at `dist/server/index.js`, with the frontend embedded. `.openai/hosting.json` binds managed D1 as `DB`. SQL migrations live in `drizzle/` and are packaged for Sites to apply on deployment. The local SQLite adapter is excluded from the hosted Worker.

## Modes

- **With a Friend:** create or join a six-character room. Copy its code or an invite such as `/play?room=ABC234`. The guest joins automatically from the link. The room begins when both players have arrived.
- **Pass & Play:** two players share a device. No room requests or backend are required during play.
- **Panda Bot:** Easy, Medium or Hard, calculated entirely in a module Web Worker. You play Ink; Maple is the bot. Easy mixes useful moves with random choices. Medium takes wins, blocks immediate losses and scores open and split patterns. Hard adds candidate pruning and iterative-depth negamax with alpha-beta pruning, up to three plies under a roughly 450 ms search budget. Startup/scheduling adds some response time. This is a modest game AI, not a tournament-strength engine.

All modes use `public/engine.js`. Five or more in a row wins. On touch screens, tap to preview and tap the same place to confirm. Arrow keys navigate and Enter/Space places a piece. Local turn cards clearly alternate. Reduced-motion preferences are respected.

## Room synchronization and recovery

The browser polls about every 1.1 seconds while visible, backing off to 5 seconds while hidden and up to 8 seconds after errors. This is near-real-time HTTP synchronization, not WebSocket push. The transport is isolated in `public/online.js` so it can be replaced without changing the rules or interface.

The server validates room membership, turn, round, move count, bounds, occupied intersections and finished games. Clients submit one move, never an entire board. D1 conditional updates on a monotonically increasing revision prevent lost updates and competing guest claims. Random action IDs make retried moves idempotent. Revision checks prevent older responses from overwriting newer client state.

Random 256-bit player tokens stay in browser storage and travel over HTTPS in an Authorization header. Only their SHA-256 hashes are stored server-side; neither player receives the other's token/hash. Room codes deliberately omit ambiguous I/O/0/1 characters. Share codes only with your intended friend. The first holder of an unclaimed code can join, as with other account-free invitation rooms.

Presence is refreshed every 10 seconds. After 25 seconds without a heartbeat a panda appears away and play pauses; the board and both seats remain saved. A refresh or connection loss rejoins the same seat using the token. Rooms expire after 24 hours without activity. Explicit Leave closes the room for both players. Seat recovery requires the same browser storage; clearing that storage loses access to that seat.

Rematches require both players to agree after a finished game and alternate the starting player. Only the server can reset an online game; there is no unilateral online restart. No matchmaking queue is implemented. A future queue can assign participants through the existing room service without changing the game engine.

## Offline behavior

Pass & Play works offline after the page assets have loaded. A service worker precaches local game assets, including the bot, so local modes can also be reopened offline once caching has completed. Online rooms always require the server and are never cached. The typeface uses local fallbacks if Google Fonts is unavailable. Updating the build changes the service-worker cache version; close existing tabs and reopen to activate an update. Local development disables offline caching and automatically unregisters previous local service workers so changes remain visible. Offline reload caching is enabled on the hosted site; on localhost, a loaded Pass & Play round works offline but an offline page reload is not supported.

## Architecture / files

- `public/engine.js` — shared legal moves, board, wins, draws and threats.
- `public/app.js` — mode selection, board interface, dialogs and mode orchestration.
- `public/bot.js`, `bot-worker.js` — local heuristics/search and worker isolation.
- `public/online.js` — browser identity, reconnect/backoff, room transport and state ordering.
- `src/rooms.js` — authoritative room transitions and rematch rules.
- `src/store.js` — D1 prepared statements and atomic compare-and-set persistence.
- `src/api.js` — authenticated room endpoints, request validation and create/join rate limits.
- `src/local-db.js`, `server.mjs` — local-only persistent SQLite development adapter/server.
- `scripts/build.mjs` — embeds frontend assets and the shared engine/API in a portable Worker artifact.
- `drizzle/` — schema-only migrations for managed room storage.
- `public/journal.js`, `journal.css` — expandable panda articles, official source links, and configurable photograph paths/captions.
- `public/analytics.js` — optional analytics hooks.
- `tests/` — engine, bot, interface wiring and database-backed room tests.

## Hosting and costs

The frontend can still be hosted as static files from `public/`. Account-free online rooms additionally require the Worker API and D1 database; GitHub Pages alone cannot host that API. The bundled frontend uses same-origin `/api/rooms` routes and `/play` invite navigation. The development server and generated Worker support that route directly. A separate static host needs SPA navigation fallback and a reverse proxy for `/api/rooms`, or an adapted API base URL/CORS policy.

Cloudflare is chosen to reuse Sites managed hosting/storage rather than add an unrelated account/service. Sites provisions the declared D1 binding and applies migrations through its deployment workflow. Direct Cloudflare Free allowances currently include 100,000 Worker requests/day, 5 million D1 rows read/day, 100,000 rows written/day and 5 GB storage (per-account restrictions also apply). These direct Cloudflare quotas do not guarantee Sites hosting terms; check the host's current plan. At roughly two polls/second per active room, 100,000 requests corresponds to approximately 14 room-hours/day before other traffic. Polling is appropriate for a small audience; consider push transport if it becomes popular. No paid plan is automatically enabled by this code.

Supabase was considered as a managed realtime alternative. It offers 2 million free realtime messages/month, but would add a separate project, authentication/RLS/RPC configuration, and free projects may pause after seven days of low activity. The chosen D1 design keeps rules in shared JavaScript rather than duplicating them in SQL policies.

Official references:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages
- https://supabase.com/docs/guides/platform/free-project-pausing

A Site must be publicly accessible before friends outside its allowed audience can join. Publication and hosted two-device verification depend on the hosting tools completing; local testing does not prove a production deployment.

## Remaining design feedback

1. Is the one-second sync cadence comfortable for casual play?
2. Are Easy/Medium/Hard spaced appropriately for your audience?
3. Is tap-to-preview reassuring on your phone, or should it be optional?
4. Which panda photos and names should appear first?

QR invitation codes and random matchmaking are intentionally deferred; code and link invitations are implemented.


## Panda journal

Beyond the Board now contains three expandable articles: Bao Li, Qing Bao, and Panda 101. Edit `public/journal.js` to update article text, source links, image paths, image descriptions and captions. Photos remain labeled placeholders until the owner supplies her own images. The creator credit links to lovelyPanda on Instagram. Panda biographies and facts were checked against the linked Smithsonian pages on October 25, 2026.

## Instagram reels

Bao Li and Qing Bao each have two selectable Instagram Reels embedded above their journal article. Configure the reel IDs and captions in `public/journal.js`. Only the selected reel loads, and the frames are lazy-loaded when near the viewport. Each includes a direct Instagram link. The reels require an internet connection and Instagram must allow the post to be embedded; the game and article text remain independent of Instagram. No video files are copied or hosted by this project.

## Compact journal layout

Bao Li and Qing Bao stay in two equal columns at all screen widths. Their biographies precede two video buttons under Insights of Bao Li / Qing Bao. No Instagram iframe is created until a selection is clicked. The selected reel opens in one compact shared panel directly below the pair; closing it removes the iframe. Panda 101 spans the following full row without images and includes habitat protection, animal welfare, visitor tips and links to CWCA official information, the Chengdu Panda Breeding Research Foundation, and Smithsonian conservation resources. The Instagram creator credit is in the footer.
