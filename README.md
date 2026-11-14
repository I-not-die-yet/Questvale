# Questvale — local delivery, 2026-11-14

Not deployed or publicly exposed. Use Node 24 with built-in SQLite.
One pinned WebSocket dependency is now required. In pixel-world/, run
`pnpm install --frozen-lockfile --ignore-scripts --no-optional` before startup.

Run `node pixel-world/serve.mjs`, then open http://127.0.0.1:4174/rpg.html.
Advisor forwarding defaults disabled. See pixel-world/TUNNEL-PREP.md for startup,
public-origin configuration, finite budgets, session migration and limitations.
The optional backend is included in advisor-service/, without provider keys.
No database or real guest/chat records are included; first startup creates a new one.

Source verification: 113 frontend tests / 75 backend tests passed using mocked
providers and loopback. Public Tunnel, real phones and live provider acceptance
are not verified. Historical browser results concern earlier specific snapshots.
SHA256SUMS.json identifies this delivery's files.

Outdoor multiplayer was added locally; see pixel-world/PRESENCE.md. Hackathon indoor synchronization is included with local transport tests; indoor
rendering and public-network multiplayer acceptance remain pending. No node_modules or guest data included.

All four interior scenes now support isolated presence; 113 local tests passed.
New room visuals remain for manual acceptance; no public exposure.
