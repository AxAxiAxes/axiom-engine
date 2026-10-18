const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { Store } = require("../src/store");
const { Runs } = require("../src/runs");
const { createApp } = require("../src/app");
const { localAccess } = require("../src/local-access");

function database(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "axes-test-"));
  const store = new Store(dir);
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  return { store, dir };
}

function fakeProvider() {
  return {
    status: () => ({ ready: true, code: "TEST_ONLY", message: "Test provider" }),
    models: async () => [{ name: "local:test", digest: "a".repeat(64), size: 1 }],
    verify: async (name) => ({ name, digest: "a".repeat(64), context: 16384 }),
    generate: async () => "Test response"
  };
}

async function server(t, { media } = {}) {
  const { store, dir } = database(t);
  const provider = fakeProvider();
  const runs = new Runs(store, provider);
  const access = localAccess({ pairingCode: "test-pairing-code" });
  const app = createApp({ store, provider, runs, access, media: media?.(dir, store), log: () => {} }).app;
  const listener = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const origin = `http://127.0.0.1:${listener.address().port}`;
  t.after(async () => {
    await runs.stop();
    listener.closeAllConnections();
    await new Promise((resolve) => listener.close(resolve));
  });
  let cookie = "";
  let csrf = "";
  const request = async (url, options = {}) => {
    const headers = { Origin: origin, Cookie: cookie, "X-AXES-CSRF": csrf, ...options.headers };
    if (options.body && !Buffer.isBuffer(options.body)) headers["Content-Type"] ||= "application/json";
    return fetch(origin + url, { ...options, headers });
  };
  const pair = async () => {
    const r = await request("/api/session", { method: "POST", body: JSON.stringify({ code: access.pairingCode }) });
    cookie = r.headers.get("set-cookie").split(";")[0];
    csrf = (await r.json()).csrf;
    return r;
  };
  return { store, dir, provider, runs, request, pair, origin, listener };
}

module.exports = { database, fakeProvider, server };
