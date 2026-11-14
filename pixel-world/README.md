# Questvale — local development MVP

Updated: 2026-11-14 (Hong Kong time).

Questvale is a student opportunity discovery and coordination app presented as a
pixel town. This is the current local implementation, not a production-readiness
or public-deployment claim. Older prototype descriptions are superseded below.

## Run

Use Node with built-in `node:sqlite`; the verified runtime is v24.22.1.
No package installation is required for the active frontend/team server.

```sh
node serve.mjs
```

Open http://127.0.0.1:4174/rpg.html or /town.html. Both load the shared RPG skin,
entry controls and noticeboard styles. Stop the server with Ctrl+C.

The server binds to 127.0.0.1 only. Presentation attendees cannot access this
through a public link or their own phones yet. Hosting, HTTPS, permitted origins
and deployment require a separate integration decision. Use one hostname
consistently: localhost and 127.0.0.1 have different browser identities.

If frontend files were updated while an older server was still running, stop and
restart it to load the current service routes. Do not start another server on the
same port, delete the database or reset guest cookies as a routine debugging step.

## Current functionality

- Character/nickname selection with six optional self-reported skills, saved in the
  existing local browser profile. Skills can also be edited in Find a team; entry's
  saved profile snapshot refreshes so it cannot overwrite newer inline changes.
- Four-zone town, guide NPC, minimap, collision, keyboard movement and circular
  touch joystick. Four separate interiors restore the outside position on exit.
- Central and district noticeboards load the copied 24-record opportunity draft.
  Search, category filters, detail/back, loading/error/retry and empty states exist.
- Find a team actions are visible on list rows and near the detail title. Phone
  lists show the approved icon in a 48px target; desktop also shows the text.
- Shared teams, applications, captain decisions and member-only Team Chat use the
  local server and SQLite. These are no longer fictional local-array actions.
- The bottom Town Chat is shared by all authenticated guests on the local server.
  AI Advisor remains a disconnected local-input preview in this workspace.

Product UI copy is English. No skill-match score or formal eligibility judgment
is produced. Automatic matchmaking, upgrades and quests are deferred.

## World and phone layout

WASD/arrows move; E interacts; Escape closes panels. Interiors share the accepted
character scale and use room-specific furniture collision. Outdoor speed is 390
world pixels/second; indoor speed is 487.5 room pixels/second. Preserve approved art,
movement and camera unless the user requests changes.

Phone minimap starts collapsed as Map · total. Expanding shows the map and player
legend, with a thinner frame; desktop category-count buttons and explanation are
hidden on phone. Desktop retains the 2×2 district count shortcuts. Counts describe
collected records across all statuses, not all available market opportunities.
Board Status is initially collapsed on phone and expanded on desktop, and follows
current search/category results. Closed/historical and unknown remain separate.
Centered dialogs keep their frame/close control fixed while content scrolls.

## Opportunity data and trust

`data/opportunities.json` is a copied local draft, not a live database/API. Original:
`/Users/issac/Documents/deepseek-harness/default-workspace/questvale-data-draft/opportunities.json`.
The original remains unchanged; edits there do not automatically update the copy.

There are 24 records: Hackathon 5, Business 6, Startup 6, Research 7. Source-draft
statuses are labelled distinctly: listed-open, closing-soon, upcoming,
closed/historical and unknown. They are not fresh availability checks.

`opportunity-data.mjs` adapts nested fields without changing the source JSON schema.
Details preserve unknown fees, raw eligibility, timezone, fee notes/additional
charges, recorded check time and incomplete/secondary-source notes. `lastVerifiedAt`
is a recorded source claim, not proof that every requirement was verified.

Next steps turn uncertainty into actions: inspect recorded requirements, confirm
intake, check fees/dates or read historical information. Only safe HTTP(S) URLs
without embedded credentials are linked; missing sources direct users to notes.
Information links are not advertised as verified application endpoints.
Role Coverage shows self-reported skills against explicit recruitment roles; it
never establishes eligibility. No comparison tray, confidence score or pass count.

## Shared teams, identity and private Team Chat

`serve.mjs` routes `/api/teams` separately from opportunity data and AI.
Guest identity is a random token in a seven-day HttpOnly, SameSite=Strict cookie;
only its hash is stored server-side. Nickname/skills are display fields, not proof
of captain authority. Same-origin tabs share a guest; private profiles/windows
normally provide another guest. Cookie loss loses access: no cross-device login,
account registration or recovery is implemented.

Teams are tied to opportunity IDs. A guest can belong to one team per opportunity.
Users create teams, request/withdraw, and members leave. Only captains accept/reject,
transfer captainship or disband. Capacity/membership changes are transactional.
Acceptance clears competing requests for that opportunity. Captains must transfer
before leaving or explicitly disband; disband removes team requests/messages.
Only members may read/write that team's chat; approval or membership is required.
Successful membership is not an event eligibility verdict.

Lists/requests update with Refresh teams / Refresh team. Team Chat polls every
3 seconds while active, with up to 50 messages per API page and earlier-history
loading. Polling stops on close and after three consecutive failures until manual
reconnect. Messages are limited to 500 characters; nonce-based retries are
idempotent and server rate limits apply. Only server-returned messages are shown;
no automatic teammate replies or fake online presence.

The former `team-state.mjs` is retained only for standalone-preview tests. The
active `team-panel.mjs` uses `team-client.mjs` and `team-service.mjs`.

## Shared Town Chat

The bottom Town Chat uses `/api/teams/town/messages`. Any unexpired guest on this
server can read/post without team membership. It has separate server storage and
authorization from private Team Chat. Town messages must not be treated as private.

The browser polls every 3 seconds only when Town Chat is expanded, visible and
unobscured by entry/guide/modal UI. Switching to Advisor, closing or hiding stops
polling. After three failures, Reconnect is required. Requests time out after 10
seconds. History is paged at 50 messages, with a display window of at most 200.
Same-nonce retries are idempotent; new sends are limited to one per 500ms per guest.
Failed sends retain drafts/nonces. Server author names/times render as text.
Concurrent Team/Town session initialization is serialized in the browser.

Town/Advisor drafts remain separate. Advisor does not send to an AI model. Public
chat has no moderation, reporting/blocking, attachments or direct messages yet.
This is not a hardened production public-chat service.

## Protect local data

SQLite persists at `.local/teams.sqlite`; public messages use `town_messages` in
that same private database. `.local/` is ignored by Git and blocked from static
serving. Do not publish, inspect unrelated user records, delete or reset it without
authorized scope. Stop the server before making a private database backup.

Mutations use JSON, same-origin/client-header checks and server-side guest/captain/
membership checks. Public Internet hosting needs a separate security review; this
local design is not automatically deployment-ready.

## Verification

Latest rerun in this documentation task on 2026-11-14:

```sh
node --test tests/*.test.mjs
```

Node v24.22.1: **77 passed, 0 failed**. Tests cover geometry/category contracts,
profiles/skills synchronization, data adaptation/safe links, count summaries,
teams/authorization, capacity conflicts, database reopen, shared Town messages,
idempotent sends and bounded polling. Team-service tests use in-memory or disposable
temporary databases; Town polling tests use mocked transport. Existing private
`.local/teams.sqlite` was not opened by this test run. No external service calls,
production changes or browser/computer-use checks were performed.

Prior notes reported 69 tests for the team milestone and 77 for the Town milestone.
Those are historical reports, not separate browser acceptance evidence. Earlier
visual-only prototypes and their smaller test counts are superseded.

Still unverified: current two-browser UI acceptance, real phone interaction,
public deployment/load, and live AI integration. Suggested user check:
normal window create → private window request → captain refresh/accept → exchange
Team messages → verify Town Chat across both → reload → leave and confirm private
chat access is denied. Do this against the current restarted local server.

## Coordination and remaining work

AI is being developed in a separate chat/environment; its latest state is not
established here. Agree shared opportunity IDs, Advisor output and file ownership
before integration. Shared positions/room-presence are not implemented by chat.
Do not create another competing team/chat backend. Next: manual multi-guest UI
acceptance, AI integration contract, source-checking demo opportunities, then a
separately authorized deployment plan. No automatic push/deployment is implied.
