# Questvale exploration prototype

## All opportunities UI preview

In `rpg.html`, the central public noticeboard opens a searchable All opportunities
panel. Five category buttons filter the fictional fixtures; clicking a title shows
its details. Back preserves the current search and category; Escape closes the
native dialog. Movement pauses while it is open through the existing dialog check.
The four interior noticeboards use the same panel, initially filtered to their
category (Hackathon, Business, Startup or Research). Each supports the same search,
category switching, detail/back and empty state. Entering UI is unchanged; closing
the panel keeps the player inside the current room. Standard non-RPG previews
retain the original category placeholder panels.

`opportunity-board.mjs` renders the panel; `opportunity-preview.mjs` holds isolated
fictional fixtures and filtering. `mountOpportunityBoard(content, {items, initialCategory})` accepts
adapted rows for a future agreed backend contract. No backend schema or request
is introduced. Current fixtures have no source/application URLs, uncertain facts
read Not confirmed, and the application button is disabled. The demo disclosure
remains visible in list and detail views.

Validation: 32 Node tests passed including 3 search/filter checks; changed modules
passed syntax checks. No browser/computer-use verification was performed. Manually
check search → category → detail → back → no results → clear → Escape.

## Noticeboard data-state preview

The Local state preview selector has been removed after manual review.
Loading, failure/retry and empty-data rendering remain available through the state
API below. No network requests occur. Loading disables search/category controls;
failure retains the query/category. Empty data is distinct from an empty search.

`mountOpportunityBoard(content, {items, initialCategory, status, onRetry})` returns
`{setState}`. The owner can call `setState({status: 'loading'|'error'|'ready', items?})`;
use ready with an empty array for empty data. A custom retry callback is invoked
once per click after entering loading; the owner must deliver success/error through
setState. There is no automatic retry, request or live-connection claim. The demo
labels and disabled application action remain until a separate live-data integration.
The visible test controls are removed; state transitions must be supplied by the
integration owner. No backend connection or browser verification is claimed.

## Current four-zone RPG interior preview

Open http://127.0.0.1:4174/rpg.html. Approach any building and press E
(or click its label) to enter its interior:

- Hackathon: Workshop (`assets/workshop-interior.png`)
- Business: Exchange Hall (`assets/business-interior.png`)
- Startup: Launch Studio (`assets/startup-interior.png`)
- Research: Observatory (`assets/research-interior.png`)

WASD / arrows move inside; each room has a separate furniture collision layout.
Walk north to the noticeboard and press E to open that room's category placeholder
panel. Escape closes the panel. At the entrance mat, press E to return to the exact
saved town position and facing. Chat drafts remain in the existing dock; the town
minimap and town labels are hidden indoors. The standard `town.html` retains its
category panels without interiors.

Outdoor speed remains 390 world pixels per second; indoor speed remains 487.5 room
pixels per second. All interiors retain the accepted 70% larger character rendering.
`workshop.mjs` owns room configurations, geometry, movement and return snapshots;
`explore.mjs` integrates scene switching and the existing character sprites.
No live opportunity cards, AI, backend, upgrades or new dependencies were added.

Validation: 29 Node tests passed (17 contract/town, 5 workshop and 7 multi-room
checks); changed JavaScript modules passed syntax checks. This covers asset sizes,
central-aisle walking in each room, furniture/wall blocking and separate return
snapshots. No browser/computer-use testing was performed for this addition, at the
user's request. Manual check for each building: enter → noticeboard → E → Esc →
entrance mat → E. Final visual alignment and UI integration remain for manual review.

## Earlier prototype notes (historical)

Isolated local prototype; the original DeepSeek pixel-world folder is unchanged.
No dependencies installed, Git mutations, deployment, API calls or backend integration.

Run with an existing Node installation: `node serve.mjs`.
Open http://127.0.0.1:4174. Stop the server with Ctrl+C.
The server binds only to loopback and serves files read-only.

WASD / arrow keys move the player. The camera follows. Walk to a door and press E;
Escape closes its panel. Places provides direct keyboard-accessible destinations.
The AI Advisor panel is a non-networked input preview; it does not analyze anything.
Category panels contain no actual opportunity listings. Selection remains controlled
by the host through the original category contract. The optional React adapter is
retained, but integration into the team's app is not performed.

All artwork is original code-drawn Canvas pixel art, not generated production assets.
Map size is 2560x1920 logical pixels. Rendering uses integer scaling and disables
smoothing. Geometry blocks buildings, the central board and world boundaries;
decorative scenery does not yet have collision. The approved image is a direction
reference, not a claim of matching final art quality.

Verification on 2026-11-13:
- 16 Node tests passed (10 contract, 6 movement/map tests).
- Actual browser walking to the Hackathon doorway and E prompt observed.
- AI text input left the player coordinates unchanged.
- Two static-review fixes applied: Places panel returns focus to its visible
  toggle; pointer movement controls are excluded from keyboard tab order.
- JavaScript syntax check passed after those fixes.
- The final two fixes have not been rechecked in the browser.
- E-open/Esc-return category flow is not yet verified end-to-end in the browser.
- React lifecycle, integrated opportunity filtering, mobile touch behavior and
  full accessibility review are not verified.

Work stopped at the user's request after the two keyboard fixes. No tasks,
levels, interiors, game engine installation or real AI service were added.
