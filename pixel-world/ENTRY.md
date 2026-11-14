# Entry and character flow

Open `town.html` (or `rpg.html`). First visit: title screen → Start exploring →
choose Boy, Girl, Robot or Mushroom → optional nickname → Enter Questvale.
The world and interiors use the selected eight-direction sheet. The boy uses
the redesigned sheet; previous sprites and comparison page are preserved.

The profile is stored only in browser localStorage under `questvale.profile.v1`.
Returning visits skip entry; Change character reopens selection without resetting
position or room. Back cancels changes. An invalid saved character is ignored;
blocked storage allows playing for the current visit. This is not an account,
multiplayer identity, or shared nickname. No backend requests or packages added.

The title background draws the existing map assets, not the concept image.
CSS entry/exit motion and sprite preview respect reduced motion preferences.
`entry.mjs` manages entry and local persistence; `character-sprites.mjs` loads the
four sheets and validates profiles; `entry.css` styles the scoped overlay.

Validation:
- JavaScript syntax checks passed.
- 16/17 focused Node tests passed. The existing character-motion test hardcodes
  a 250-unit speed; town-map currently uses 390. This change does not alter speed.
- Browser observed first entry, selection of Robot, return to town, persistence
  after reload, and reopening Change character. Selection screenshot saved as
  assets/entry-preview-check.png.
- All four characters walking through all rooms and physical mobile devices
  were not manually verified.

The town and entry now use the approved coarse pixel walk sheets (`*-walk-rough.png`).
They share opaque-band extraction and foot/head registration with the comparison
preview. Robot NW right-step uses a mirrored NE source pose, as in the preview.
Old PNGs remain available; local profile IDs and movement speed are unchanged.


## Fixed background while scrolling (2026-11-14)

The entry overlay now clips its fixed background canvas/shade, while a separate
entry-scroll layer scrolls the settings card. No art or sizing changes. Browser
checks at 1200×650 and 390×650 confirmed background/shade bounds stay fixed at
viewport height when scrolling to the bottom, Back stays visible, and the narrow
view has no horizontal overflow. Mobile emulation was reset afterward. Six
profile/skills tests and entry.mjs syntax passed. Physical phones were not tested.
