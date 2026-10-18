# Local platform architecture

## Composition and portability

`index.js` validates configuration, opens SQLite, creates the media service/provider/run coordinator, and binds Express to `127.0.0.1`. It preserves production NODE_ENV and the stub's HTTP keep-alive/header timeouts. Shutdown stops listening, aborts local inference, waits for owned runtime/media work, and closes storage.

`src\app.js` creates a testable Express app. `store.js` owns prepared SQL statements, transactional migrations, template seeding, snapshots and interruption recovery. `runs.js` coordinates exactly one generation. `providers\ollama.js` supplies status, verified local models, and cancellable generation. The self-contained UI has no bundler or remote assets.

Windows launch mechanics, data-root selection, and provider supervision are separate from registry/conversation logic. A later Linux/bootable image can provision those services and supply `AXES_DATA_DIR`; this change does not build an image or choose an OS distribution.

## Local API

Private routes require the paired browser session. Writes additionally require exact Origin, JSON (except raw media PUT), and `X-AXES-CSRF` returned by the session endpoint. There is deliberately no permissive CORS support.

| Endpoint | Shape / behavior |
|---|---|
| `GET /` | Public original JSON health response, not inference readiness |
| `GET /app/` | Public static workbench; no embedded private data or pairing code |
| `POST /api/session` | `{code}`; bounded pairing attempts; issues HttpOnly SameSite=Strict cookie and returns `{csrf}` |
| `GET /api/session` | Returns CSRF token for current authenticated session after reload |
| `DELETE /api/session` | `{}`; revokes current session |
| `GET /api/status` | App/storage/runtime/media status, actual database path, template/enabled/run counts |
| `GET /api/identity` | Supplied Origin/provenance, unverified registration/issuance, exact reserved tokens |
| `GET /api/models` | Verifiable local inventory only; unavailable runtime returns an explicit error |
| `GET/POST /api/profiles` | List/create; create `{name,purpose,instructions,enabled?,passport_candidate?}` |
| `PATCH /api/profiles/:id` | Edit those fields; candidate must be null or an exact reserved token |
| `GET/PUT/DELETE /api/profiles/:id/media` | Authenticated media serving, bounded raw upload, explicit deletion |
| `GET/POST /api/conversations` | List/create; create `{profileId,title}` |
| `GET/DELETE /api/conversations/:id` | Read history/runs; cascade-delete local conversation; reject deletion during its active run |
| `POST /api/conversations/:id/runs` | `{input,model}`; verify model/context, save user turn/run, return 202/run ID |
| `GET /api/runs/:id` | Read persisted state/result metadata |
| `POST /api/runs/:id/cancel` | `{}`; abort owned active request, persist cancellation once settled |
| `POST /axiom` | Authenticated deprecated `{action,payload}` echo, not automation |

Media PUT requires exact `Content-Type` of `image/jpeg`, `image/png`, or `video/mp4`, binary body, and `X-AXES-Rights: confirmed`. It has a separate size limit and serialized receive/normalize operations; it is not multipart. It accepts no source URL, filename, or filesystem path. Media GET uses random server-owned paths and fixed MIME types, supports normal video byte ranges, and is no-store. Profile IDs are bound SQL values, never path components for disk writes.

Errors are `{error:{code,message}}` with appropriate non-success HTTP status. Unrecognized fields fail validation. No shipping fake provider, credential field, or network provider picker exists.

## Run semantics and inference boundary

Run states are pending/running/completed/failed/cancelled/interrupted. The first persisted state in this version is running; preflight failures do not create a user turn. Busy returns 409 rather than queueing. Cancel/timeout aborts the HTTP request; runtime work may take time to release device memory. Shutdown terminates only the owned runtime child.

Each run snapshots role instructions, model name, and local model digest. It replays completed user/assistant turns only. Failed/cancelled/interrupted turns remain visible but are not silently re-executed. All completed turns are included or the operation is rejected for context; no deliberate sliding-window truncation occurs.

The provider checks the dedicated port is unused before shell-free spawn, forces loopback/cloud-disabled settings, requires cloud-disabled log confirmation and stable version format, observes child exit/error, and polls bounded readiness. Port-ownership checks are not a defense against malicious same-user processes racing the bind. Do not share this listener with untrusted local software.

Only `/api/version`, `/api/tags`, `/api/show`, and `/api/chat` are reachable through the adapter. Destination is fixed numeric loopback; HTTP redirects fail. Local inventory requires a positive size, GGUF format, a digest, and no remote/cloud indicators. Details must confirm completion support and an architecture-specific context bound. Unknown metadata fails closed. No pulls, web search, tool calls, hosted fallback, or credentials.

The input-byte estimate includes a per-message reserve and output reserve; it is deliberately conservative, not a tokenizer. The runtime can still report context/OOM errors. Incomplete/truncated/tool-dependent output is rejected rather than saved as a completed answer. Real tokenizer/template compatibility and hardware fit must be verified with the actual chosen model.

## Persistence and recovery

SQLite migrations use `user_version`: initial registry/conversations/runs/messages/settings, normalized-media metadata, reserved identity-candidate field, then immutable source-agent metadata linked to exact local profile IDs. Migration and seeding are transactional; edits are never overwritten by seed insertion. Newer schema/corruption/permission failures abort startup rather than replacing user data.

A per-data-directory PID/nonce lock prevents two instances from modifying live run recovery state. A dead-owner lock can be recovered; uncertain/live locks fail explicitly. This is a single-machine operational lock, not a distributed lock or anti-malware defense.

Normalized media has generated filenames outside the checkout. Staging files and unreferenced app-named outputs are recovered at startup. Database/file changes are not one cross-resource atomic transaction: failures are surfaced, and interrupted/unreferenced output is cleaned on restart. Files referenced by a DB row are never silently substituted. Keep database/media backups together and back up only with the app stopped.

## Origin, registration, and ownership

Hierarchy: supplied Origin root reference, then any future verifiably issued identities, then subordinate role profiles. `KEYSTONE-ORIGIN-000001` is preserved, not minted. Exact reserved tokens: XEXAR, XEXAUR, XEXPUR, XEXIAN, XEXAX, XEXXI, XEXAULA.

No issuance ledger or authoritative app-registration proof exists here. Current provenance is user-directed context relayed by General Chat. The schema permits only unassigned or reserved/unissued candidates; it has no issued-passport mutation endpoint. `XEXAUR-0001` is not evidence. A candidate link neither proves registration nor reserves a unique real identity. Verified import/manual issued assignment needs an authoritative ledger, validation format, and provenance design in a later change.

`origin-registration-20260929-v1/ORIGIN_REGISTRATION.md` records the founder/full-ownership claim for Axel Urartu, requested share 100%, and "Founder ownership stands here." Founder ownership is founder-asserted and recorded as established in the user's internal record. `ORIGIN_RIGHTS_REGISTER.md` is a private, unsigned rights/evidence schedule, not an assignment or legal opinion; third-party assets/licensing remain distinct. These source contents were reviewed and relayed by coordinating General Chat, not bundled here.

This app preserves that assertion without adjudicating or transferring title. Signatures/filings and third-party/dependency/model rights remain distinct and unverified here. Uploading files does not independently establish rights, consent, app registration, or passport issuance. See README Rights & limits and the in-app help dialog.

`GET /api/identity` also exposes the founder's forward retention policy: Axel directs 100% ownership/control of future original Origin/AXES contributions and decides any voluntary assignment/license/transfer. The policy is an intended governance instruction, not a new license, a signed contributor agreement, or a guarantee of exclusive AI-output title. The [ownership/provenance record](ownership-policy.md) distinguishes original contributions from licensed components, the baseline ISC declaration and public-repository/platform grants, and the applicable account/provider terms. No licenses or visibility settings are altered. Future grants/changes require Axel's separate decision.

## Rights & limits and threat model

This is a trusted-user, local workstation tool, not a public web service or secure execution sandbox. Pairing protects private app reads/writes from ordinary unpaired browser requests; exact Host/Origin, anti-CSRF, disabled CORS, CSP, safe text rendering, and no-store responses form additional boundaries. Sessions are in memory and invalidate on process restart. Startup pairing display is intentional; prompt/output/session secrets are not logged by the app. Runtime output is inspected in a bounded in-memory buffer for readiness and is not forwarded into normal logs.

Ollama is an independently exposed loopback service without the app's cookie auth; same-user local processes, browser extensions, trusted model files and media decoder binaries are inside the trust boundary. Keep native decoders/runtime patched. Local re-encoding is not OS-level process isolation. Never deploy these endpoints on a public/LAN listener or assume avatar validation provides a malware sandbox.

Cloud disablement prevents the supported runtime's cloud features, not network access by every process. Strict offline proof needs a disconnected/network-restricted host and a provisioned model. No firewall/network adapter/account/billing/domain changes are made.

Data is plaintext; OS permissions/encryption/backups are the owner's responsibility. Uploaders need copyright/licensing rights and appropriate privacy/likeness consent; no rights transfer is inferred. Redistribution requires review of model/runtime/FFmpeg codec and native image-library licenses. Deletion is local, not backup deletion or secure erasure. This is guidance, not legal advice.

Deferred: model/runtime installation, cloud inference, media generation, arbitrary attachments, vision input, semantic/cross-role memory, autonomous execution, tools/approvals/scheduling/delegation, encrypted multi-user storage, verified registry import, desktop installer/service, and bootable OS. Autonomy requires an independently designed permissions/sandbox/recovery/resource-accounting system.

## Acceptance procedure

Use `npm test` for isolated databases and injected fake runtime/video operations; JPEG/PNG normalization uses the real installed decoder. Browser review covers pairing, Origin-first hierarchy, role creation/editing, identity candidate labels, local history, missing-runtime state, image upload/delete, help dialog, keyboard focus, and desktop/narrow reflow.

For real offline inference: separately provision supported Ollama and a licensed fitting model; disconnect internet; launch/pair/select the local model; generate an actual response; restart and reopen history. Stop the runtime/remove model availability and confirm actionable failure without a substituted answer. For videos, separately provision FFmpeg/ffprobe and verify a genuine short H.264 MP4 can be normalized/played/replaced/deleted and over-limit/invalid content is rejected.

Development's injected provider/video tests do not satisfy those real integration gates. No actual model or media-tool installation is claimed.

Sources: [Ollama API](https://docs.ollama.com/api/introduction), [cloud-disable FAQ](https://docs.ollama.com/faq), [model inventory](https://docs.ollama.com/api/tags), [model details](https://docs.ollama.com/api-reference/show-model-details), [Node 24 SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
