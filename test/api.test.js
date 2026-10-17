const { test } = require("node:test");
const assert = require("node:assert/strict");
const { server } = require("./helpers.cjs");
const { config } = require("../src/config");

test("legacy health and authenticated echo contract remain, UI is at /app/", async (t) => {
  const s = await server(t);
  assert.equal(s.listener.address().address, "127.0.0.1");
  const health = await s.request("/");
  assert.equal(await health.text(), '{"status":"AXIOM engine online"}');
  const ui = await s.request("/app/");
  const html = await ui.text();
  assert.match(html, /Rights &amp; limits/);
  for (const heading of ["Founder Desk", "Project Overview", "Manager Agent"]) assert.ok(html.includes(heading));
  for (const id of ["overview-templates", "overview-enabled", "overview-runs", "profile-identity"]) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /not a verified installation of that fleet/);
  assert.match(html, /not a connected manager agent/);
  assert.equal((await s.request("/axiom", { method: "POST", body: '{"action":"ping","payload":{}}' })).status, 401);
  await s.pair();
  const echo = await s.request("/axiom", { method: "POST", body: '{"action":"ping","payload":{"test":1}}' });
  assert.equal(echo.headers.get("deprecation"), "true");
  assert.deepEqual(await echo.json(), { engine: "AXIOM", actionReceived: "ping", payloadReceived: { test: 1 }, status: "processed" });
  assert.equal((await s.request("/axiom", { method: "POST", body: "{}" })).status, 400);
});

test("API validates JSON, size, types and unknown fields; run completes and deletes", async (t) => {
  const s = await server(t);
  await s.pair();
  assert.equal((await s.request("/api/profiles", { method: "POST", body: "{" })).status, 400);
  assert.equal((await s.request("/api/profiles", { method: "POST", body: JSON.stringify({ name: "x".repeat(66000) }) })).status, 413);
  assert.equal((await s.request("/api/profiles", { method: "POST", body: "x", headers: { "Content-Type": "text/plain" } })).status, 415);
  const response = await s.request("/api/conversations", { method: "POST", body: '{"profileId":"template-memory","title":"Test"}' });
  const c = await response.json();
  assert.equal(response.status, 201);
  const started = await s.request(`/api/conversations/${c.id}/runs`, { method: "POST", body: '{"input":"hello","model":"local:test"}' });
  assert.equal(started.status, 202);
  const run = await started.json();
  await s.runs.active?.done;
  assert.equal((await (await s.request(`/api/runs/${run.id}`)).json()).status, "completed");
  const conversation = await (await s.request(`/api/conversations/${c.id}`)).json();
  assert.deepEqual(conversation.messages.map((m) => m.role), ["user", "assistant"]);
  const status = await (await s.request("/api/status")).json();
  assert.deepEqual(status.counts, { templates: 16, enabledProfiles: 16, activeRuns: 0 });
  assert.equal((await s.request(`/api/conversations/${c.id}`, { method: "DELETE", body: "{}" })).status, 204);
  assert.equal((await s.request(`/api/conversations/${c.id}`)).status, 404);
});

test("config rejects nonlocal config shortcuts and invalid ports/relative data", () => {
  assert.throws(() => config({ PORT: "0", AXES_DATA_DIR: "relative" }), /Ports/);
  assert.throws(() => config({ PORT: "3000", AXES_OLLAMA_PORT: "3000", AXES_DATA_DIR: "relative" }), /differ/);
  assert.throws(() => config({ AXES_DATA_DIR: "relative" }), /absolute/);
});
