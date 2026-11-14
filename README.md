# Questvale

Private development snapshot: pixel opportunity discovery, skills-aware team
recruitment and shared local-server Team/Town Chat.

Use Node supporting built-in SQLite (validated with v24.22.1):

```sh
node pixel-world/serve.mjs
```

Open http://127.0.0.1:4174/rpg.html or /town.html. Loopback-only; not publicly deployed.

Read [setup, data protection and limits](pixel-world/README.md),
[chat/map behavior](pixel-world/CHAT-MAP-UI.md), and
[current handoff](docs/Questvale_Current_Status_And_Next_Steps.md).

88 local tests pass. No fresh browser/phone multi-user acceptance is claimed.
Advisor frontend/proxy integration is included; the separate backend must run on port 4185. Real model and browser integration remain unverified. Opportunity source records retain explicit
verification gaps. Private SQLite/guest/chat data and secrets are excluded.
