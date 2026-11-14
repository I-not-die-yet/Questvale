# Town map and conversations — current local behavior

Updated: 2026-11-14. See README.md for startup and data-protection details.

## Map

Both town.html and rpg.html use the shared pixel skin. The minimap shows terrain,
buildings and the local player marker; it is not a multiplayer-presence display.
Desktop shows collected totals and 2×2 district shortcuts. Phone starts collapsed
as Map · total; expanded terrain/player legend stays readable while count buttons
and their note are hidden. The frame is thinner on phone.

Counts come from the local opportunity JSON, include all recorded statuses and
refresh after board data loads. They are collected inventory, not market coverage,
verified live availability or personalized fit. Board Status summarizes current
category/search results and distinguishes historical/closed from unknown.

## Bottom dock

- AI Advisor: local input preview; no model reply or AI network connection.
- Town Chat: shared server channel for guests, not restricted to a team. Messages
  persist in SQLite and only server-returned messages are displayed. Labelled
  public-to-guests; do not enter private information.
- Team Chat: separate member-authorized conversation inside the Find a team panel.
  It is not a third bottom-dock tab. Team membership does not grant authority over
  other teams, and Town messages do not share the private team message table.

Town Chat polls at 3 seconds only while expanded/visible/unobscured, stops on
closure or after three failures, and offers manual reconnect. Initial/earlier API
pages are at most 50 messages; rendered Town history is capped at 200. Input is
limited to 500 characters. Nonces make retries idempotent; failures keep the draft.
Guest initialization is shared between Team/Town flows to avoid competing cookies.
No online-user counts or generated replies are shown.

## Interaction and presentation

Chat/minimap focus clears movement. Escape/collapse returns focus to the world.
Proximity actions use measured --chat-dock-height; phone prompts clear the joystick.
The old Controls disclosure and debug state selectors remain removed. Opportunity
modals are centered, with the outer frame fixed and content scrolling inside.

## Files and evidence

- town-ui.mjs / town-chat.mjs: bottom dock, bounded public polling, map counts.
- team-client.mjs: timeout/session handling and local HTTP client.
- team-panel.mjs / team-service.mjs: shared teams and private Team Chat.
- opportunity-summary.mjs / approved.mjs: collected counts and category integration.

Latest full local run in this documentation task: 77 tests pass on Node v24.22.1.
Service tests use memory/temporary SQLite; polling tests use mocked requests.
No browser/phone multi-user check was run. Earlier 2026-11-13 visual checks concerned
the old disconnected chat prototype and do not verify these new shared channels.
The service is loopback-only, not publicly deployed. No moderation workflow,
account recovery or shared player-position service is included.
