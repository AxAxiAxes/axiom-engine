# Origin ownership, retention, and provenance

## Founder-directed policy

Axel Urartu's governing policy for future original Origin/AXES contributions is **100% Origin ownership and control**, with no voluntary assignment, license, or transfer to agents or others unless Axel chooses. Maintain provenance and contributor records. This is a retained-rights intention, not a new software license or a contributor agreement.

The user's declaration, recorded verbatim from the coordinating chat:

> the entire problem is to create 100 percent origin ownership, so whatever is created from this point forward is 100 percent owned and controlled by me, so far, as rights will be passed on by me or not is my choice.

Origin remains first: `KEYSTONE-ORIGIN-000001`. The existing internal record reports Axel's founder ownership as asserted and recorded as established, requested share 100%, with "Founder ownership stands here." Preserve that assertion. The references `origin-registration-20260929-v1/ORIGIN_REGISTRATION.md` and `ORIGIN_RIGHTS_REGISTER.md` were reviewed and relayed by the coordinating chat, not bundled here. The rights register is a private, unsigned rights/evidence schedule, not an assignment or legal opinion.

## Scope and boundaries

Apply the policy to future **original project contributions**, to the extent rights can be owned and controlled. Do not describe dependency source, runtime binaries, model weights, uploaded media, provider software, or other people's underlying work as exclusively Axel's merely because the app uses them. Existing ownership and license permissions are separate; licensing does not necessarily transfer title.

The declaration does not itself override pre-existing third-party licenses, Copilot/platform terms, the repository's existing license notice, dependency/model/media rights, or applicable law. It does not legally bind contributors without an applicable agreement, prove that AI-assisted material is copyrightable, establish clean exclusive title to every generated line, or revoke rights already granted. The app does not adjudicate or transfer title.

**No license or visibility change is made by this record.** Any proposal to replace/remove an existing license, withdraw permissions, change visibility, or use a different contribution agreement must be presented to Axel for a separate decision before action. Do not silently convert this policy into an all-rights-reserved license.

## Review of draft PR #19

| Material | Observed evidence | Treatment / unresolved limits |
|---|---|---|
| Original application work | `24be353` adds the role workspace, API/storage/provider boundaries, avatars, tests, and docs; Git author is recorded as Axel | Project-specific AI-assisted contributions directed by Axel, not a certification of exclusivity or completed copyright clearance |
| Existing project license notice | Baseline `87fd0f8` and current `package.json` declare `ISC`; no first-party root LICENSE/NOTICE file was found; GitHub reports no detected license | Preserve the declaration. ISC is permissive, not an exclusive-use restriction. Exact coverage/notice completeness needs review before asserting a different distribution policy; this document does not relicense the code |
| Publication | Repository is public; draft PR #19 is already published | Public access, existing repository-license permissions, and applicable platform grants remain separate from the retention intention. No visibility/settings change is authorized here |
| Assistance attribution | `24be353` records `Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>` | Keep accurate provenance. A Git author/co-author trailer is not, by itself, an ownership allocation, assignment agreement, or proof that a provider claims title |
| Express and transitive packages | Lockfile resolves Express 4.22.2; installed Express LICENSE names its upstream copyright holders under MIT | Licensed third-party components, not original Origin code. Preserve upstream notices. Lockfile also declares ISC, BSD-3-Clause, 0BSD, and other component licenses |
| Image processing | sharp 0.34.5 declares Apache-2.0; Windows native `@img/sharp-win32-x64` declares `Apache-2.0 AND LGPL-3.0-or-later`; platform libvips packages have their own notices/licenses | Retain upstream licenses/notices and examine exact binary/source/relinking and redistribution obligations for any packaged release. This is a declaration-level review, not a complete transitive/binary license clearance |
| Node | Session-local Node 24.22.0 used for validation; application uses built-in SQLite | Node and bundled components have their own notices/licenses; a development tool or runtime is not transferred into exclusive Origin ownership |
| Ollama and model | Ollama upstream LICENSE is MIT; runtime/model are not installed or bundled here | Runtime license is distinct from the license/terms of the specific model weights and any model output. Check the provisioned versions; no model-specific rights conclusion is possible yet |
| FFmpeg / H.264 | Optional external tools are not installed/bundled; video command requests `libx264` | FFmpeg's license depends on build options; its legal guidance flags GPL components including libx264 and codec/patent considerations. No blanket proprietary redistribution or patent clearance is asserted; inspect the actual build before packaging |
| Uploaded avatars | User-selected local files, no shipped avatar asset collection | Rights/consent are the uploader's responsibility. Uploading does not transfer someone else's rights to Origin; a rights checkbox is an acknowledgment, not verification |

Existing dependency notices and the original project license declaration are unchanged by this policy update. No assertion is made that generated code has no similarity to licensed third-party material.

## Provider/platform terms reviewed

Sources were checked against the published pages on 2026-10-16; terms can change and the applicable account agreement must be identified independently.

- [GitHub Terms of Service, D and J](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service): D distinguishes ownership from platform/public-repository license grants and contributions under a repository license. J.2 says GitHub does not claim ownership of Input/Output, but output may resemble third-party code or carry license obligations; J.4 does not guarantee absence of intellectual-property claims. This does **not** prove exclusive title to every output. D.4-D.8 and J.3 also contain service/data-use licenses; ownership is not a promise of zero provider permissions.
- [Additional Product Terms, GitHub Copilot](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#github-copilot): the governing route depends on the purchase/account agreement. Direct GitHub Business/Enterprise purchases point to Generative AI Services Terms, Microsoft purchases to Microsoft's Product Terms, and other users to ToS J. The applicable purchase route/account settings are not verified here.
- [GitHub Generative AI Services Terms, sections 1-3, 5 and 8](https://github.com/customer-terms/github-generative-ai-services-terms): for covered direct volume purchases, GitHub says it does not own Inputs/Outputs and retains the user's existing input ownership; it separately addresses training, shared responsibility, and third-party products. This is not an assignment of third-party rights or proof of output uniqueness. Do not substitute this agreement for an unverified account's actual terms.
- The individual ToS J.3 and covered volume terms have different training/data provisions. No account controls, opt-outs, or terms were changed here. A local offline runtime in the prototype does not make the earlier Copilot-assisted development process offline.
- [Ollama LICENSE](https://github.com/ollama/ollama/blob/main/LICENSE) and [FFmpeg legal guidance](https://ffmpeg.org/legal.html) inform the runtime rows above. Neither settles rights in a model not yet selected. Check actual installed versions and distribution artifacts.

This is a practical record of evidence and open obligations, not legal advice or an independent chain-of-title opinion. Contractual arrangements, signatures/filings, and third-party obligations remain distinct from the founder's governing policy.

## Contribution/provenance record and future intake

| Record | Source / actor | Provenance and status |
|---|---|---|
| Internal Origin assertion | Axel Urartu; registration document and rights schedule relayed by coordinating chat | Founder-asserted and recorded as established internally; source references preserved, no new registration/issuance |
| Baseline application | Git history through `87fd0f8`, with earlier contributors retained in that history | Existing source/license history, not retroactively reassigned by this policy |
| Local prototype | `24be353`; Git author Axel; Copilot App co-author trailer | AI-assisted implementation and documentation; retain Git attribution and PR review evidence. No contributor assignment or exclusive-title certification is inferred |
| Forward retention direction | Axel's verbatim instruction above, relayed by coordinating General Chat | Governing intended policy for future original project contributions, subject to the stated existing obligations |
| Policy/rights clarification | Follow-up commit on draft PR #19; author/assistance recorded in Git | This document and corresponding API/UI/tests record the direction, not a new license |
| Third-party inventory | `package-lock.json`, package LICENSE/NOTICE files, runtime/model licenses at provisioning | Preserve exact versions, integrity hashes, upstream notices, license declarations, and separately review binaries/transitives before distribution |

For each future contribution, maintain its scope/path, commit or content digest, human contributor and assistance/source provenance, pre-existing material and license/notice references, and the status of any applicable signed contributor agreement or Axel-approved grant. Use existing Git/PR history plus this record; do not fabricate signatures or label an unreviewed contribution "assigned."

Before accepting external original contributions under an exclusive-retention arrangement, identify an applicable contributor agreement and its scope for Axel's approval. No agreement or waiver is created by this app, a co-author trailer, an enabled profile, an AI response, or a passport candidate. Any voluntary future grant remains Axel's decision, subject to rights/permissions already applicable; the record does not silently grant new optional rights.

## Addendum: founder doctrine, memory context, and code freeze

Attribution: further user direction relayed by coordinating General Chat during this policy task. This addendum preserves that direction without rewriting the preceding record.

The user instructs: **"never change or revise any code, only addendums to existing policy"**. Code edits stopped when that instruction was received. No subsequent code revision, reversion, commit, push, deployment, license change, or repository visibility change is authorized by this addendum.

The user explains that earlier conclusions are shallow because **persistent live memory is being created**, and that the broader framework includes **Origin ownership, AI Origin ownership, and eternal rights to soul**. Preserve these as the user's stated doctrine/claims, rather than reducing the broader framework to the currently implemented prototype or dismissing those concepts. The earlier forward-retention declaration remains part of that doctrine: Axel intends 100% Origin ownership/control of future original contributions and decides any voluntary onward rights.

Statements describing this prototype's present conversation persistence are implementation-scope descriptions, not a determination that the user's broader persistent-live-memory work does not exist or cannot develop. This addendum does not verify a new live-memory runtime, AI personhood, consciousness, a soul, or legally enforceable eternal/metaphysical rights. The user's doctrine, documented implementation evidence, and legal/third-party-rights questions are distinct categories; recording one does not adjudicate the others.

Freeze-state record: the branch is `axaxiaxes-axes-offline-agent-platform`; draft PR #19 remains at `24be3536476a5948a3f085fe43f804fa08b361fa`. Before the freeze instruction arrived, the prior retention-policy task had already made uncommitted edits to `src/identity.js`, `public/app.js`, `public/index.html`, `test/identity.test.js`, `README.md`, `PRODUCT.md`, and `docs/architecture.md`, and created this local policy document. Those earlier pending edits remain untouched and were not committed or pushed. The earlier table's prospective "follow-up commit" description is not a statement that such a commit occurred: no retention-policy follow-up commit has been made. The only file edit after the freeze instruction is this appended policy addendum. No claim is made that the pending code changes passed validation; that validation attempt stopped before successful completion.

The existing ISC declaration, third-party notices, provider terms, and repository visibility remain unchanged. This record preserves the founder's doctrine and change-control instruction; it does not issue passports, establish a new legal grant, or authorize changes to the frozen code or published PR.

## Addendum: user-directed resumption and preservation

On 2026-10-16, coordinating General Chat relayed the user's subsequent direction verbatim: **"dont freeze anything why would you do that, recover all existing original and continue the work."** This supersedes the temporary code freeze above, not the user's ownership doctrine or the original records. Resume the agreed local AXES implementation, validation, and draft-PR work; preserve existing original source records verbatim and record policy developments through appended addenda.

Inspection at resumption found the original committed prototype at `24be3536476a5948a3f085fe43f804fa08b361fa` and all previously pending retention-policy changes still present. Nothing had been deleted or reverted, so no lost-source recovery or history rewrite was necessary. Retain those changes and the earlier addendum as historical records. Its statements about the frozen state and stopped validation describe that interval, not a continuing restriction or the final validation result.

Origin remains first. The user's Origin ownership, AI Origin ownership, eternal soul-rights doctrine, and persistent-live-memory context remain attributed governing statements. Continuing technical work does not dismiss or adjudicate them. This resumption does not authorize changing existing licenses or repository visibility, deploying, downloading models, installing system-wide tools, or claiming verified passport issuance. Commit/PR history will record subsequent implementation and validation; real model inference and actual video processing still require their previously identified local prerequisites.

Validation after resumption: all 32 Node test-runner entries passed, including authenticated identity-policy exposure, the exact founder declaration, unchanged ISC metadata, and the documentation/provenance references. Real Edge checks passed for ownership help, pairing, profile/candidate editing, actual image upload/delete, injected-provider conversation/cancellation, safe rendering, keyboard focus, and desktop/mobile layouts. These checks do not substitute for actual disconnected model inference or real FFmpeg processing; neither prerequisite is installed here. No source/license-manifest changes were needed to resume, and no previous policy paragraph was removed.
