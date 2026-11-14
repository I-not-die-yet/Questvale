# Questvale — Current Status and Next Steps

Updated: 2026-11-14 (Hong Kong time).
This replaces the earlier handoff that still described team UI as not integrated.
Read current code and README before editing; multiple agents share this workspace.

## Latest local preparation — 2026-11-14

Tunnel compatibility implemented, NOT exposed: exact HTTPS PUBLIC_ORIGIN, loopback
listener, ignored forwarded headers, Secure/Path=/api session cookie and old
narrow-cookie migration. Advisor authenticates the SQLite guest; no identity/token
forwarded to backend/model. Forwarding now defaults OFF (ADVISOR_PROXY_MAX_CALLS=0).
Positive finite budget requires authorized usage. Limits: guest 5s cooldown,
global 20/minute, concurrency 2 and process lifetime cap. Backend default 10/minute
can still throttle the shared proxy; align it explicitly for an authorized demo.
No schema change. serve.mjs starts a testable create-server.mjs factory; sensitive
server modules, tests/tools, dot-directories and DB files cannot be served.

Clean outputs/Questvale_Delivery_2026-11-14.zip contains frontend and reviewed
Advisor source/tests, no guest/chat DB, env/keys, packages or test screenshots.
Delivery rerun: 99 frontend + 75 backend tests pass (loopback/mocks only), plus
8 syntax checks. No real provider, Tunnel or deployment. Read TUNNEL-PREP.md.
Existing running frontend needs restart. Physical phone, public-origin/session
browser flow and real Advisor remain unverified. Previous sections record earlier
milestones; prefer this update for current defaults.

## 1. Product and source of truth

Questvale is a student opportunity decision/coordination app in a pixel town.
Intended journey: explore → inspect an opportunity and source caveats → assess
recruitment role overlap → find/create a team → communicate → follow official
information. The world supports this outcome; upgrades/quests and automatic
matchmaking are deferred. Product UI is English; explain work to the user in
Traditional Chinese.

Active code:
`/Users/issac/.codex/.chatgpt-projects/g-p-6acf2840370081918e11cb149b63fbf8/work/questvale-playable`

Preview: http://127.0.0.1:4174/rpg.html or /town.html. Both now load shared RPG,
guide, opportunity and entry styles. Use the current `node serve.mjs` with a Node
runtime supporting built-in SQLite; verified runtime v24.22.1. If an old process
is running, restart it rather than assuming updated server routes are active.
This document does not establish whether a particular running process is current.

Private repo: https://github.com/I-not-die-yet/questvale.
Last remote push verified in this chat: `841f4c25306f256bf2bbfb1780e2329a8dabd326`.
Later work is local unless independently confirmed. Recheck remote state before
Git operations. Staging/upload-snapshot folders are not the active project.
Do not edit the original DeepSeek workspace or synced sources/ as a side effect.

## 2. Implemented locally

### World and presentation

Four-zone town/interiors, guide NPC, character/nickname selection, optional skills,
keyboard movement and circular touch joystick. Accepted art includes
assets/town-guide-v3.png and four 1536×1024 interior backgrounds. Preserve movement:
outdoor 390 world px/s, indoor 487.5 room px/s, accepted 70% larger indoor character.
Interior exit restores town position/facing. No shared player-position/room-presence
service is implemented by the chat work.

Desktop/phone now share centered parchment dialogs with inner scrolling. Phone
minimap starts collapsed as Map · total; expanded view hides desktop category-count
buttons/note. Desktop retains 2×2 category shortcuts. Both counts and board Status
reflect collected data, not verified market supply or personal fit. Phone Status
initially collapses; desktop expands it. Retired debug selectors/Controls stay off.

### Local opportunity dataset and honest decision cues

24 copied records at `data/opportunities.json`: Hackathon 5, Business 6, Startup 6,
Research 7. Original file remains unchanged:
`/Users/issac/Documents/deepseek-harness/default-workspace/questvale-data-draft/opportunities.json`.
This copy does not automatically update and is not a live opportunity API/D1 service.

Central/district boards support search, category filters, detail/back, loading,
failure/retry and empty states. Closed/historical, upcoming and unknown remain
distinct from listed-open/closing-soon. Safe source links are information links,
not verified application endpoints. Unknown fee is not free; lastVerifiedAt is a
recorded source claim, not comprehensive verification. Preserve secondary-source,
blocked-page and incomplete-review notes.

Next steps give actionable fee/eligibility/intake/date checks and historical-record
handling. Missing/unsafe URLs produce instructions to read notes, not broken links.
No pass count, confidence score or recommendation verdict added.
Two-record Compare is now implemented on board rows/details, with cross-category
selection within a board visit, Remove/Clear, honest source/unknown fields and
stacked phone layout. Closing the dialog clears selections. No ranking or AI/team
backend change. Latest local suite: 92 passed, 0 failed; responsive rendering and
dialog interactions remain for user manual verification. This work is local only.

### Skills and roles

The six optional self-reported skills appear in character entry and Find a team.
They share the existing local profile; profile-skills.mjs updates the entry snapshot
to prevent stale overwrite. Inline changes refresh role hints without resetting
search, category, opportunity or chat. Skills do not depend on avatar.
Role Coverage compares explicit recruitment roles with self-reported member skills;
official event rules/team-size text remain separate. No eligibility inference.
Find a team now includes Teams looking for your skills above All teams, using exact
overlap within this opportunity's current team list, excluding full teams. Inline
skill changes update it without replacing forms/state. No skills, no matches and
existing membership have explicit states; no invented teams, rankings or verified
gap claims. No backend/API changes. Latest local suite: 95 passed, 0 failed;
rendered interaction is not browser-verified. Comparison (#1) and this team hint
(#3) are local and unpushed.

### Advisor structured decision evidence (#2)

Implemented in the existing external questvale-advisor backend on 2026-11-14:
structured dates/fee/location/uncertainty/partial assessments/source notes now reach
the selector. Models still return IDs only. Server-owned reasons expose recorded
decision facts and source caveats; ordering compares only confirmed same-zone
calendar dates or explicit instants, never overall suitability. Frontend labels
these as Recorded decision evidence. No request schema, eligibility coverage,
provider budgets or team service changes. Skills/live team matching remain in
the team panel, not Advisor reasoning. Restart an old backend process before use.

Original backend file hashes were checked before applying 13 reviewed files;
another agent's concurrent edits would have stopped integration. Exact existing
backend path: /Users/issac/Documents/deepseek-harness/default-workspace/questvale-advisor.
Post-integration tests: 75 backend / 95 frontend passed, mocked provider plus
loopback only. 19 backend syntax checks and changed frontend module check passed.
No real model calls, source-site rechecks, browser tests, push or deployment.
The isolated work/questvale-advisor-review is a test copy, not a second service.
Live model behavior, frontend/proxy/backend browser flow and presentation
source verification still require acceptance; these tests do not prove them.

### Shared teams and private Team Chat — local server implementation

The active team-panel.mjs now uses team-client.mjs and team-service.mjs, not the
fictional team-state.mjs store. Do not rebuild another preview or competing backend.
Implemented: opportunity-specific team lists, create, request/withdraw, captain
accept/reject, member leave, transfer and disband; member-only message read/write.
Capacity and one-team-per-opportunity constraints are checked transactionally.
No fake members/replies/online counts are injected in the active shared flow.
Team lists use explicit refresh controls; chat uses bounded polling and paged
history. Failed sends preserve draft/nonces; successful same-nonce retries dedupe.
Team Chat remains inside its team panel, not a bottom-dock tab.

### Shared Town Chat — local server implementation

The bottom Town Chat uses /api/teams/town/messages for all unexpired server guests,
without requiring team membership. It is separate from private Team Chat. Public
messages persist; author/time/body come from the server. Messages are 500 characters
maximum; public sends are limited to one per 500ms per guest. Pages are at most 50;
display window at most 200. Polling runs every 3 seconds only when expanded, visible
and unobscured; after three failures, manual Reconnect is required. HTTP client
requests time out after 10 seconds. Shared guest initialization is serialized.

AI Advisor now posts through the frontend's same-origin `/api/advisor` proxy to
the separate local backend on port 4185. Optional explicit conditions, structured
results, honest errors/manual retry and opportunity / Find a team navigation are
implemented. Blank conditions remain unknown; skills do not establish eligibility.
Restart the frontend to load the route; the separately configured backend must
also run. No provider was enabled or called in this integration task. See the
active README for cancellation, timeout, privacy and startup limitations.

## 3. Identity, data protection and deployment limits

Guest identity: random token in a seven-day HttpOnly SameSite=Strict cookie; only
a token hash is stored. Nickname/skills do not authorize captain actions. Same
browser/origin shares identity; private windows/profiles can represent another guest.
Cookie loss loses access: no login, cross-device identity or account recovery yet.
Use one hostname consistently.

SQLite persists at `.local/teams.sqlite`, including `town_messages`. `.local/` is
ignored and blocked from static serving. It contains actual local guest/team/chat
data: do not read unrelated records, publish, delete or reset it casually. Stop the
server before making an authorized private backup. No database backup is made by
this documentation update.

The service binds to 127.0.0.1 only, with local-host/origin/client-header checks.
It is not available to presentation attendees on other devices/public links yet.
No hosting/HTTPS/public-origin migration, production deployment, moderation/reporting/
blocking workflow, attachments or direct messaging is complete here. Shared chat is
not proof of production hardening, public accessibility or multiplayer positions.

## 4. Evidence and remaining verification

Rerun in the Advisor integration task on 2026-11-14:
`node --test tests/*.test.mjs` with Node v24.22.1 → **84 passed, 0 failed**.
Seven new/changed modules passed syntax checks. Advisor tests use mocked transport
for explicit inputs, request boundaries, errors, aborts and rate-limit handling.
The running proxy HTTP route, rendered Advisor flow and real provider replies
remain unverified; there were no model calls or browser checks.

Tests include map/contracts, skill synchronization, source safety/data conversion,
summary counts, shared-team permissions/membership, guest separation, database
reopen, Town messages, idempotency and bounded polling. Team tests use memory or
disposable temporary SQLite; Town polling uses mocked transport. They did not open
existing `.local/teams.sqlite` or call external services.

Earlier reports of 55/59/63/67/69/72/77 tests refer to different milestones, not
independent evidence of the current browser UI. Do not repeat them as fresh checks.
No browser/computer-use, physical phone, real multi-user UI acceptance, public load
or live-AI check was performed in this documentation task. The user accepted earlier
visual milestones; that is distinct from full shared-service acceptance.

Next user acceptance flow on the restarted server:
normal window create → private window request → captain refresh/accept → both
exchange Team messages → both inspect Town Chat → reload → member leaves → confirm
private team access is removed. Do not let backend tests substitute for this flow.

## 5. Priorities and coordination

1. User manually verifies current two-guest team/chat UI. Do not silently operate
   the browser; the user has reserved manual testing.
2. Manually verify the connected Advisor flow after restarting the frontend and
   starting the separately configured backend. Real provider calls still require
   a separately authorized bounded check; do not enable them automatically.
   Do not start a second competing service or overwrite the AI agent's files.
3. Verify a small set of actual demo opportunity sources/fees/eligibility/dates.
   Do not claim source verification from timestamps or imported labels alone.
4. Propose how attendees will reach the app and retain identity. Hosting and
   public access require explicit approval and a review of origin/auth assumptions.
5. Rehearse the integrated demo; prepare honest fallback behavior and handoff.

Comparison (at most two opportunities) is implemented locally as described above. No new game systems,
ranking, live-location synchronization or automatic matchmaking is authorized by
this handoff. Ask only for materially unresolved interfaces/ownership, not routine
reversible details already approved.

## 6. File ownership landmarks

- entry.mjs / character-sprites.mjs / profile-skills.mjs / skills.mjs: profile and skills.
- explore.mjs / town-map.mjs / workshop.mjs / joystick.mjs: world/input/interiors.
- approved.mjs / opportunity-board.mjs / opportunity-board.css: dialog/data/UI lifecycle.
- opportunity-data.mjs / opportunity-summary.mjs / data/opportunities.json: copied data adapter/counts.
- team-panel.mjs / team-client.mjs / team-service.mjs / serve.mjs: actual local shared teams/service.
- town-ui.mjs / town-chat.mjs: minimap, bottom dock and public chat.
- team-state.mjs: historical standalone-preview test model only.
- README.md / CHAT-MAP-UI.md / tests/: current setup, limits and checks.

Keep changes surgical. No package installs, art/movement changes, private-service
changes, Git operations, public visibility changes, spending or deployment without
applicable authorization. This documentation refresh authorizes none of those.
