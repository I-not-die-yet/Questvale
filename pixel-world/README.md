# Questvale Pixel World

Local four-zone exploration prototype for Hackathon, Business, Startup and Research.
Built with browser Canvas, HTML and CSS, without a frontend dependency install.

## Run

Use an existing Node installation:

```sh
cd pixel-world
node serve.mjs
```

Open http://127.0.0.1:4174/ or /town.html. Stop with Ctrl+C.
The server binds only to loopback and serves files read-only.

## Controls and interface

- WASD / arrow keys: move; E near an entrance: open its category; Esc: close.
- Top-right collapsible town map shows destinations and player position.
- Bottom AI Advisor / Town Chat tabs support independent drafts and local previews.
- Chat typing and map-control focus pause movement. Messages disappear on reload.
- Category panels contain demonstration placeholders, not real listings.

AI, shared multiplayer messaging, accounts, opportunity data and backend are not
connected. No deployment is included. This is not the team's integrated application.
Physical phone testing and full accessibility acceptance remain incomplete.

## Files

town-map.mjs defines placement, source rectangles, collisions and interaction points.
explore.mjs renders terrain, buildings, the independent character and camera.
town-ui.mjs manages the minimap and local conversation interface.
approved.mjs hosts provisional category selection and placeholder panels.
contract.mjs / contract.d.mts preserve the four-category contract; the host should
own shared filters and recommendation state when integrating the actual application.
route.mjs supplies the shared geometry helper and retains earlier single-route data.

## Checks

```sh
node --test tests/contract.test.mjs tests/town-map.test.mjs
```

17 tests cover the category contract, four route return trips, collisions and speed
normalization. Browser checks observed correct four-category panels, chat draft
retention, local message previews, keyboard isolation and minimap position updates.
These do not establish end-to-end backend functionality.

## Artwork

The four PNG assets were generated in the project conversation with the built-in
image tool, following the user's approved original Questvale references. No
third-party game artwork was incorporated. Ground and buildings remain separate;
the atlas source rectangles and anchors are declared in town-map.mjs. The character
sheet has three poses for each of four directions.

These are image-model outputs, not verified native-grid or commercially cleared
assets. Review applicable provider terms and the competition's AI disclosure rules
before submission. No blanket artwork license is asserted here.
