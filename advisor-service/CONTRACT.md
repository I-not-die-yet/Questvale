# Questvale local API contract — v0.1

Status: implemented and locally tested in this isolated backend only, including
an explicitly opted-in NVIDIA selection adapter. The existing frontend is not
connected. No D1, cloud deployment or production model service is included.
All UI-facing messages are English. JSON field names use camelCase.

## Shared conventions

- JSON requests and responses; `Content-Type: application/json; charset=utf-8`.
- Success payloads do not contain an `ok` wrapper. Errors always contain only
  `{ "error": { "code": "...", "message": "..." } }`.
- Source values are preserved. Null is unknown, never zero, false or eligible.
- Opportunity status is separate from personal eligibility and interest relevance.
- HTTP responses are `Cache-Control: no-store`. No credentials or cookies are used.
- There is no conversation history/session field in this MVP. Each request is
  independent; the caller must supply the explicitly confirmed context again.

## GET /api/opportunities

Returns `{ "opportunities": [ /* unchanged source records */ ] }`.
The array may be empty. Historical/upcoming/unknown records remain visible here.

| Query parameter | Type | Optional | Behavior |
| --- | --- | --- | --- |
| `category` | string | Yes | One of `hackathon`, `business`, `startup`, `research`, `all`. Omitted or `all` means all records. |

Unknown/duplicate query parameters and unsupported categories return `400`.
Personalized filters such as `studentYear` and `teamSize` are not supported on GET.
They must not be interpreted as a complete eligibility profile.

### Opportunity record

The source schema is not renamed or flattened. These fields are returned:

| Field | Type | Meaning |
| --- | --- | --- |
| `id`, `name`, `organizer` | string | Stable ID and recorded identity |
| `category` | category enum | Never `all` |
| `status` | `open \| closing_soon \| upcoming \| closed_historical \| unknown` | Recorded application status, not a live check |
| `shortDescription`, `description`, `eligibilityRawText` | string | Recorded summary, description and eligibility evidence |
| `location` | object | `type: online \| offline \| hybrid`, `place: string`, optional `region: string \| null` |
| `dates` | object | `deadline`, `eventStart`, `eventEnd`: ISO calendar date or explicit-offset timestamp, null/omitted when unknown; `deadlineTimezone`: IANA zone or null/omitted |
| `fee` | object | `amount: string \| null`, `currency: string \| null`, `note: string \| null`; additional application/travel/visa charges stay in notes |
| `eligibilityConditions` | object | Original text-based `yearOrGrade`, `teamSize`, `institution`, `age`, `other`, `notes` (string/null/omitted), plus `student` (boolean/null/omitted); not executable rules |
| `uncertainty` | object | Required boolean `deadline`, `eligibility`, `fee`, `availability` flags |
| `officialUrl`, `sourceUrl` | string | Recorded HTTP(S) information sources; no claim that these are application endpoints |
| `dataSource` | `official \| agent_search \| community` | Recorded source classification, not independently certified by this service |
| `lastVerifiedAt` | explicit-offset ISO timestamp | Recorded source-read time |
| `tags` | string[] | Optional search/topic tags |
| `notes` | string/null | Optional recorded verification notes and caveats |

All original fields, including additional source fields, are preserved. Invalid
core records make local startup fail; there is no silent partial import. The
backend reads one immutable snapshot on startup. It never writes the source file.

## POST /api/advisor

No query parameters. Only JSON and identity/no content encoding are supported.

### Request

| Field | Type | Required / null | Constraints and meaning |
| --- | --- | --- | --- |
| `message` | string | Required; not null | 1–500 UTF-16 code units before trimming; cannot be whitespace-only. This matches the current textarea maxlength. |
| `context` | object | Optional; not null | Defaults to `{}`. Unknown fields are rejected. |
| `context.studentYear` | integer | Optional or null | 1–6. Preference/context only; not a substitute for enrolment, study level or institution. |
| `context.hoursPerWeek` | finite number | Optional or null | 0–168; fractions accepted. Context only. Workload matching is not implemented. |
| `context.preferredCategories` | string[] | Optional or null | 0–4 distinct category values; no `all`. Empty/omitted/null means no category restriction. |
| `context.teamSize` | integer | Optional or null | 1–100, including the user. This is a request bound, not an activity team-size rule. |
| `context.age` | integer | Optional or null | 0–120, user age in completed years. Teammates' ages remain unchecked. |
| `context.isStudent` | boolean | Optional or null | Explicit user statement of current student status. Does not establish degree type, institution or full-time status. |

The root accepts only `message` and `context`. Numbers/booleans are never coerced
from strings. UTF-8 request bodies are capped at 8,192 bytes, including all JSON
fields. Raw-body receipt is limited to five seconds after headers.

```json
{
  "message": "Show startup opportunities I should investigate.",
  "context": {
    "studentYear": 1,
    "hoursPerWeek": 6,
    "preferredCategories": ["startup"],
    "teamSize": 3,
    "age": 20,
    "isStudent": true
  }
}
```

No facts are automatically extracted from `message` into eligibility context.
Missing/null fields remain unknown even if the user mentions them in free text.
This avoids treating model extraction as user-confirmed evidence.

### Success response (HTTP 200)

All five top-level keys are always present:

| Field | Type | Meaning |
| --- | --- | --- |
| `message` | string | Server-owned summary, not unrestricted model-generated advice |
| `recommendations` | recommendation[] | Zero to three distinct opportunities |
| `missingFields` | string[] | Union of selected recommendations' missing user fields; empty when none selected |
| `uncertainties` | string[] | Service-wide evidence/assessment limitations |
| `followUpQuestions` | string[] | Up to three English questions; no implied resolution of unknown organizer rules |

Each recommendation has these required fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `opportunityId` | string | Must exist in the current dataset and current allowed candidate set |
| `availability` | object | `{status: "listed_open" \| "needs_confirmation", reasons: string[]}`; separate from eligibility |
| `eligibility` | object | `{status: "eligible" \| "ineligible" \| "needs_confirmation", reasons: string[], missingFields: string[]}` |
| `reasons` | string[] | Recorded decision evidence and interest/category context; not a qualification decision |
| `uncertainties` | string[] | Source gaps, unencoded requirements, unknown fees and unassessed suitability/workload |
| `officialUrl`, `sourceUrl` | string | Links from the validated dataset, never generated by a model |
| `lastVerifiedAt` | string | Original source-check timestamp |

`missingFields` only uses request-context keys such as `teamSize`, `age`,
`isStudent`. Unknown organizer team rules are source gaps under `uncertainties`.
Study year/weekly hours are not automatically required eligibility fields.

### Current eligibility limitations

- There are partial, evidence-bound checks for HealthNext (age below 30, team
  size 4–6, student status), Hult Prize (age 18+, team size 2–4, student status),
  and YouthX (age 18–25, team size 3–5, student status).
- These are based only on the imported recorded wording, not a new official-web
  check. Changed wording or an eligibility-uncertainty flag disables the checks.
- A clear mismatch excludes that candidate. Passing these checks never proves
  complete eligibility: institution, full team composition, degree status, SDG,
  project requirements and any exceptions remain unencoded.
- **No record in the current dataset is automatically returned as `eligible`.**
  `eligible` is reserved for future fully reviewed rule coverage. `ineligible`
  is calculated internally for supported mismatches and excluded from the
  recommendation array; this endpoint is not a full eligibility-audit endpoint.
- Text team-size fields are not generically parsed: CBS/HKMU accept individual
  enrolment, and IoT has multiple participation routes. Applying a bare range
  would incorrectly reject valid routes.

### Current availability policy

These are local safety policies, not organizer rules:

1. Only recorded `open`/`closing_soon` listings may become candidates. Historical,
   upcoming and unknown listings remain accessible through GET only.
2. A source check older than 14 elapsed days, a future verification timestamp,
   `uncertainty.availability=true`, or `dataSource=community` excludes a candidate.
3. Past encoded deadlines/event ends exclude it. Calendar dates are compared in
   the recorded deadline IANA time zone; explicit-offset timestamps are compared
   as instants. No timezone is guessed from the viewer or server.
4. Missing/uncertain deadlines or missing deadline zones produce
   `needs_confirmation`. On a date-only deadline's local calendar day, no exact
   closing time is assumed. Times mentioned only in prose are not parsed; the
   caller must consult the original source before applying that day.
5. `listed_open` means listed open in the recent draft, never live-verified.
   Availability is rechecked after the model returns, so a crossed deadline cannot
   survive merely because the request began earlier.

An empty response means no recommendations returned under current policy/model
selection. It does not establish that the user is ineligible everywhere. With
stale data, GET still exposes the records and timestamps; restart with a properly
reviewed source snapshot when available. Do not rewrite verification dates to
bypass freshness checks.

### Model boundary

A programmatically injected adapter may implement:

```js
async function select({message, context, candidates, signal}) {
  // An explicitly configured selection adapter implements this interface.
  // Return only selected IDs, never qualification, prices or explanation text.
  return {opportunityIds: []};
}
```

This is an interface sketch, not a canned production implementation. The CLI
injects no adapter by default and valid Advisor requests therefore return `503`.

Two modes are supported:

- **evaluation**: `--provider nvidia --confirm-free-endpoint yes --mode evaluation --max-model-calls N` where N is 1–5. This matches the previously authorized test scope.
- **demo**: `--provider nvidia --confirm-free-endpoint yes --mode demo --max-model-calls N` where N is any positive finite budget. Demo mode is a controlled local budget, not an NVIDIA service entitlement.

It reads only NVIDIA_API_KEY from the process or an explicit `--nvidia-env` file.
The fixed model/endpoint, no-retry/no-search policy and operational instructions
are in [README.md](README.md). The cap is process-local; restarting is not
permission to exceed the user's authorized total. Actual attempts are in
[LIVE-TEST-REPORT.json](LIVE-TEST-REPORT.json).

The only mock selectors are in tests. When an adapter is configured, an empty
candidate set can return HTTP 200 without calling it. The HTTP request/response
contract is unchanged by provider configuration.

### Three separate limits

| Limit | Scope | Default | Who sets it |
|---|---|---|---|
| API requests per minute | Per direct socket IP, local only | 10 | Application policy |
| Model requests per minute | Shared adapter instance | 20 | Application policy |
| Total model call budget | Per adapter instance (evaluation or demo) | 1–5 for evaluation; any finite for demo | Operator authorization |

Provider quota (e.g. 40 requests/minute) is user-reported and unverified for this
account/model. Local limits do not replace or verify provider quota.

Candidate metadata is untrusted source content, not instructions. Any future real
adapter must treat it accordingly, honor cancellation and provider token/cost
limits, and receive explicit service/purpose/budget authorization before use.
The server restricts output to up to three unique allowed IDs. Unknown, historical,
filtered or ineligible IDs, extra output fields and fabricated prose cause `503`.
All qualification, availability, source links and displayed reasons are constructed
by server policy. This first version is AI-assisted selection, not an open-ended
agent: no browsing, autonomous applications, messages, tool execution or memory.

### Errors and limits

| HTTP | Code examples | Behavior |
| --- | --- | --- |
| 400 | `INVALID_REQUEST`, `INVALID_QUERY`, `INVALID_JSON` | Invalid input; client should correct it |
| 403 | `HOST_NOT_ALLOWED`, `ORIGIN_NOT_ALLOWED` | Local request boundary failed |
| 404 | `NOT_FOUND` | Unknown route |
| 405 | `METHOD_NOT_ALLOWED` | `Allow` identifies the permitted method |
| 408 | `REQUEST_TIMEOUT` | Body did not arrive within the limit |
| 413 | `REQUEST_TOO_LARGE` | Body exceeds 8,192 bytes |
| 415 | `UNSUPPORTED_MEDIA_TYPE`, `UNSUPPORTED_ENCODING` | Unsupported body format |
| 429 | `RATE_LIMITED`, `ADVISOR_BUSY` | Positive integer-seconds `Retry-After`; show waiting time, do not loop-retry |
| 500 | `INTERNAL_ERROR` | Generic safe message; no stack/provider detail |
| 503 | `ADVISOR_UNAVAILABLE`, `ADVISOR_TIMEOUT`, `ADVISOR_INVALID_RESPONSE` | No model, model failure, ten-second timeout or unsafe output |

Advisor requests are limited to 10 per fixed 60-second window per direct socket
IP, anchored on its first request. Invalid POST attempts count.
There are at most two concurrent adapter calls; no queue and no automatic retry.
Forwarded-IP headers are ignored. A cancelled/timed-out adapter that ignores abort
retains its concurrency slot until it settles, preventing abandoned-call buildup.
This limiter is process-local and resets on restart; it is not cloud-wide protection.

Client disconnects abort adapter signals. Internal cancellation is classified as
499, but a disconnected client should not expect to receive an HTTP response.
No request/profile/provider-error logs or conversation persistence are created.
Do not show a success result when the service returns an error.

## Frontend handoff

Frontend owner changes GET loader to read `body.opportunities`, retaining its
existing adapter. Advisor wiring must render actual responses using safe text
nodes, disable duplicate submissions, preserve source uncertainty, display
`Retry-After`, and keep Town Chat/team features untouched. Do not disable the
current disconnected disclosure before a real backend/provider is integrated.

The local API intentionally allows no cross-origin browser calls. The current
frontend origin on another port cannot call it directly. A same-origin local
proxy/integration belongs to the frontend/integration step; no permissive CORS,
frontend server replacement or shared-file edit is included here.


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
