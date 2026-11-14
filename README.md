# Questvale — local delivery, 2026-11-14

Not deployed or publicly exposed. Use Node 24 with built-in SQLite.
No third-party package installation needed.

Run `node pixel-world/serve.mjs`, then open http://127.0.0.1:4174/rpg.html.
Advisor forwarding defaults disabled. See pixel-world/TUNNEL-PREP.md for startup,
public-origin configuration, finite budgets, session migration and limitations.
The optional backend is included in advisor-service/, without provider keys.
No database or real guest/chat records are included; first startup creates a new one.

Source verification: 103 frontend tests / 75 backend tests passed using mocked
providers and loopback. Public Tunnel, real phones and live provider acceptance
are not verified. Historical browser results concern earlier specific snapshots.
SHA256SUMS.json identifies this delivery's files.
