const reservedNames = Object.freeze(["XEXAR", "XEXAUR", "XEXPUR", "XEXIAN", "XEXAX", "XEXXI", "XEXAULA"]);
const ownershipPolicy = Object.freeze({
  holder: "Axel Urartu",
  status: "founder_directed_retention_policy",
  scope: "Future original Origin/AXES project contributions, to the extent rights can be owned and controlled.",
  declaration: "the entire problem is to create 100 percent origin ownership, so whatever is created from this point forward is 100 percent owned and controlled by me, so far, as rights will be passed on by me or not is my choice.",
  retention: "Axel's governing policy is 100% Origin ownership and control of future original contributions: no voluntary assignment, license, or transfer to agents or others unless Axel chooses. Maintain provenance and contributor records.",
  limits: "This intended policy does not itself alter existing repository licenses, third-party licenses, Copilot/platform terms, dependency/model/media rights, or legally bind contributors without an applicable agreement. It is not proof of exclusive title to every AI-assisted line.",
  changeControl: "Changing or removing existing licenses, or changing repository visibility, requires Axel's separate approval.",
  record: "docs/ownership-policy.md"
});
const identity = Object.freeze({
  originReference: "KEYSTONE-ORIGIN-000001",
  originStatus: "founder_asserted_internal_record",
  ownership: Object.freeze({
    claimant: "Axel Urartu",
    requestedSharePercent: 100,
    status: "founder_asserted_recorded_as_established_in_internal_record",
    statement: "Founder ownership stands here.",
    sources: Object.freeze(["origin-registration-20260929-v1/ORIGIN_REGISTRATION.md", "ORIGIN_RIGHTS_REGISTER.md"]),
    provenance: "Rights-artifact contents reviewed and relayed by coordinating General Chat; source files are not bundled in this repository.",
    limits: "The rights register is a private, unsigned rights/evidence schedule, not an assignment or legal opinion. This app does not adjudicate or transfer title. Signatures, filings, and third-party/dependency/model rights remain distinct and unverified here."
  }),
  ownershipPolicy,
  appRegistration: "unverified",
  passportIssuance: "unverified",
  reservedNames,
  provenance: "User-directed context relayed by coordinating General Chat; no authoritative issuance ledger or app registration proof is present in this repository.",
  note: "Reserved names are unissued candidates, not passports. Template IDs and run IDs are local application records, not agent identities. XEXAUR-0001 is illustrative, not evidence of issuance."
});
module.exports = { identity, reservedNames, ownershipPolicy };
