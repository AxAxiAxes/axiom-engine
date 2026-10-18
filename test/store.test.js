const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { Store } = require("../src/store");
const { DatabaseSync } = require("node:sqlite");
const { database } = require("./helpers.cjs");

test("16 unique labeled templates, enablement and edits persist without reseeding", (t) => {
  const { store } = database(t);
  const profiles = store.profiles();
  assert.equal(profiles.length, 16);
  assert.equal(new Set(profiles.map((p) => p.id)).size, 16);
  assert.ok(profiles.every((p) => p.template && p.instructions.includes("template")));
  store.saveProfile({ name: "My CEO", enabled: false }, "template-ceo");
  assert.equal(store.profile("template-ceo").name, "My CEO");
  assert.equal(store.profile("template-ceo").enabled, false);
  assert.throws(() => store.createConversation({ profileId: "template-ceo", title: "test" }), { code: "PROFILE_DISABLED" });
  assert.throws(() => store.saveProfile({ enabled: "false" }, "template-ceo"), { code: "INVALID_INPUT" });
  assert.throws(() => store.saveProfile({ unexpected: 1 }, "template-ceo"), { code: "INVALID_INPUT" });
});

test("restart preserves edits/messages/snapshots and interrupts unfinished runs", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "axes-restart-"));
  let store = new Store(dir);
  try {
    store.saveProfile({ name: "My CEO" }, "template-ceo");
    const c = store.createConversation({ profileId: "template-ceo", title: "Planning" });
    const run = store.startRun(c.id, "Hello", "local:test", "a".repeat(64), "Old instructions");
    store.saveProfile({ instructions: "New instructions" }, "template-ceo");
    assert.throws(() => new Store(dir), /Another AXES process/);
    store.close();
    store = new Store(dir);
    assert.equal(store.profile("template-ceo").name, "My CEO");
    assert.equal(store.profiles().length, 16);
    assert.equal(store.run(run.id).instructions, "Old instructions");
    assert.equal(store.run(run.id).status, "interrupted");
    assert.equal(store.conversation(c.id).messages[0].content, "Hello");
    store.deleteConversation(c.id);
    assert.throws(() => store.run(run.id), { code: "NOT_FOUND" });
    assert.equal(store.db.prepare("SELECT count(*) AS n FROM messages").get().n, 0);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("corrupt storage fails explicitly rather than replacing the file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "axes-corrupt-"));
  try {
    writeFileSync(path.join(dir, "axes.sqlite"), "not a database");
    assert.throws(() => new Store(dir));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("profile validation, custom profile creation and missing records", (t) => {
  const { store } = database(t);
  const custom = store.saveProfile({ name: "Custom", purpose: "Purpose", instructions: "Instructions" });
  assert.equal(custom.template, false);
  assert.equal(custom.enabled, true);
  assert.throws(() => store.saveProfile({ name: "", purpose: "p", instructions: "i" }), { code: "INVALID_INPUT" });
  assert.throws(() => store.conversation("absent"), { code: "NOT_FOUND" });
});

test("earlier schema migrates transactionally and newer schema is not replaced", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "axes-migration-"));
  let store;
  try {
    const db = new DatabaseSync(path.join(dir, "axes.sqlite"));
    db.exec(require("node:fs").readFileSync(path.join(__dirname, "..", "src", "migrations", "001-initial.sql"), "utf8"));
    db.close();
    store = new Store(dir);
    assert.equal(store.db.prepare("PRAGMA user_version").get().user_version, 4);
    assert.ok(store.profiles().every((p) => p.passport_status === "unassigned"));
    store.db.exec("PRAGMA user_version = 999;");
    store.close();
    store = null;
    assert.throws(() => new Store(dir), /newer than this app/);
    const unchanged = new DatabaseSync(path.join(dir, "axes.sqlite"));
    assert.equal(unchanged.prepare("PRAGMA user_version").get().user_version, 999);
    unchanged.close();
  } finally { store?.close(); rmSync(dir, { recursive: true, force: true }); }
});
