const { test } = require("node:test");
const assert = require("node:assert/strict");
const { setTimeout: delay } = require("node:timers/promises");
const { Runs } = require("../src/runs");
const { database, fakeProvider } = require("./helpers.cjs");
const { AppError } = require("../src/errors");

function setup(t, options) {
  const { store } = database(t);
  const provider = fakeProvider();
  const runs = new Runs(store, provider, options);
  t.after(() => runs.stop());
  const conversation = store.createConversation({ profileId: "template-ceo", title: "Test" });
  return { store, provider, runs, conversation };
}

test("only one generation can run, cancellation is persisted and not replayed", async (t) => {
  const { store, provider, runs, conversation: c } = setup(t);
  provider.generate = async (model, messages, signal) => { await delay(1000, null, { signal }); return "Unexpected"; };
  const run = await runs.start(c.id, { input: "Cancel me", model: "local:test" });
  await assert.rejects(runs.start(c.id, { input: "Another", model: "local:test" }), { code: "BUSY" });
  const done = runs.active.done;
  runs.cancel(run.id);
  await done;
  assert.equal(store.run(run.id).status, "cancelled");
  let replay;
  provider.generate = async (m, messages) => { replay = messages; return "Answer"; };
  await runs.start(c.id, { input: "New turn", model: "local:test" });
  await runs.active?.done;
  assert.equal(replay.length, 2);
  assert.equal(replay[1].content, "New turn");
  assert.equal(store.conversation(c.id).messages.length, 3);
});

test("timeout and provider errors save an explicit failure, never an assistant answer", async (t) => {
  const { store, provider, runs, conversation: c } = setup(t, { runMs: 15 });
  provider.generate = async (model, messages, signal) => { await delay(1000, null, { signal }); return "Unexpected"; };
  const run = await runs.start(c.id, { input: "Slow", model: "local:test" });
  await runs.active.done;
  assert.equal(store.run(run.id).error_code, "TIMEOUT");
  assert.equal(store.conversation(c.id).messages.length, 1);
  provider.generate = async () => { throw new AppError("CONTEXT_TOO_LARGE", "Too large", 413); };
  const second = await runs.start(c.id, { input: "Again", model: "local:test" });
  await runs.active?.done;
  assert.equal(store.run(second.id).error_code, "CONTEXT_TOO_LARGE");
});

test("completed history is retained; oversized context is rejected, not truncated", async (t) => {
  const { store, provider, runs, conversation: c } = setup(t);
  await runs.start(c.id, { input: "First", model: "local:test" });
  await runs.active?.done;
  let replay;
  provider.generate = async (m, messages) => { replay = messages; return "Second answer"; };
  await runs.start(c.id, { input: "Second", model: "local:test" });
  await runs.active?.done;
  assert.deepEqual(replay.map((m) => m.role), ["system", "user", "assistant", "user"]);
  provider.verify = async () => ({ name: "small", digest: "a".repeat(64), context: 2048 });
  await assert.rejects(runs.start(c.id, { input: "x".repeat(3000), model: "small" }), { code: "CONTEXT_TOO_LARGE" });
  assert.equal(store.conversation(c.id).runs.length, 2);
});

test("disabled profiles and missing models cannot create a run", async (t) => {
  const { store, provider, runs, conversation: c } = setup(t);
  store.saveProfile({ enabled: false }, "template-ceo");
  await assert.rejects(runs.start(c.id, { input: "Hi", model: "test" }), { code: "PROFILE_DISABLED" });
  store.saveProfile({ enabled: true }, "template-ceo");
  provider.verify = async () => { throw new AppError("LOCAL_MODEL_REQUIRED", "Missing", 409); };
  await assert.rejects(runs.start(c.id, { input: "Hi", model: "test" }), { code: "LOCAL_MODEL_REQUIRED" });
  assert.equal(store.conversation(c.id).runs.length, 0);
});
