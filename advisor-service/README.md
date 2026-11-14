# Questvale Advisor — isolated local backend

Dependency-free Node.js API prototype. It reads an existing opportunity JSON file
without changing it. This directory is separate from the Questvale frontend.

## What is implemented

- `GET /api/opportunities` with optional category filtering and the agreed envelope.
- `POST /api/advisor` request validation, conservative candidate/eligibility policy,
  server-owned explanations, model-selection output validation and safe errors.
- Body/length limits, per-peer rate limiting, bounded model concurrency/timeout,
  cancellation and loopback Host/Origin protection.
- Tests with explicit test-only selection adapters and four JSON contract examples.
- Opt-in NVIDIA free-evaluation selection adapter (1–5 attempts) and demo mode
  (explicit finite budget, no fixed five cap) with a fixed model/endpoint,
  secret-safe credential loading, aggregate model rate limiting, provider
  429/Retry-After handling and no automatic retry.

## What is NOT implemented

- No production AI service or unlimited live usage. NVIDIA is an explicitly opted-in,
  capped evaluation mode only; the default CLI remains disconnected.
- No stored credential copy. The external env file is read only for NVIDIA_API_KEY.
- No frontend edits, browser integration, multiplayer, Town Chat or team changes.
- No D1 schema/import/migration, Cloudflare resources or deployment.
- No automatic source refresh, website verification, application submission,
  persistent conversation history or user account system.
- No complete eligibility rules. Every surviving recommendation currently needs
  qualification confirmation. A 200 response with test adapters is not evidence
  of real model behavior or end-to-end frontend integration.

See [CONTRACT.md](CONTRACT.md) for exact fields, limits and behavior. See
[HANDOFF.md](HANDOFF.md) for verification and ownership notes.

## Run locally

Use an existing modern Node.js runtime (tested runtime is recorded in HANDOFF).
No package installation or `npm install` is needed. From this directory:

```bash
node src/server.mjs --data /absolute/path/to/opportunities.json
```

The server binds only to `http://127.0.0.1:4185`; `--port 4186` can select another
port. The source path is a CLI-only configuration value, never an HTTP input.
The expected dataset is the already imported 24-record Questvale JSON. The server
validates and freezes a startup snapshot; stop/restart to load a reviewed update.
Stop with Ctrl+C. It does not replace or start the existing frontend server.

By default the CLI has no model connected. GET works; valid POST requests return
`503 ADVISOR_UNAVAILABLE`. There is no CLI mock mode or fake AI reply.

### Explicit NVIDIA evaluation mode

The fixed provider endpoint is `https://integrate.api.nvidia.com/v1/chat/completions`
and the fixed model is `nvidia/nemotron-3.5-lightning-30b-a3b`. NVIDIA listed this
model in its free inference section at verification time; this is not a promise
of unlimited quota, permanent free access or production availability. See the
source links and actual observations in [HANDOFF.md](HANDOFF.md).

Only after authorizing that run and rechecking the free endpoint, use:

```bash
node src/server.mjs --data /absolute/path/to/opportunities.json --provider nvidia --mode evaluation --max-model-calls 5 --confirm-free-endpoint yes
```

For demo mode, replace `evaluation` with `demo` and pass a finite budget greater
than 5, e.g. `--max-model-calls 10`:

```bash
node src/server.mjs --data /absolute/path/to/opportunities.json --provider nvidia --mode demo --max-model-calls 10 --confirm-free-endpoint yes
```

`--nvidia-env` is optional if NVIDIA_API_KEY is already set in the server
process. No dotenv package is needed. Only that exact variable is read; no shell
sourcing, process-wide dotenv import, key copy or credential output occurs.
Never put a key value on the command line or frontend.
The API key is sent only as the Authorization header to the fixed NVIDIA endpoint;
redirects, search, polling, automatic retries and provider/model fallbacks are off.

Evaluation mode: `--max-model-calls` must be 1–5. Demo mode: any positive finite
budget up to the local safe-integer maximum. Both modes share local rate limits,
concurrency limits, timeouts and safe error handling.

The cap counts failed attempts too. It is per adapter/process, not an account or
cross-process quota. Restarting does NOT extend the user's authorization: consult
[LIVE-TEST-REPORT.json](LIVE-TEST-REPORT.json) before any additional real calls.
This task used 2 of 5 approved evaluation attempts and stopped its server; unused
allowance is not an authorization for unattended future runs. No server remains
connected.

Local control limits (not NVIDIA service limits):
- API requests per minute: configurable, default 10 per direct socket IP.
- Model requests per minute: configurable, default 20 across the shared adapter.
- Concurrent model calls: default 2.
- Model timeout: default 10 seconds, local maximum 30 seconds.
- Demo/evaluation call budget: finite, configurable at startup.

The adapter limits output to 256 tokens with thinking disabled, request JSON to
32 KiB and provider response to 16 KiB. Only a strictly valid selection of supplied
IDs is accepted. All reasons, qualification and source information still come from
the backend, not model prose.

Manual API check after starting:

```bash
curl http://127.0.0.1:4185/api/opportunities
```

This accesses loopback only. The API does not permit browser requests from a
separate frontend port; same-origin integration is a later owner-controlled step.

## Tests

```bash
node --test tests/*.test.mjs
```

By default tests read the sibling data draft. To test the exact already-imported
frontend copy instead, set a CLI environment variable for this command:

```bash
QUESTVALE_DATA_FILE=/absolute/path/to/imported/opportunities.json node --test tests/*.test.mjs
```

Tests use temporary loopback ports and close them afterward. They use no external
network, model provider, credentials or real cloud database. No server is left
running. The user dataset is read only. Existing frontend tests remain separate.

## Examples

Each JSON document includes its request, HTTP status and expected response, plus
`testOnly`, a pinned `asOf` and `selectionForTest` metadata. These are contract/test
artifacts, not real model replies. Test metadata is not part of the HTTP request.

- [success.json](examples/success.json): selected recorded opportunity, still with
  partial-eligibility/source limitations; success does NOT mean eligible.
- [needs-information.json](examples/needs-information.json): same response shape,
  explicit missing user fields and English follow-up questions.
- [no-recommendations.json](examples/no-recommendations.json): valid empty selection,
  without claiming the user is ineligible.
- [invalid-request.json](examples/invalid-request.json): invalid input and safe error.

Tests replay all four through the actual local HTTP handler and compare the exact
JSON. Verification time is pinned for reproducibility, not evidence that source
websites were rechecked then.

## Ownership / next steps

This backend owns validation/policy/API files in this isolated directory. The
frontend owner owns the existing loader, UI adapter and chat rendering. Do not
copy this directory over the frontend or change shared interfaces silently.

NVIDIA evaluation has been tested under an explicit five-attempt authorization;
actual results are separate from mock tests. Any continued/expanded provider use
needs an applicable purpose and call/cost authorization. Do not put keys in
frontend code or pass secrets in URLs. A cloud-wide limiter, authentication policy
and hosting design require separate decisions before production use. D1 is not
required to test this local JSON-backed API and has deliberately been deferred.


## Structured decision evidence update (2026-11-14)

The selector now receives recorded dates/time zone, fee and notes, location,
uncertainty flags, partial availability/eligibility assessments, source type,
recorded check time and source caveats, in addition to ID/name/category/tags.
These remain untrusted source data. Model output is still IDs only; no extra
request fields, eligibility coverage, model budget, endpoint or rate changes.

Server-owned recommendation `reasons` now include the recorded deadline, fee,
location and source caveats. Fee uncertainty remains explicit even when an amount
is recorded. Deadline ordering is emitted only for at least two confirmed
comparable dates (same calendar zone, or explicit instants); it describes timing
within returned selections, never overall suitability. Unknown fees are not free;
recorded check time is not full verification. Selection order is not a ranking.
Skills/live team recruitment remain outside this Advisor; the frontend team panel
handles exact role overlap separately. No automatic fallback or retry was added.

Validation: 75 backend tests pass on Node v24.22.1 using the imported frontend
dataset. Includes four new evidence/HTTP/payload-bound tests and refreshed
mock-only contract examples. Tests used loopback and fake provider transport,
not real NVIDIA. No browser, deployment or new live-model validation. The prior
LIVE-TEST-REPORT.json is historical and unchanged. Restart an existing backend
process to load these modules; no running service was started by this update.
