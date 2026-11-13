# Image-backed single-route prototype

Open http://127.0.0.1:4174/explore.html.
The original static approved scene and old Canvas prototype remain separate.

Scope: the public square to the Hackathon maker workshop only. No other three
regions, actual Advisor, opportunity data, React application integration or backend.
Native canvas with no new packages. WASD/arrow movement, follow camera, E proximity
interaction, pointer targets, native dialogs and a route-overview button.
The three large preview action buttons are absent from this route.

## Artwork
- assets/workshop-ground.png: built-in image tool edit of the approved scene,
  removed baked character/UI and introduced a modest extra path bend.
- assets/student-directions.png: earlier four-direction idle source.
- assets/student-walk.png: built-in image tool edit, 3 columns by 4 rows;
  down, left, right, up; contact / idle / opposite contact.
- Provider outputs originated in this chat on 2026-11-13. No paid API calls.
  These are image-model outputs, not verified exact native-pixel assets.
  No third-party game art is incorporated. Team must review provider terms
  and official competition AI-use/disclosure rules before submission.

Frames use alpha-bound detection within each authored cell. Scale is fixed per
direction to the idle height, and horizontal origin follows the head rather than
arm/leg bounds. Gait uses actual travelled distance, stops against walls, and
returns to idle in dialogs or at rest. This is a compact three-pose cycle,
not a polished multi-frame animation. Identity/registration can still need tuning.

## Geometry
1672x941 world; separate authored ground-contact corridor and plaza/landing.
Painted scenery is blocked by limiting walkable ground, not by deriving collision
from color. Some edge mismatch between art and geometry remains possible.
The numerical route traversal check reached Hackathon in 4.72 simulation seconds
at the selected speed and checked a blocked point inside the building.
This timing is a simulation, not a measured user's playthrough.

## Verification
- explore.mjs syntax passed.
- Runtime movement and frame changes observed through browser DOM coordinates.
- Browser evidence: assets/explore-check.png.
- Existing 16 tests cover the older contract/map; not proof of this new map.
- Read-only Terra review found focus restoration override, fixed by removing
  the forced canvas focus on dialog close.
- User reported movement/camera okay before the gait update.
- New E-proximity-to-dialog end-to-end flow, all four animation directions,
  physical mobile controls and integrated application are not fully browser-tested.
- No installation, Git mutations, deployments, external API or real data used.

Motion and camera were kept unchanged during the final gait-only adjustment.
