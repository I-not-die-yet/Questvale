# Tunnel demo preparation — not published

This build has not opened a Tunnel, enabled a provider or been publicly tested.
Run one Node 24 frontend process and one existing Advisor backend at most. SQLite
stays on the laptop. Do not copy an existing `.local/` directory into a handoff.

## Local preview

`node serve.mjs` listens only on 127.0.0.1:4174. No PUBLIC_ORIGIN means local hosts
only. Advisor forwarding now defaults OFF (`ADVISOR_PROXY_MAX_CALLS=0`). Static
pages, Compare, teams and Town Chat remain available without a model.

## Configuration for a later authorized Tunnel session

- `PUBLIC_ORIGIN`: the exact HTTPS origin supplied by the chosen Quick Tunnel,
  for example `https://your-assigned-name.trycloudflare.com`. No trailing slash,
  path or wildcard. When set, only that Host is accepted; local-host browser URLs
  will be rejected until it is unset. Missing/mismatched Origin on mutations fails.
- `PORT`: frontend loopback port, default 4174. Do not bind to 0.0.0.0 for Tunnel.
- `ADVISOR_PROXY_MAX_CALLS`: non-negative integer, default 0. Set a positive finite
  number only after the user authorizes a provider test/demo purpose and call cap.
  Attempts, including failed forwarding, consume this process-local budget.
  Restarting must not be used to exceed the user's overall authorized budget.

The Tunnel must preserve the public Host configured above. Forwarded host/proto/IP
headers are ignored. If an origin Host override is needed, set it explicitly in
the connector to the assigned public hostname; do not broaden server allowlists.
Changing Quick Tunnel hostname requires a new PUBLIC_ORIGIN and frontend restart.
No Tunnel installation or command execution has been performed by preparation.

## Guest identity and limits

`qv_session` is HttpOnly, SameSite=Strict and Path=/api; HTTPS responses add Secure.
Session initialization migrates the previous Path=/api/teams cookie using the
same valid token/user and clears the old narrow-path cookie. No schema migration.
An existing server session's original expiry still applies; reconnect after expiry.

The browser initializes its shared guest before Advisor submission. The frontend
validates the token against SQLite and applies a five-second guest cooldown,
two-request concurrency limit, 20 attempts/minute globally and finite total cap.
Neither cookie, guest ID nor browser Authorization is passed to the Advisor/model.
Deleting cookies creates a new guest and can bypass guest cooldown; global limits
still apply. This is a bounded demo control, not abuse-proof public registration.

The separate backend retains its own limits and finite provider budget. All proxy
requests reach it from loopback: its default 10 API requests/minute can therefore
throttle the whole demo. For an authorized demo, explicitly align its
`--api-requests-per-minute` limit with the frontend's 20/minute global ceiling;
do not disable limits or trust client-supplied IPs. Keep port 4185 loopback-only.

## Delivery layout

The handoff contains pixel-world/ and advisor-service/, with no packages, local
database, credentials, logs or verification screenshots. From the delivery root:

```sh
node pixel-world/serve.mjs
```

Optional disconnected backend in a separate terminal (makes no model calls):

```sh
node advisor-service/src/server.mjs --data pixel-world/data/opportunities.json --port 4185
```

Do not enable real provider flags as part of a routine startup. Tests from the
delivery root (loopback + mocked provider only):

```sh
node --test pixel-world/tests/*.test.mjs
QUESTVALE_DATA_FILE="$PWD/pixel-world/data/opportunities.json" node --test advisor-service/tests/*.test.mjs
```

## Required before sharing a URL

Obtain explicit approval to install a connector if missing, and to expose the
service. Use a fresh demo database, not existing private chats. Then verify the
public Host/Origin/Cookie behavior, two independent guests, physical-phone layout,
Compare/Advisor/chat scrolling, unauthorized requests, restarts and database
persistence. Tunnel availability, real phone keyboards and real provider behavior
are unverified. Keep laptop powered/connected/awake during a demo; stop the Tunnel
to remove access and stop Node processes when done. Back up any valuable demo
database privately while its server is stopped; never commit it.

This is a local demo preparation, not production-hardening or deployment evidence.
