const reservedNames = Object.freeze(["XEXAR", "XEXAUR", "XEXPUR", "XEXIAN", "XEXAX", "XEXXI", "XEXAULA"]);
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
  appRegistration: "unverified",
  passportIssuance: "unverified",
  reservedNames,
  provenance: "User-directed context relayed by coordinating General Chat; no authoritative issuance ledger or app registration proof is present in this repository.",
  note: "Reserved names are unissued candidates, not passports. Template IDs and run IDs are local application records, not agent identities. XEXAUR-0001 is illustrative, not evidence of issuance."
});
module.exports = { identity, reservedNames };
