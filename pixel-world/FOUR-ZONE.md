# Four-zone local prototype

Open http://127.0.0.1:4174/town.html. Previous single-route and static versions
remain at explore.html and approved.html.

Uses the accepted generated ground, isolated Hackathon and three-building atlas
copied into assets/. Original source PNGs are unmodified; source rectangles are
drawn at runtime. No new image generation during this integration.
town-map.mjs owns placement, source crops, anchors, routes, walkable ground and
interaction radii. World is 3072x2048; player speed, gait and 12% zoom reduction
are retained. Short runtime-drawn southern connectors avoid buildings facing
away from their approach. Some painted road stubs remain as scenery.

town.html selects the four-zone configuration in shared explore.mjs.
approved.mjs now dispatches each valid category to its matching placeholder panel.
AI and opportunity listings remain disconnected. No claims of app integration.

Verification on 2026-11-13:
- 17 Node tests passed: existing contract plus new town geometry, return routes,
  building/board collision, normalized diagonals and bounded frame time.
- Simulated walks reached each entrance, approximately 5-6 seconds one-way.
- Browser buttons opened all four correct headings and category state; Escape
  returned focus. Desktop full-map composition inspected and captured at
  assets/town-check.png.
- Terra read-only review found focus restoration, Startup naming and screen
  reader instructions issues; those were corrected.
- Not manually walked to all four doors in the browser. Geometry/art boundary
  precision, full accessibility, recommendations and host-app integration remain
  unverified. Physical phone testing deferred at the user's request.

No packages, Git operations, production deployment, real opportunity data or
paid APIs were used. Source project outside this workspace is unchanged.

Full-town toggle and decorative edge extension removed at user request. The four-zone page uses only the player-follow camera. Earlier single-route preview retains its own overview.
