const { test } = require("node:test");
const assert = require("node:assert/strict");
const { database } = require("./helpers.cjs");

function manifest() {
  return { schema: "axes-source-agents-v1", agents: [{
    id: "source-test-role", name: "Test sourced role", purpose: "A bounded test purpose.",
    duties: ["Review supplied test data."], capabilities: ["memory.record"],
    originCheckpoint: "test-checkpoint", originRef: "KEYSTONE-ORIGIN-000001",
    creator: "Axel Urartu (AX) · Axes Contracting",
    source: { repository: "test/source", path: "agents.js", revision: "a".repeat(40) }
  }] };
}

test("source staging preserves exact IDs/provenance, defaults disabled, and never grants historical capabilities", (t) => {
  const { store } = database(t);
  const input = manifest();
  const [profile] = store.stageAgents(input);
  assert.equal(profile.id, input.agents[0].id);
  assert.equal(profile.enabled, false);
  assert.equal(profile.template, false);
  assert.deepEqual(profile.sourceAgent, input.agents[0]);
  assert.match(profile.instructions, /metadata, not tool permissions/);
  assert.equal(profile.passport_candidate, null);
  assert.throws(() => store.createConversation({ profileId: profile.id, title: "Not activated" }), { code: "PROFILE_DISABLED" });
  store.saveProfile({ name: "Operator edit" }, profile.id);
  store.stageAgents(input);
  assert.equal(store.profile(profile.id).name, "Operator edit");
  assert.deepEqual(store.profile(profile.id).sourceAgent, input.agents[0]);
  input.agents[0].purpose = "Different source";
  assert.throws(() => store.stageAgents(input), { code: "SOURCE_CONFLICT" });
  input.agents.unshift({ ...input.agents[0], id: "another-source-role" });
  assert.throws(() => store.stageAgents(input), { code: "SOURCE_CONFLICT" });
  assert.throws(() => store.profile("another-source-role"), { code: "NOT_FOUND" });
});

test("invalid source manifests fail atomically without replacing templates or inventing registration times", (t) => {
  const { store } = database(t);
  for (const change of [
    (a) => { a.id = "template-ceo"; },
    (a) => { a.originRef = "NEW-ORIGIN"; },
    (a) => { a.source.revision = "latest"; },
    (a) => { a.registeredAt = "invented"; },
    (a) => { a.capabilities = []; }
  ]) {
    const input = manifest();
    change(input.agents[0]);
    assert.throws(() => store.stageAgents(input));
    assert.equal(store.profiles().length, 16);
  }
  const duplicate = manifest();
  duplicate.agents.push(duplicate.agents[0]);
  assert.throws(() => store.stageAgents(duplicate), /unique/);
  assert.equal(store.profiles().length, 16);
});
