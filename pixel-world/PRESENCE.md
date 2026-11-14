# Outdoor multiplayer preview

## All four interiors — current update, 2026-11-14

Town, Hackathon, Business, Startup and Research now use scene-scoped presence.
All rooms share the same 10-guest connection cap. Each interior validates its own
roomWalkable furniture/bounds; neither movement nor collision rules were changed.
Server snapshots contain only the recipient’s current scene, with client guards
against stale snapshots and cross-scene interpolation. Enter/exit retains the
same connection and the existing local return-position behavior. No chat, schema,
provider, dependency or public-origin change. Earlier outdoor/Hackathon-only
notes below/above describe previous milestones.

113 local tests pass: every room's enter/move/exit and town isolation, plus
different-interior isolation at identical coordinates. Two module syntax checks
pass. The user accepted Hackathon visually; other three interiors still require
manual UI acceptance. No browser test, real model call, public Tunnel or Git push
was performed for this extension. Rollback copies are in
../questvale-before-all-room-presence/.


Node 24 + pinned ws 8.23.0. Local endpoint /api/presence shares outdoor players
only, maximum 10 verified guest connections. One cookie is one guest; use isolated
browsers to test together. Entering indoors/entry or hiding the page leaves outdoor
presence. No indoor synchronization, player collision or position persistence.

The existing guest session is initialized before connecting; Secure Path=/api
cookies and exact Origin checks are reused. Names come from the guest database;
connection IDs are random public display identifiers, not session tokens.
Payload 512 bytes, rate 20/second enforcement, finite/walkable coordinate validation,
speed bounds, bounded backpressure and heartbeat cleanup are enabled. Normal clients
send at most 10 updates/second. This is a visual presence relay, not full anti-cheat.

107 local tests pass; two separate browser guests visibly showed each other’s
movement. Capacity was tested with ten WebSocket clients, not ten physical phones.
Full-room clients receive a message then close, and do not retry automatically.
Network failures retry up to three connection attempts with delay, then reload is
required. No public Tunnel, live model call or Git operation was performed.

Rollback: stop the frontend, compare later changes, restore the six original files
from ../questvale-before-presence/, then restart. Keep the current database; no
schema migration, guest reset or database deletion is required. New presence files
and ws can remain unused; do not uninstall unrelated tools.


## Hackathon interior extension — 2026-11-14

Presence now supports town and Hackathon workshop. Snapshots are filtered on the
server by the receiving player's current scene; client drops stale snapshots from
a previous scene and resets interpolation at transitions. The same authenticated
connection stays active on town/Hackathon transitions, sharing the global 10-guest
cap. Rendering uses the existing indoor camera and actor scale. Interior bounds
and furniture validation use roomWalkable; local movement/collision rules, saved
town position and chat are unchanged. Other three interiors remain unsynchronized
and pause presence. Character selection/page hiding still disconnects presence.

109 local tests passed, including three-client town/Hackathon isolation, enter,
move, exit, stable connection identity and invalid-room coordinates. Syntax checks
passed for three changed modules. Browser/physical-device acceptance of the indoor
rendering is left to the user. No new dependency, schema, AI call, public Tunnel or
Git action. Prior outdoor-only notes describe the previous milestone.
Rollback copies of this step are in ../questvale-before-hackathon-presence/.
