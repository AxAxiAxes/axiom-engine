# AXES workbench design

The local `/app/` surface is an Operate-mode workbench, not a marketing site. The owner works on a Windows PC in ordinary daylight; light neutral surfaces and system UI typography make long settings/conversation sessions legible.

## Identity and hierarchy

Origin is the first registry record, above the subordinate role list. Preserve `KEYSTONE-ORIGIN-000001` and accurately label Axel Urartu's founder ownership as founder-asserted and recorded as established in the internal record, requested share 100%. Do not negate that record or imply this app adjudicates/transfers title. App registration, passport issuance, signatures/filings, and third-party rights remain separate; do not invent issued passports or independent agents.

The user-pinned "sacred route, light of origin" treatment is a restrained gold circular origin around initials/uploaded profile media and a route-line motif in empty states. It is not a spiritual capability claim. Gold is reserved for origin identity/focus; blue is the task/action accent.

## Visual system

- Typeface: Segoe UI, system-ui, sans-serif. Use monospace only for actual IDs and filesystem paths.
- Surfaces: cool gray `#edf1f5`, near-white header `#f9fbfd`, white conversation canvas. Primary text `#203043`; secondary `#536276`; dividers `#cbd4df`.
- Actions: `#145cab` blue with white text; gold/brown `#926720` origin details and `#a66800` focus. Ready state uses green plus text; unavailable state uses amber plus text, never color alone.
- Small 5px control corners, 8px major dialog/pairing corners, 1px dividers; avoid decorative card grids and glowing dashboards.
- Conversation body uses comfortable line-height and a maximum readable measure. Long model/profile text wraps and is always rendered as text, not interpreted HTML.

## Composition and behavior

Desktop has a searchable role rail, primary conversation workspace, and compact setup sidebar. At intermediate widths setup moves below; at 700px and below the registry becomes a horizontally scrollable role strip above the conversation. The document must not overflow horizontally at a 390px viewport.

Profile editing is inline, not a modal. Only the Rights & limits help uses a dialog. Unsaved role edits prompt before dismissal/navigation. Runtime/model readiness gates generation, not registry/history/image management. Model choice has no silent default. Pairing/session secrets are not stored in browser storage.

Uploaded videos are manually played with controls, muted, and never autoplay. Uploaded media represents a profile; it is not model input. Missing video tools do not block images.

## States and access

Maintain visible pairing, first-run/no-selection, empty conversation, unavailable runtime/model, disabled role, edited/saved/invalid profile, generation/busy/cancel/failure, and interrupted-run states. Template count, enabled profiles and active runs remain separate.

Semantic forms, visible 3px keyboard focus, a skip link, labeled controls, status announcements, and reduced-motion support are part of the interface. The single origin arrival effect is bounded and removed for reduced motion.

Desktop/narrow browser interaction and screenshot review used real image normalization and an explicitly injected test provider for conversation/cancellation; that is not proof of real model inference or FFmpeg compatibility.
