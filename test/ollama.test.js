const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const { Ollama, localModel } = require("../src/providers/ollama");
const { AppError } = require("../src/errors");

const model = { name: "local:test", digest: "a".repeat(64), size: 100, details: { format: "gguf" } };

function child() {
  const c = new EventEmitter();
  c.stdout = new PassThrough();
  c.stderr = new PassThrough();
  c.exitCode = null;
  c.signalCode = null;
  c.kill = () => { c.exitCode = 0; c.emit("exit", 0); };
  return c;
}

test("cloud, remote and unverifiable model inventory entries are excluded", () => {
  assert.equal(localModel(model), true);
  for (const bad of [{ remote_host: "https://ollama.com" }, { remote_model: "remote" }, { name: "a:cloud" }, { digest: "" }, { size: 0 }, { details: {} }]) {
    assert.equal(localModel({ ...model, ...bad }), false);
  }
});

test("managed spawn is shell-free, loopback-only and cloud-disabled; only owned child is stopped", async () => {
  const c = child();
  let opts;
  const provider = new Ollama({ runtimePort: 11435 }, {
    resolve: () => "C:\\tools\\ollama.exe",
    probe: async () => {},
    spawn: (exe, args, options) => {
      assert.equal(exe, "C:\\tools\\ollama.exe");
      assert.deepEqual(args, ["serve"]);
      opts = options;
      setImmediate(() => c.stderr.write("Ollama cloud disabled: true\n"));
      return c;
    },
    fetch: async (url, options) => {
      assert.equal(url, "http://127.0.0.1:11435/api/version");
      assert.equal(options.redirect, "error");
      return Response.json({ version: "0.40.5" });
    }
  });
  await provider.start();
  assert.equal(provider.status().ready, true);
  assert.equal(opts.shell, false);
  assert.equal(opts.env.OLLAMA_NO_CLOUD, "1");
  assert.equal(opts.env.OLLAMA_HOST, "127.0.0.1:11435");
  assert.equal(opts.env.OLLAMA_NOPRUNE, "1");
  c.kill();
  assert.equal(provider.status().ready, false);
  assert.equal(provider.status().code, "RUNTIME_EXITED");
  await provider.stop();
  assert.equal(c.exitCode, 0);
  assert.equal(provider.status().ready, false);
});

test("occupied port fails closed without spawn or fetch", async () => {
  let touched = false;
  const provider = new Ollama({ runtimePort: 11435 }, {
    resolve: () => "unused",
    probe: async () => { throw new AppError("RUNTIME_PORT_BUSY", "Busy", 503); },
    spawn: () => { touched = true; },
    fetch: () => { touched = true; }
  });
  await provider.start();
  assert.equal(provider.status().code, "RUNTIME_PORT_BUSY");
  assert.equal(touched, false);
});

test("no cloud-disable confirmation fails closed", async () => {
  const c = child();
  let fetched = false;
  const provider = new Ollama({ runtimePort: 11435 }, {
    startupMs: 10, resolve: () => "unused", probe: async () => {}, spawn: () => c,
    fetch: async () => { fetched = true; return Response.json({ version: "0.40.5" }); }
  });
  await provider.start();
  assert.equal(provider.status().code, "RUNTIME_UNVERIFIED");
  assert.equal(c.exitCode, 0);
  assert.equal(fetched, false);
});

test("model verification requires local inventory, GGUF, completion and context metadata", async () => {
  let details = { details: { format: "gguf" }, capabilities: ["completion"], model_info: { "general.architecture": "llama", "llama.context_length": 8192 } };
  const urls = [];
  const provider = new Ollama({ runtimePort: 11435 }, { fetch: async (url) => {
    urls.push(url);
    return Response.json(url.endsWith("/api/tags") ? { models: [model, { ...model, name: "remote:cloud" }] } : details);
  } });
  provider.state.ready = true;
  assert.equal((await provider.verify("local:test")).context, 8192);
  await assert.rejects(provider.verify("remote:cloud"), { code: "LOCAL_MODEL_REQUIRED" });
  details = { ...details, model_info: {} };
  await assert.rejects(provider.verify("local:test"), { code: "MODEL_UNVERIFIED" });
  assert.ok(urls.every((u) => u.startsWith("http://127.0.0.1:11435/api/")));
  await assert.rejects(provider.request("https://example.invalid"), /Unsupported provider endpoint/);
});

test("invalid, incomplete and tool-dependent output cannot become an answer", async () => {
  let answer = { done: true, message: { role: "assistant", content: "Real response" }, prompt_eval_count: 10 };
  const provider = new Ollama({ runtimePort: 11435 }, { fetch: async (url, opts) => {
    const body = JSON.parse(opts.body);
    assert.equal(body.stream, false);
    assert.equal(body.options.num_predict, 1024);
    assert.equal(body.tools, undefined);
    return Response.json(answer);
  } });
  provider.state.ready = true;
  const m = { name: model.name, context: 8192 };
  assert.equal(await provider.generate(m, [], new AbortController().signal), "Real response");
  answer = { done: false, message: { role: "assistant", content: "Partial" } };
  await assert.rejects(provider.generate(m, []), { code: "ANSWER_INCOMPLETE" });
  answer = { done: true, message: { role: "assistant", content: "Call", tool_calls: [{}] } };
  await assert.rejects(provider.generate(m, []), { code: "ANSWER_INCOMPLETE" });
  provider.fetch = async () => new Response("not JSON");
  await assert.rejects(provider.request("/api/tags"), { code: "PROVIDER_INVALID" });
  provider.fetch = async () => new Response("x", { status: 503 });
  await assert.rejects(provider.request("/api/tags"), { code: "INFERENCE_REJECTED" });
  provider.fetch = async () => { throw new TypeError("redirect or connection refused"); };
  await assert.rejects(provider.request("/api/tags"), { code: "RUNTIME_CONNECTION_FAILED" });
});
