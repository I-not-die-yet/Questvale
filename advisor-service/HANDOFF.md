# Questvale Advisor handoff

**Current update:** the NVIDIA evaluation section at the end supersedes the
baseline milestone's provider/test-status statements. Frontend integration is
still not performed. No live server remains running.

## Baseline scope and ownership (before NVIDIA evaluation)

- Date: 2026-11-14, Asia/Hong_Kong.
- Builder: this session (`lead`). No other builder or frontend integration is implied.
- Deliverable: isolated local JSON-backed API foundation, not a live AI product.
- Write scope: this `questvale-advisor/` directory only. The frontend, original
  draft/imported dataset, multiplayer work, D1 and cloud resources were not edited.
- The frontend owner is the integrator for loader/chat UI changes. No message has
  been sent to that owner or the main chat; the user can hand off this directory.

## Fixed version identification

No Git branch/commit/PR was created. The inspected frontend directory is not a Git
repository. `CHECKSUMS.sha256` identifies the final files in this isolated handoff;
regenerate it if those files change. It excludes its own checksum.

Dataset verified during acceptance:

- 24 records; imported frontend copy and original draft are byte-identical.
- SHA-256: `0c7876984a6f9afe266572f851d7202c1dbfd21bed020135f1efa6c01bb5f74b`.
- Default tests read the sibling draft; the final acceptance run explicitly used
  the already-imported frontend copy via `QUESTVALE_DATA_FILE`.
- This establishes file identity/structure, not the truth or current accuracy of
  organizer/source claims. No source websites were accessed during this task.

## Files

- `src/contract.mjs`: request/query/output validation, limits, safe API errors.
- `src/dataset.mjs`: read-only snapshot loading, schema/date/URL checks, freezing.
- `src/policy.mjs`: source freshness, timezone/deadline filtering, partial
  evidence-bound eligibility rules and server-owned response construction.
- `src/model-runner.mjs`: injected selection adapter boundary, cancellation,
  timeout and concurrency-slot accounting; no real provider implementation.
- `src/model-controls.mjs`: branded, allowlisted safe control errors for local
  aggregate rate, provider 429 and budget exhaustion.
- `src/rate-limit.mjs`: sliding 60-second limiter and sanitized Retry-After parsing.
- `src/server.mjs`: loopback HTTP/CLI, body limit, rate limiting and safe errors.
- `tests/*.test.mjs`, `tests/helpers.mjs`: unit and loopback acceptance tests;
  selection adapters exist only in tests.
- `examples/*.json`: four test-only, pinned-time request/response artifacts.
- `CONTRACT.md`, `README.md`: exact local API and run/maintenance instructions.

## Executed verification

Runtime: bundled Node.js **v24.21.0**. No packages installed.

1. Backend suite on the imported dataset: **71 passed, 0 failed** (59 baseline +
   12 new demo-mode tests).
   Includes contract validation, source preservation, deadline/timezone boundaries,
   freshness, partial-rule evidence drift, solo/multi-route exceptions, exact
   example replay, unsafe model IDs/extra fields, body size/UTF-8/timeouts,
   per-peer limits, Host/Origin controls, model concurrency, client cancellation,
   interrupted bodies, model error sanitization, demo mode, budget exhaustion,
   aggregate model rate, provider 429/Retry-After and CLI mode wiring.
2. Syntax: **all 17 source/test JavaScript modules passed `node --check`**.
3. Existing frontend data adapter tests: **6 passed, 0 failed**; no frontend code
   was changed. Other frontend tests and browser flows were not rerun.
4. Actual CLI process smoke test: loaded 24 records, GET returned 200, no-model
   POST returned `503 ADVISOR_UNAVAILABLE`, SIGTERM exited with code 0.
5. Original draft and imported dataset SHA-256 match as recorded above.

Tests used loopback HTTP only and stopped all their servers/child processes. No
persistent server, scheduled task, paid call, external request or cloud resource
was created. No real model output, provider reliability or real billing is tested.

Early test-harness failures were corrected: adopted-promise settlement needed an
event-loop turn before observing slot release; raw HTTP was required to test Host
and malformed request-target behavior without client URL/header normalization.
Final results above were rerun after the corrections. No issue persisted through
two failed corrective attempts.

## Important limitations

- CLI has no model adapter: valid Advisor POSTs intentionally return 503. Tests
  using mock selection are not real AI conversation evidence.
- No frontend wiring, browser end-to-end test, mobile test, CORS integration, D1,
  deployment or distributed production limiter is provided.
- No current record can be proven fully eligible. Three activities have partial
  age/team/student checks; all remaining conditions require confirmation.
- The 14-day source freshness policy excludes stale/future-dated source checks.
  It does not automatically refresh data or prove recent claims are correct.
- Calendar-day deadlines are uncertain on their local closing date; exact times
  found only in prose are not executable deadline rules in this version.
- No persistence or conversational memory. Repeated questions need explicit context
  in each request; message text is not treated as confirmed profile evidence.
- Human-readable model prose is deliberately not accepted: this first boundary
  permits ID selection only. Server policy owns reasons and qualification output.

## Next step and approval boundary

1. Hand the contract/examples to the frontend integrator; keep UI/team/multiplayer
   file ownership separate. Integration needs a same-origin local request path;
   the current static frontend server does not proxy these endpoints.
2. Select and explicitly approve a real model provider, purpose and bounded usage
   budget before adding an adapter or making calls. No keys should be sent in chat,
   frontend code or URLs. No real provider is selected/configured by this work.
3. Then test the real provider and combined frontend on the integrated version.
   Only after that discuss hosting, cloud-wide limits and optional D1 migration.

## Manual recovery

No automatic retries are enabled. For 429, display Retry-After and wait before a
manual request. For 503 without a model, leave the disconnected notice visible.
For stale source data, review/update it in the data-owner workflow and restart the
CLI with that reviewed file. If an adapter ignores cancellation, wait for it to
settle or manually stop/restart this local process; do not remove concurrency
limits to force additional provider calls. Stop the CLI with Ctrl+C.

## NVIDIA evaluation update — 2026-11-14

### Authorization and evidence

The user approved NVIDIA only, at most five real inference attempts, free endpoint
only, no search or paid fallback, using NVIDIA_API_KEY from a specifically named
existing external env file. The exact credential value was never printed, copied
into this project or placed on a command line. The original credential file was
compared before/after and is unchanged. No unrelated media variables were loaded
into the process environment or sent to the provider.

Public official sources checked:

- [NVIDIA Build](https://build.nvidia.com/) listed Lightning under
  "Free inference with leading models".
- [Model page](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b).
- [Official endpoint/schema/examples](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b-infer.md)
  specify the integrate.api.nvidia.com endpoint, exact model ID and
  `chat_template_kwargs.enable_thinking=false` option.

This establishes the published free evaluation route at verification time, not
unlimited quota, permanent free availability, an SLA or an independently inspected
account billing statement. No billing/private-account settings were accessed.

### Implementation delta

- Added `src/nvidia-credentials.mjs`: exact NVIDIA_API_KEY parsing only; no shell
  execution/interpolation, no process-wide dotenv import, secret-safe errors.
- Added `src/nvidia-adapter.mjs`: fixed NVIDIA endpoint/model, 256 output tokens,
  thinking disabled, bounded payload/response, strict selected-ID JSON parsing,
  cancellation, no redirects/tools/search/polling/retry/fallback. Evaluation mode
  capped at 1–5 attempts; demo mode accepts any explicit finite budget.
- Updated `src/server.mjs`: explicit provider/free-route/call-cap CLI opt-in;
  no-provider mode remains the default. Shared HTTP JSON contract is unchanged.
- Updated `src/model-runner.mjs` comment, README and contract documentation.
- Added `tests/nvidia.test.mjs` and sanitized `LIVE-TEST-REPORT.json`.
- No packages, frontend/data edits, D1 work, deployment or Git mutations.

### Actual live observations

The temporary test server used the real NVIDIA adapter, public candidate metadata
and synthetic student profiles; it was stopped after testing. These were actual
provider calls, distinct from mock unit tests:

| Case | NVIDIA HTTP | Local API HTTP | Adapter elapsed | Provider tokens (input/output) |
| --- | --- | --- | --- | --- |
| Startup selection | 200 | 200 | 2.132 seconds | 589 / 57 |
| Hackathon source gaps | 200 | 200 | 0.594 seconds | 374 / 38 |

- **2 of 5 authorized attempts used**, no retries/fallback/search. No more real
  calls were made for latency measurement or regression tests.
- Mean **1.363 seconds**; sum of measured request durations **2.726 seconds**.
- Provider-reported total: **963 input + 95 output = 1,058 tokens**.
- Timing includes network/provider response, response reading and selection
  validation. It excludes setup, frontend rendering and the rest of development.
  Only two samples: not a throughput/percentile/reliability benchmark.
- Every returned ID existed in the allowed dataset candidate set; all five
  returned recommendations retained `needs_confirmation` qualification status.
  Unknown Techathon fee/eligibility did not become free/eligible assertions.
- The receipt records safe metadata/IDs only, not raw provider prose, prompts,
  credentials or authorization headers. A pre-call ledger guarded against silently
  restarting that one-time test and resetting the five-attempt authorization.

### Demo mode update — 2026-11-14

Demo mode adds a configurable finite total call budget beyond the evaluation cap
of 5. It is a local application control, not an NVIDIA service entitlement. The
40 RPM provider figure was user-provided and is unverified for this account/model;
local limits do not replace or verify provider quota.

Three separate limits are enforced:
- API requests per minute: per direct socket IP, local only (default 10).
- Model requests per minute: shared adapter instance (default 20).
- Total model call budget: per adapter instance (evaluation 1–5; demo any finite
  positive budget).

Demo mode was verified with mock tests only. No additional real NVIDIA calls were
made. The 2 approved real calls remain in `LIVE-TEST-REPORT.json`.

### Current verification and remaining work

- Full suite with the imported dataset: **71 passed, 0 failed** (59 baseline +
  12 new demo-mode tests).
- All **17** source/test JavaScript modules passed syntax checks.
- Latency and token-summary arithmetic recomputed from the recorded observations.
- Earlier frontend adapter tests (6 passed) were not rerun in this provider-only
  update; no frontend files changed. Provider-enabled browser/CLI end-to-end flows
  and mobile behavior remain untested. Live API tests used createAdvisorServer.
- The provider cap is process-local. Restarting or creating another adapter is not
  permission to exceed the approved total. Consult the receipt and obtain applicable
  authorization before expanded/live unattended use; no service is left running.
- Next integrator task: same-origin frontend proxy/loader/chat hookup with explicit
  UI file ownership, then browser verification on the combined version. The UI
  remains disconnected today; do not describe this as a deployed chat agent.


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
