# Town map and conversation interface

The four-zone page at town.html now includes:
- Top-right collapsible minimap with actual building positions and a live player
  marker. A text alternative describes destinations and relative player position.
- Bottom AI Advisor / Town Chat tabs with independent in-memory drafts and local
  message previews, a 500-character input limit and a 30-message limit per tab.
- Escape/collapse returns focus to the world. Chat and minimap control focus clear
  held movement keys and pause character input. Tab navigation supports arrow keys.
- Original key hints moved into a compact Controls disclosure.

This is frontend-only. No network, AI reply, shared player messaging, identity,
server storage or persistent browser storage is connected. Local messages use
textContent and disappear on reload. Public-channel labeling describes the future
channel while an explicit disconnected/local-preview notice remains visible.

Files: town-ui.mjs, town-ui.css, town.html, explore.mjs, approved.mjs.
The original static/single-route preview remains compatible with its Advisor dialog.

Validation on 2026-11-13:
- JavaScript syntax checks passed.
- Desktop browser observed separate draft retention, local Town Chat submission,
  Escape collapse, no player displacement or E-dialog activation while typing,
  minimap collapse/reopen, and relative-position changes after walking.
- Screenshot: assets/town-chat-map-check.png.
- Terra read-only review prompted keyboard isolation for minimap controls and a
  meaningful map text alternative; both applied before final browser checks.
- No phone testing, backend connection, real multi-user chat or real AI validation.

Proximity prompts in the RPG skin now use the measured `--chat-dock-height`
plus a gap. Mobile prompts sit above the touch pad. This replaces the effective
fixed offsets for both collapsed and expanded chat; all destination prompts
share the rule. Visual verification of the new placement is pending.
