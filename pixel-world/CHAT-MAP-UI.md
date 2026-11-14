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

- AI Advisor: same-origin local-service connection, optional explicit conditions,
  latest structured result, and opportunity / Find a team actions. The separate
  backend must run on port 4185 with its model mode configured; no model was called
  during integration verification. Failed requests keep drafts; retries are manual.
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
Minimap collapse and Escape explicitly focus the world canvas to release input.
Team Chat polling is serialized and scoped to each chat visit; late polling,
send/history completions and errors cannot update a closed or replaced chat.
Proximity actions use measured --chat-dock-height; phone prompts clear the joystick.
The old Controls disclosure and debug state selectors remain removed. Opportunity
modals are centered, with the outer frame fixed and content scrolling inside.

## Files and evidence

- town-ui.mjs / town-chat.mjs: bottom dock, bounded public polling, map counts.
- team-client.mjs: timeout/session handling and local HTTP client.
- team-panel.mjs / team-service.mjs: shared teams and private Team Chat.
- opportunity-summary.mjs / approved.mjs: collected counts and category integration.

Latest chat/focus follow-up: 88 tests pass, plus three module syntax checks.
Four new mocked tests cover stale Team Chat responses/errors and polling recovery;
minimap keyboard/touch focus still needs manual acceptance.

Prior full local run in the Advisor integration task: 84 tests pass on Node
v24.22.1; seven module syntax checks pass. Service tests use memory/temporary
SQLite; polling and Advisor transport tests use mocked requests.
Rendered Advisor interactions, the running proxy route and real model replies
remain unverified. Restart the frontend server to load the new route.
No browser/phone multi-user check was run. Earlier 2026-11-13 visual checks concerned
the old disconnected chat prototype and do not verify these new shared channels.
The service is loopback-only, not publicly deployed. No moderation workflow,
account recovery or shared player-position service is included.
