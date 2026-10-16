const { test } = require("node:test");
const assert = require("node:assert/strict");
const { database, server } = require("./helpers.cjs");
const { identity, reservedNames } = require("../src/identity");

test("Origin is preserved, reserved spellings are exact, and no passports are auto-assigned", (t) => {
  const { store } = database(t);
  assert.equal(identity.originReference, "KEYSTONE-ORIGIN-000001");
  assert.equal(identity.appRegistration, "unverified");
  assert.equal(identity.passportIssuance, "unverified");
  assert.equal(identity.ownership.claimant, "Axel Urartu");
  assert.equal(identity.ownership.requestedSharePercent, 100);
  assert.equal(identity.ownership.statement, "Founder ownership stands here.");
  assert.equal(identity.ownership.status, "founder_asserted_recorded_as_established_in_internal_record");
  assert.deepEqual(identity.ownership.sources, ["origin-registration-20260929-v1/ORIGIN_REGISTRATION.md", "ORIGIN_RIGHTS_REGISTER.md"]);
  assert.match(identity.ownership.limits, /not an assignment or legal opinion/);
  assert.deepEqual(reservedNames, ["XEXAR", "XEXAUR", "XEXPUR", "XEXIAN", "XEXAX", "XEXXI", "XEXAULA"]);
  assert.ok(store.profiles().every((p) => p.passport_status === "unassigned" && p.passport_candidate === null));
  const p = store.saveProfile({ passport_candidate: "XEXAUR" }, "template-ceo");
  assert.equal(p.id, "template-ceo");
  assert.equal(p.passport_status, "reserved_unissued");
  assert.equal(p.passport_candidate, "XEXAUR");
  assert.equal(p.passport_id, undefined);
  assert.throws(() => store.saveProfile({ passport_candidate: "XEXAUR-0001" }, p.id), { code: "INVALID_IDENTITY" });
  assert.throws(() => store.saveProfile({ passport_id: "invented" }, p.id), { code: "INVALID_INPUT" });
  assert.throws(() => store.saveProfile({ passport_status: "issued" }, p.id), { code: "INVALID_INPUT" });
});

test("identity provenance is available only after local pairing", async (t) => {
  const s = await server(t);
  assert.equal((await s.request("/api/identity")).status, 401);
  await s.pair();
  const data = await (await s.request("/api/identity")).json();
  assert.match(data.provenance, /no authoritative issuance ledger/);
  assert.equal(data.originStatus, "founder_asserted_internal_record");
});
