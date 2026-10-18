# AXES local workspace

A Windows-hosted local role workspace and API: editable profiles, persisted conversations, user-triggered local inference, and uploaded profile avatars. It is the application foundation for a later AXES OS, **not** a bootable OS or an autonomous agent fleet.

## Start locally

Provision a patched **Node 24.22.0+ in the Node 24 LTS line** and this application's dependencies before disconnecting. Node's built-in SQLite API is used; there is no database service.

```powershell
npm ci
.\scripts\start-local.ps1
```

If using a portable Node, pass `-NodePath 'C:\tools\node.exe'`. The launcher does not install tools, change execution policy, require admin rights, or download models. You can also run `npm start`.

To place a prototype launcher on Desktop (no system install), run:

```powershell
.\scripts\install-desktop-prototype.ps1 -NodePath 'C:\path\to\node.exe'
```

This creates `Start-AXES-Prototype.cmd` in `Desktop\AXES Prototype`, wired to this checkout and a desktop-local data folder.

Open `http://127.0.0.1:3000/app/` and enter the random pairing code printed in the launch terminal. Use the numeric loopback address, not `localhost` or a LAN address. The code is private and valid only for that launch. Pairing another browser replaces the prior browser session; sessions expire after eight hours. Locking clears the browser session but does not cancel active work.

Roles, history, and image avatars work without Ollama. To generate text, separately provision Ollama and at least one suitable **local** GGUF completion model before disconnecting; choose a model that fits the machine's RAM/VRAM. Observe the model's license. No model is bundled, downloaded, or claimed installed.

AXES starts a dedicated `ollama serve` child on `127.0.0.1:11435`, sets `OLLAMA_NO_CLOUD=1`, and requires the runtime's cloud-disabled log confirmation before using it. Use a stable Ollama release supporting that flag and confirmation. Older or incompatible releases fail closed. An already-running service is not reused; the normal service and its settings are not modified. An occupied dedicated port disables inference rather than attaching to an unknown listener.

Missing runtime, incompatible metadata, missing models, insufficient memory, context errors, cancellation, and timeouts appear explicitly. There is no hosted-provider configuration or cloud fallback. The UI does not substitute sample answers when inference is unavailable.

## Options and behavior

| Option | Available in this slice |
|---|---|
| Origin | `KEYSTONE-ORIGIN-000001` is shown first as the supplied root reference, not newly registered here |
| Roles | 16 editable starter templates; create custom profiles; enable/disable them |
| Identity | Optional reserved, **unissued** name candidate; no automatic passport assignment |
| Inference | User-triggered local Ollama conversations; choose an installed model |
| History | Stored locally, survives restart; explicit conversation deletion |
| Avatars | Upload, replace, delete JPEG/PNG images or short H.264 MP4s; not model attachments |
| Cloud / media generation | Unsupported; no extra image/video model or automatic download |
| Autonomy / OS packaging | Deferred; no tools, scheduling, delegation, or boot image. Desktop launcher helper is included for local prototype startup |

The templates are CEO, Secretary, Governance, Memory, Planner, Researcher, Analyst, Writer, Engineer, Reviewer, QA, Security, Operations, Archivist, Learning, and Support. These are suggestions, not a canonical issued-agent roster. Template count, enabled profiles, and active inference runs are displayed separately. "Memory" means saved conversations, not semantic retrieval or automatic access to other conversations. Governance/Security profiles are prompts, not enforcement mechanisms.

### Registration and passports

Origin comes first; role profiles are subordinate local configuration. The supplied reference **KEYSTONE-ORIGIN-000001** is preserved exactly. The reserved names **XEXAR, XEXAUR, XEXPUR, XEXIAN, XEXAX, XEXXI, XEXAULA** may be manually linked as *unissued candidates* or left unassigned. Nothing assigns them by default, and multiple profile links do not establish unique registration.

**Origin ownership record:** `origin-registration-20260929-v1/ORIGIN_REGISTRATION.md` records Axel Urartu's founder/full-ownership claim, requested share 100%, and the addendum statement "Founder ownership stands here." Founder ownership is founder-asserted and recorded as established in the user's internal record. `ORIGIN_RIGHTS_REGISTER.md` describes a private, unsigned rights/evidence schedule, not an assignment or legal opinion, and distinguishes third-party assets and licensing. This app preserves that record; it does not adjudicate or transfer title. Signatures/filings and third-party, dependency, and model rights remain distinct and unverified here.

Provenance: the coordinating General Chat reviewed and relayed those rights-artifact contents; their source files are not bundled in this repository. No authoritative passport issuance ledger or app-registration proof is present here; application registration and passport issuance remain **unverified**, separately from the founder's internal ownership record. `XEXAUR-0001` is illustrative, not evidence of issuance. Local `template-*` IDs, conversation UUIDs, and run UUIDs are application records, not passport IDs. Verified registry import/issued-passport assignment is deferred until an authoritative source and format are available.

### Uploaded avatars

The user-pinned "sacred route, light of origin" direction appears as restrained gold origin rings/route details within a practical Windows-style workbench. Default initials are not generated people.

JPEG/PNG images work independently of FFmpeg through the installed `sharp` decoder. They must be single-frame, at most **12 MiB and 2048 x 2048**; they are decoded and normalized to PNG without source metadata.

Videos require separately provisioned, maintained **FFmpeg and ffprobe** executables; FFmpeg must include the H.264 `libx264` encoder. Set `AXES_FFMPEG_EXE` and `AXES_FFPROBE_EXE` to absolute paths if not on PATH. MP4 uploads must contain one H.264 video track, optional audio only, at most **25 MiB, 1920 x 1080, and 15 seconds**. Output is re-encoded locally as silent H.264 MP4 with metadata removed. Validation/transcoding has bounded subprocess timeouts and serialized processing. Playback is manual, never autoplay.

The server checks signatures, decoded metadata, dimensions/duration, and normalizes content. It does not trust extensions or browser MIME alone. SVG, GIF, WebM, remote URLs, generated media, arbitrary file attachments, and feeding avatars to inference are out of scope. Malformed or unsupported files are rejected. Missing video tools do not block image uploads.

## Rights & limits

This is practical guidance, **not legal advice**.

**Founder retention policy:** Axel directs 100% Origin ownership/control of future original Origin/AXES contributions, with no voluntary assignment, license, or transfer to agents or others unless he chooses. Maintain provenance and contributor records. This intention does not itself override pre-existing licenses, Copilot/platform terms, dependency/model/media rights, or bind contributors without an applicable agreement; it is not a clean-exclusive-title claim for every AI-assisted line. See the [ownership policy, PR rights review, and contribution record](docs/ownership-policy.md).

The existing `package.json` declares **ISC** (also present in the baseline); no first-party root LICENSE file was found, and GitHub does not detect a license. The repository is public. ISC's permissive notice and applicable public-repository/platform grants are distinct from retained ownership and cannot be silently replaced by this intention. No existing license, notice, attribution, account setting, or repository visibility has been changed; any such change needs Axel's separate approval.

- Upload only material you own or are licensed/authorized to use; check copyright, likeness, privacy, consent for identifiable people, and applicable laws. An upload does not establish ownership, transfer rights, or grant the creator of this app ownership of your material.
- Files remain on this device. The app does not send avatars to a model, CDN, or other service. You control replacement/deletion. Deletion removes the app's local record/file, not backups, browser caches outside its control, or forensic traces; it is not guaranteed secure erasure.
- Observe each model, Ollama, FFmpeg build, `sharp`/libvips, and dependency license, including redistribution and codec obligations if you later package an OS. The repository's ISC declaration is not a license to third-party models or uploaded files. No legal/compliance certification is asserted.
- SQLite, media, and backups are **plaintext** under your OS account. Use account permissions and OS disk encryption if needed. Do not store secrets you cannot protect on this computer.
- One generation runs at a time. Timeout: **120 seconds**. JSON body: **64 KiB**. Message: **8,000 characters**. Serialized conversation input: **12,000 bytes**, additionally bounded by a conservative model-context budget. Context allocation is at most **4,096 tokens** for the 16 GB CPU deployment; output at most **1,024 tokens**. Byte budgets are not exact token counts. Hardware/runtime limits can still reject a request.
- Completed conversation history is never intentionally trimmed to fit. Oversize conversations require a shorter input or new conversation. Failed/cancelled turns stay visible but are not replayed. No automatic retry; a failure never becomes a fake answer. On restart, unfinished runs are marked interrupted.
- Pairing, Host/Origin checks, and CSRF protections restrict ordinary browser access. They are not a sandbox against malware or extensions running as your user. The separate Ollama listener has no AXES pairing authentication; trusted local processes are within the trust boundary.
- **Offline-capable is not a machine-wide air gap.** Runtime installers/updaters and unrelated programs can still use the network. Provision Node, platform-specific dependencies, Ollama/model, and optional video tools beforehand. Strict air-gap operation requires disconnection or separately administered host controls. AXES does not change firewall rules or disable network adapters.

The same guidance is available in the app's **Rights & limits** dialog.

### Local command desk design and deployment status (2026-10-17)

The supplied black/gold/burgundy dashboard now guides the local interface:
Founder Desk contains Origin and the registry, Project Overview shows actual
template/enabled-profile/active-run counts, and Manager Agent contains local
readiness controls. Its name is a design heading, not a claim that a manager
agent is connected. No example traffic, financial, stability, or site figures
from the artwork are treated as telemetry. See the source-reference addendum
in [DESIGN.md](DESIGN.md).

Selecting a profile shows its exact saved local ID and unassigned or reserved,
unissued identity candidate. Existing profile IDs, instructions, enablement,
and provenance remain unchanged. The seed is 16 editable starter templates,
not an installed manifest for the founder's target of 15 distinct agents plus
Xiiom. Deploying that fleet still requires its authoritative configuration,
an available local model/runtime, and bounded action permissions; these are
not supplied by a visual redesign or the Desktop launcher. No passports are
assigned and no autonomous execution is added by this update.

### Origin-first local rollout

Reference review: [Ollama's local server guidance](https://docs.ollama.com/faq)
and [Open WebUI's persistent local UI/runtime pattern](https://docs.openwebui.com/getting-started/quick-start/)
support keeping UI state separate from model execution. This repository
reuses its existing paired Express/SQLite workspace and managed local adapter;
it does not add Docker, Open WebUI, cloud fallback, or model downloads.

Origin `KEYSTONE-ORIGIN-000001` is the established starting anchor, not a
registration blocker. The founder-directed rollout starts with OriginAI,
then the remaining distinct agents in their original registration order.
The existing OriginAI package must be preserved, not replaced by a role
template or an invented passport.

On 2026-10-17 the existing `C:\Users\Axel\OriginAI` record-reader ran
successfully: `verify` matched all 59 listed files against its retained
unsigned manifest, `status` retained the established Origin reference,
and `term x` correctly retained two separate source meanings rather than
merging them. Its existing shortcut points to its interactive console.
This verifies an already-installed **record-reader**, not connected
inference, cryptographic authenticity, or an installed fleet.

To open that existing OriginAI console:

```powershell
& 'C:\Users\Axel\OriginAI\origin-start.ps1' -Interactive
```

For repeatable read-only checks:

```powershell
& 'C:\Users\Axel\OriginAI\origin-start.ps1' -Action verify -AsJson
& 'C:\Users\Axel\OriginAI\origin-start.ps1' -Action status -AsJson
```

The package reports `modelConnected: false`. The remaining ordered rollout
needs the source-backed per-agent registration/configuration records and a
local inference/runtime contract. The reviewed register preserves AXI's
historical first-registered-origin statement, but its transcript export
receipt is not the original utterance timestamp or an executable package.
It does not establish a complete order for the later agents. Do not infer
that order from generic role seeds, reserved names, document-copy times,
or a historical profile-count summary.

No OriginAI-to-AXES adapter, new agent installation, hosted-service request,
or production cutover was performed by this verification. The existing
record-reader and the AXES local command desk remain separate surfaces.

### Independent per-user command desk installation

Unlike the worktree-dependent Desktop prototype, `scripts\install-local.ps1`
copies the command desk, provisioned dependencies, tests, Node executable,
and its license notice into a new directory. It makes no downloads or
machine-wide changes and refuses to overwrite an existing installation.
Use a Node distribution with its `LICENSE` beside `node.exe`:

```powershell
.\scripts\install-local.ps1 -NodePath 'C:\tools\node-v24.22.0-win-x64\node.exe' -InstallDirectory "$env:LOCALAPPDATA\AXES\command-desk-v1" -Port 3318
```

The example Node path must be replaced with the actual provisioned path.
The installer runs the test suite from the copied application. Start it
with the generated `Start-AXES.cmd`, then open
`http://127.0.0.1:3318/app/` and use the pairing code printed only in its
terminal. Data is kept separately at
`%LOCALAPPDATA%\AXES\local-command-desk-data`; existing Desktop prototype
data is not moved or imported. Stop with Ctrl+C in that launch terminal.
This is a local command desk installation, not a connected-agent installation.
Missing models/runtime are reported explicitly.

### Recovered source-agent configurations

The original registry and implementation were subsequently recovered through
read-only source access in `AxAxiAxes/keystone-eternal-seed`:
`docs/AXES_AGENT_ORIGIN_REGISTRY.md`,
`docs/AXI_GENESIS_OWNERSHIP_CHECKPOINT.md`, and
`apps/axiom-engine/automation-service.js` (Git blob
`a6534b2d9366e43f2f6c95177b4df98f46528bd1`).
This supersedes the earlier supplied-files-only manifest gap: five implemented
source identities exist: `memory-curator`, `project-memory-manager`,
`automation-executor`, `automation-auditor`, and `operations-observer`.
The 15-profile operating model remains a different record from those five.

`scripts\stage-agents.cjs` accepts an explicitly supplied local
`axes-source-agents-v1` manifest and the stopped app's absolute data directory.
It stages exact IDs, names, purposes, duties, historical capability names,
creator, established Origin, checkpoints, and source blob references without
overwriting existing IDs or source metadata. Source profiles appear separately
from templates and are disabled initially. Repeating an identical import
preserves operator edits. An ID/source conflict fails the entire import.
Historical capabilities are displayed as metadata, not executable permissions.
This is source-configuration staging, not restoration of the original private
runtime, registration history, memories, or tasks.

The original `defaultAgents(now)` assigns a common newly evaluated timestamp
to seeds; existing registration timestamps are retained in private state.
Consequently neither its array order nor its Git commit date establishes the
original registration sequence. Follow the established Origin and
founder-directed OriginAI-first order, then use the retained registration
state/export before ordered activation. Do not manufacture older dates,
passport issuance, or an agent identity from a template.

For a provisioned runtime and models, the installer accepts `-OllamaPath`
and `-ModelDirectory` (absolute local paths). These are recorded only in that
installation's start script; no global environment or cloud setting is changed.
To run actual inference and restart acceptance, set `AXES_OLLAMA_EXE` and
`OLLAMA_MODELS` in the current process, then run:

```powershell
.\node.exe .\scripts\verify-local.cjs --model qwen2.5:1.5b
```

Run from the installed application directory. This check uses isolated
temporary data and unused loopback ports 3319/11436, performs an actual model
response through the paired API, restarts the managed app/runtime, checks
retained response/model digest, and removes only its temporary data.
It fails rather than reporting a fake-provider success.

### Verified local setup delivery - 2026-10-17

The independent Windows installation is at
`C:\Users\erick\AppData\Local\AXES\command-desk-v2`.
Run its `Start-AXES.ps1` or `Start-AXES.cmd`, then open
`http://127.0.0.1:3318/app/`. Pair with the private code in its launch terminal.
The Desktop shortcut is `AXES Local Command Desk.lnk`; it targets that
independent installation, not the older prototype worktree.
The previous worktree preview and v1 copy are not the current installation.
The original OriginAI reader remains at `C:\Users\Axel\OriginAI`; its 59-file
manifest and commands were verified first and its files were not changed.

Explicitly authorized standalone Ollama 0.40.6 is provisioned at
`%LOCALAPPDATA%\AXES\tools\ollama-v0.40.6`; the official release archive was
checked against SHA-256
`e359637575302f288d76c0007c408a4be9c7376d59c4f28684d63b232a44b427`
before extraction. Model `qwen2.5:1.5b` is stored under
`%LOCALAPPDATA%\AXES\models`, size 986,061,892 bytes, inventory digest
`65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b`.
The provided model license is retained as `MODEL-LICENSE.txt`.
Ollama created its standard per-user `.ollama` key on first startup; no
cloud login or cloud inference was used. Runtime logs explicitly confirmed
cloud disabled. App/runtime listen only on 127.0.0.1:3318/11435.

Actual acceptance (not injected providers): the installed paired API
generated `AXES_LOCAL_READY`, saved the response, restarted app and managed
runtime, and retained the response and model digest. That check took five
seconds. A separate installed-app Edge workflow selected the actual model,
generated and saved a response through the UI, and checked desktop/mobile
layout. The installed 34-entry test suite also passed.

Five recovered source configurations are staged, **disabled**, in SQLite.
Their exact metadata is retained in installed `source-agents.json` and the
`agent_sources` table, distinct from the 16 editable templates. No original
registration timestamps, private memories, accountability histories, action
permissions, or passports were manufactured. These are installed source-linked
conversation configurations, not five activated automation agents. The source
registry establishes their identities; the inspected records do not establish
an individual timestamp order among them. Origin and OriginAI-first remain
settled; retained original timeline evidence is required for the later
ordered activation, not for their safe staging.

Before schema/source staging, the stopped v1 database was preserved at
`%LOCALAPPDATA%\AXES\local-command-desk-data\axes-before-source-staging.sqlite`.
For rollback, stop v2, preserve the current database separately, and restore
that snapshot only by an explicit operator decision before using v1.
Do not run the old v1 binary against the schema-4 database. Existing Desktop
prototype data, originals, public production, and hosted credentials were
not changed. FFmpeg/ffprobe remain unprovisioned; uploaded images work, but
real video conversion is still an explicit missing-tool state.

## Storage, backup, and configuration

Default data directory: `%LOCALAPPDATA%\AXES\axiom-engine`; database: `axes.sqlite`; normalized avatars: `media\`. The app shows the actual database path after pairing. Data is outside the checkout and is not committed.

| Variable | Purpose |
|---|---|
| `PORT` | Local app port, default 3000 |
| `AXES_DATA_DIR` | Absolute data directory override; also the future non-Windows seam |
| `AXES_OLLAMA_PORT` | Dedicated runtime loopback port, default 11435; must differ from app port |
| `AXES_OLLAMA_EXE` | Absolute path to a preinstalled Ollama executable |
| `AXES_FFMPEG_EXE`, `AXES_FFPROBE_EXE` | Absolute paths to preinstalled video tools |

No arbitrary provider URL, API credential, or cloud toggle is accepted. Data-directory locking prevents another instance from interrupting live run records. After an unexpected stop, a stale lock is recovered only when its recorded PID is no longer present. If a lock is invalid or a PID has been reused, verify that no AXES process uses the directory before manually removing `axes.lock`; do not delete a live lock.

For backup/restore, **stop AXES completely first**, then copy/restore the entire data directory (database and media together) to a private backup location. Do not copy an active SQLite file. A restored backup can restore previously deleted data; protect backups as carefully as the working directory. Do not delete or overwrite data to "fix" a storage error.

## API compatibility and validation

`GET /` retains its exact original health body. UI is at `/app/`. `POST /axiom` preserves its valid echo response and adds a deprecation header; it still performs no automation. Loopback-only binding and authenticated echo access are intentional compatibility changes. Malformed/missing JSON is rejected rather than dereferenced.

Run `npm test` (Node's built-in test runner). Tests cover API/access boundaries, role persistence, restart recovery, run limits/cancellation, local-only adapter behavior with injected fakes, identity truth, and real local image normalization. See [architecture](docs/architecture.md) for the API, threat boundary, and future OS seam.

**Verification status:** development checks use Node 24.22.0 on Windows and restored dependencies. Automated provider/video tests use fakes; they are not proof of actual inference or video transcoding. Ollama, a model, and FFmpeg/ffprobe were not installed as part of this work. A real disconnected generated-response smoke test and real video conversion remain prerequisite-dependent acceptance checks; do not interpret a green test suite or runtime health as proof they passed.
