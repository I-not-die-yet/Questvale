# Controlled demo mode — completed

Completed on 2026-11-14. All work is scoped to questvale-advisor only. No frontend,
team/chat, dataset, D1, cloud, Git or deployment changes were made.

## What was delivered

### Three separate limits (clearly distinguished)
| Limit | Scope | Default | Nature |
|---|---|---|---|
| API requests per minute | Per direct socket IP, local | 10 | Application policy |
| Model requests per minute | Shared adapter instance | 20 | Application policy |
| Total model call budget | Per adapter instance | 1–5 (evaluation); any finite (demo) | Operator authorization |

Provider quota (e.g. 40 RPM) is user-reported and unverified. Local limits do not
replace or verify provider quota.

### Modes
- **Evaluation**: `--mode evaluation --max-model-calls N` (N: 1–5). Preserves original test scope.
- **Demo**: `--mode demo --max-model-calls N` (N: any positive finite budget). Normal users are not stopped at request 6.

### Safety preserved
- Finite configurable total budget in both modes; no unlimited mode.
- Rate limiting, concurrency (default 2), timeouts (default 10s, max 30s), 429/Retry-After,
  no automatic retry, safe error sanitization.
- CLI defaults to disconnected (`503 ADVISOR_UNAVAILABLE`); NVIDIA opt-in requires
  `--confirm-free-endpoint yes` and explicit budget.
- Fixed endpoint `https://integrate.api.nvidia.com/v1/chat/completions`,
  fixed model `nvidia/nemotron-3.5-lightning-30b-a3b`, no search/fallback/redirects.

### Frontend integration contract (not yet implemented by frontend)
- GET `/api/opportunities` returns `{ "opportunities": [...] }` with all 24 records.
- POST `/api/advisor` accepts `message` and `context` (camelCase).
- `age`, `teamSize`, `isStudent` are optional explicit facts; `preferredCategories`
  is preference; `studentYear`/`hoursPerWeek` are background only. No inference from
  free text. Missing conditions → `needs_confirmation` with follow-up questions.
- Recommendations carry `opportunityId` for frontend detail/team views.
- Same-origin mountable handler is the next-phase integration point; existing
  Team/Town Chat routes are untouched and no arbitrary CORS is enabled.

## Test results
- **71 passed, 0 failed** across 17 JS modules.
- 12 new demo-mode tests cover sixth-call success, budget exhaustion, aggregate
  rate, provider 429/Retry-After, CLI mode wiring and control error sanitization.
- All syntax checks pass; CHECKSUMS.sha256 refreshed for 20 files.

## Next phase (explicitly not done this round)
- Same-origin mountable handler extraction for existing frontend server.
- Frontend loader/chat UI integration and browser verification.
- Any additional real NVIDIA calls require specific purpose and budget approval.

## Credential safety
- NVIDIA_API_KEY read only from explicit env file or process env; never printed,
  copied, logged or sent to frontend.
- Original credential file verified unchanged before/after.
- LIVE-TEST-REPORT.json preserves historical 2-call receipt; not modified here.


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
