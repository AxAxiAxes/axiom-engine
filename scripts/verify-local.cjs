const assert = require("node:assert/strict");
const { parseArgs } = require("node:util");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

async function verify() {
  const { values } = parseArgs({ options: {
    model: { type: "string" },
    port: { type: "string", default: "3319" },
    "runtime-port": { type: "string", default: "11436" }
  } });
  assert.ok(values.model, "Supply --model with an installed local model name.");
  assert.ok(process.env.AXES_OLLAMA_EXE, "Set AXES_OLLAMA_EXE to the provisioned runtime.");
  const directory = mkdtempSync(path.join(tmpdir(), "axes-real-verification-"));
  process.env.AXES_DATA_DIR = directory;
  process.env.PORT = values.port;
  process.env.AXES_OLLAMA_PORT = values["runtime-port"];
  const { main } = require("../index");
  let app;
  const started = Date.now();
  const origin = `http://127.0.0.1:${values.port}`;
  let cookie;
  let csrf;
  async function request(route, body) {
    const response = await fetch(origin + route, {
      method: body === undefined ? "GET" : "POST",
      headers: { Origin: origin, Cookie: cookie || "", "X-AXES-CSRF": csrf || "", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(130000)
    });
    const result = await response.json();
    assert.ok(response.ok, JSON.stringify(result));
    return { result, response };
  }
  async function start() {
    app = await main({ log: () => {} });
    const paired = await request("/api/session", { code: app.access.pairingCode });
    cookie = paired.response.headers.get("set-cookie").split(";")[0];
    csrf = paired.result.csrf;
    const deadline = Date.now() + 20000;
    while (!app.provider.status().ready && Date.now() < deadline) await delay(100);
    assert.equal(app.provider.status().ready, true, JSON.stringify(app.provider.status()));
    return app.provider.verify(values.model);
  }
  try {
    const model = await start();
    const { result: conversation } = await request("/api/conversations", { profileId: "template-support", title: "Real local inference verification" });
    const { result: run } = await request(`/api/conversations/${conversation.id}/runs`, {
      model: values.model, input: "Reply with only the text AXES_LOCAL_READY. Do not add an explanation."
    });
    const deadline = Date.now() + 125000;
    let current;
    do {
      await delay(250);
      current = (await request(`/api/runs/${run.id}`)).result;
    } while (["pending", "running"].includes(current.status) && Date.now() < deadline);
    assert.equal(current.status, "completed", JSON.stringify(current));
    const history = (await request(`/api/conversations/${conversation.id}`)).result;
    const answer = history.messages.find((message) => message.role === "assistant");
    assert.ok(answer?.content.includes("AXES_LOCAL_READY"), "Real model did not return the requested verification phrase.");
    await app.shutdown();
    app = null;
    const restartedModel = await start();
    assert.equal(restartedModel.digest, model.digest);
    const retained = (await request(`/api/conversations/${conversation.id}`)).result;
    assert.equal(retained.messages.find((message) => message.role === "assistant")?.content, answer.content);
    assert.equal(retained.runs.find((entry) => entry.id === run.id)?.status, "completed");
    console.log(JSON.stringify({
      status: "passed", runtime: app.provider.status(), model: model.name, digest: model.digest,
      realGeneration: true, retainedAfterRestart: true, cloudFallback: false,
      elapsedSeconds: Math.round((Date.now() - started) / 1000),
      scope: "Actual local model through paired app API with a starter profile; not a registered-agent fleet test."
    }, null, 2));
  } finally {
    if (app) await app.shutdown();
    rmSync(directory, { recursive: true, force: true });
  }
}

verify().catch((error) => { console.error(error.message); process.exitCode = 1; });
