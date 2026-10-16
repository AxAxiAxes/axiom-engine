const { test } = require("node:test");
const assert = require("node:assert/strict");
const { server } = require("./helpers.cjs");
const { localAccess } = require("../src/local-access");
const { limits } = require("../src/config");

test("private reads require pairing; writes require exact origin, session and CSRF", async (t) => {
  const s = await server(t);
  assert.equal((await s.request("/api/profiles")).status, 401);
  const pair = await s.pair();
  assert.match(pair.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(pair.headers.get("set-cookie"), /SameSite=Strict/i);
  assert.equal((await s.request("/api/profiles")).status, 200);
  const write = { method: "POST", body: JSON.stringify({ profileId: "template-ceo", title: "Hello" }) };
  assert.equal((await s.request("/api/conversations", { ...write, headers: { "X-AXES-CSRF": "" } })).status, 403);
  assert.equal((await s.request("/api/conversations", { ...write, headers: { Origin: "https://evil.invalid" } })).status, 403);
  assert.equal((await s.request("/api/conversations", { ...write, headers: { Origin: "null" } })).status, 403);
  assert.equal((await s.request("/api/conversations", { ...write, headers: { Origin: "" } })).status, 403);
  assert.equal((await s.request("/api/conversations", write)).status, 201);
  const rejected = await new Promise((resolve, reject) => {
    require("node:http").get(`${s.origin}/api/profiles`, { headers: { Host: "evil.invalid" } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    }).on("error", reject);
  });
  assert.equal(rejected, 403);
});

test("pairing is bounded; Unicode input is a safe authentication failure", async (t) => {
  const s = await server(t);
  for (let i = 0; i < 5; i++) {
    assert.equal((await s.request("/api/session", { method: "POST", body: JSON.stringify({ code: "é".repeat(17) }) })).status, 401);
  }
  assert.equal((await s.request("/api/session", { method: "POST", body: JSON.stringify({ code: "wrong" }) })).status, 429);
});

test("headers enforce local-only resource policy and logout revokes access", async (t) => {
  const s = await server(t);
  await s.pair();
  const response = await s.request("/api/profiles");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal((await s.request("/api/session", { method: "DELETE", body: "{}" })).status, 204);
  assert.equal((await s.request("/api/status")).status, 401);
});

test("sessions expire without persisting authentication secrets", () => {
  let now = 0;
  const access = localAccess({ pairingCode: "code", now: () => now });
  let token;
  const res = { cookie: (name, value) => { token = value; }, json: () => {} };
  access.pair({ body: { code: "code" } }, res, (error) => { throw error; });
  let result;
  const req = { method: "GET", headers: { cookie: `axes_session=${token}` } };
  access.authenticate(req, {}, (error) => { result = error; });
  assert.equal(result, undefined);
  now = limits.sessionMs;
  access.authenticate(req, {}, (error) => { result = error; });
  assert.equal(result.code, "PAIRING_REQUIRED");
});
