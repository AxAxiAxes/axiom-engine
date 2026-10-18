const { spawn } = require("node:child_process");
const { existsSync, statSync } = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { setTimeout: delay } = require("node:timers/promises");
const { AppError } = require("../errors");
const { limits } = require("../config");

function resolveExecutable(explicit, env = process.env) {
  const candidates = explicit ? [explicit] : [
    ...(env.PATH || "").split(path.delimiter).filter(Boolean)
      .map((dir) => path.join(dir, process.platform === "win32" ? "ollama.exe" : "ollama")),
    ...(env.LOCALAPPDATA ? [path.join(env.LOCALAPPDATA, "Programs", "Ollama", "ollama.exe")] : [])
  ];
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  throw new AppError("RUNTIME_MISSING", "Install Ollama beforehand, then set AXES_OLLAMA_EXE to its absolute executable path and restart.", 503);
}

function availablePort(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () => reject(new AppError("RUNTIME_PORT_BUSY", "The dedicated Ollama port is unavailable. Free it or choose AXES_OLLAMA_PORT, then restart.", 503)));
    probe.listen({ host: "127.0.0.1", port, exclusive: true }, () => probe.close(resolve));
  });
}

function localModel(model) {
  return model && typeof model.name === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/.test(model.name) &&
    !/cloud|https?:|@/i.test(model.name) &&
    !model.remote_model && !model.remote_host &&
    /^[a-f0-9]{64}$/i.test(model.digest || "") &&
    Number.isSafeInteger(model.size) && model.size > 0 &&
    model.details?.format === "gguf";
}

class Ollama {
  constructor(config, dependencies = {}) {
    this.port = config.runtimePort;
    this.base = `http://127.0.0.1:${this.port}`;
    this.executable = config.executable;
    this.spawn = dependencies.spawn || spawn;
    this.fetch = dependencies.fetch || fetch;
    this.probe = dependencies.probe || availablePort;
    this.resolve = dependencies.resolve || resolveExecutable;
    this.startupMs = dependencies.startupMs || 15000;
    this.state = { ready: false, code: "RUNTIME_STARTING", message: "Checking the dedicated local runtime." };
    this.child = null;
    this.cloudDisabled = false;
    this.stopping = false;
  }

  status() { return { ...this.state }; }

  async start() {
    try {
      const exe = this.resolve(this.executable);
      await this.probe(this.port);
      const env = { ...process.env };
      for (const key of Object.keys(env)) {
        if (/^(OLLAMA_(NO_CLOUD|HOST|DEBUG|ORIGINS|AUTH|API_KEY|REMOTES|NUM_PARALLEL|MAX_LOADED_MODELS|NOPRUNE)|HTTPS?_PROXY|ALL_PROXY|NO_PROXY)$/i.test(key)) delete env[key];
      }
      Object.assign(env, {
        OLLAMA_NO_CLOUD: "1",
        OLLAMA_HOST: `127.0.0.1:${this.port}`,
        OLLAMA_DEBUG: "0",
        OLLAMA_NOPRUNE: "1",
        OLLAMA_NUM_PARALLEL: "1",
        OLLAMA_MAX_LOADED_MODELS: "1",
        NO_PROXY: "*"
      });
      this.child = this.spawn(exe, ["serve"], { shell: false, windowsHide: true, env, stdio: ["ignore", "pipe", "pipe"] });
      let logTail = "";
      const inspectLog = (chunk) => {
        logTail = (logTail + chunk.toString()).slice(-8192);
        if (/cloud disabled[^\r\n]{0,30}\btrue\b/i.test(logTail)) this.cloudDisabled = true;
      };
      this.child.stdout.on("data", inspectLog);
      this.child.stderr.on("data", inspectLog);
      this.child.once("error", () => {
        this.state = { ready: false, code: "RUNTIME_LAUNCH_FAILED", message: "Ollama could not be launched. Check its executable path and permissions, then restart." };
      });
      this.child.once("exit", () => {
        this.state = { ready: false, code: "RUNTIME_EXITED", message: "The managed runtime stopped. Restart AXES to retry." };
      });
      const deadline = Date.now() + this.startupMs;
      while (Date.now() < deadline && !this.stopping) {
        if (this.child.exitCode !== null || this.child.signalCode || this.state.code === "RUNTIME_LAUNCH_FAILED") break;
        if (this.cloudDisabled) {
          try {
            const version = await this.request("/api/version", undefined, undefined, false);
            if (!/^\d+\.\d+\.\d+$/.test(version.version || "")) {
              throw new AppError("RUNTIME_INCOMPATIBLE", "Ollama returned an unrecognized version. Use a supported stable release.", 503);
            }
            if (this.child.exitCode !== null || this.stopping) break;
            this.state = { ready: true, code: "LOCAL_READY", message: "Managed loopback runtime; cloud-disable confirmation received.", version: version.version };
            return;
          } catch (error) {
            if (error instanceof AppError && error.code === "RUNTIME_INCOMPATIBLE") throw error;
          }
        }
        await delay(100);
      }
      throw new AppError("RUNTIME_UNVERIFIED", "Ollama did not become ready with a cloud-disabled confirmation. Use a release supporting OLLAMA_NO_CLOUD; restart after checking setup.", 503);
    } catch (error) {
      await this.stop();
      this.state = error instanceof AppError ?
        { ready: false, code: error.code, message: error.message } :
        { ready: false, code: "RUNTIME_START_FAILED", message: "The managed runtime could not start. Check the executable and dedicated port, then restart." };
    }
  }

  async stop() {
    this.stopping = true;
    this.state = { ready: false, code: "RUNTIME_STOPPED", message: "The managed runtime is stopped." };
    const child = this.child;
    if (child && child.exitCode === null && !child.signalCode) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2000);
        child.once("exit", () => { clearTimeout(timer); resolve(); });
        child.kill();
      });
    }
  }

  async request(route, body, signal, requireReady = true) {
    if (requireReady && !this.state.ready) throw new AppError(this.state.code, this.state.message, 503);
    if (!["/api/version", "/api/tags", "/api/show", "/api/chat"].includes(route)) throw new Error("Unsupported provider endpoint.");
    let response;
    try {
      response = await this.fetch(`${this.base}${route}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(route === "/api/chat" ? limits.runMs : 5000)]) : AbortSignal.timeout(5000)
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new AppError("RUNTIME_CONNECTION_FAILED", "The managed Ollama request failed or timed out. Check runtime readiness and restart AXES if the runtime stopped. Redirects and remote endpoints are not allowed.", 503);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new AppError("INFERENCE_REJECTED", `Ollama rejected the request (HTTP ${response.status}). Check model compatibility, context size, and available memory.`, 502);
    }
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > limits.providerBytes) throw new AppError("PROVIDER_RESPONSE_TOO_LARGE", "Ollama exceeded the response size limit.", 502);
      chunks.push(Buffer.from(chunk));
    }
    try {
      const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!result || typeof result !== "object" || Array.isArray(result) || result.error) throw new Error("Invalid result");
      return result;
    } catch {
      throw new AppError("PROVIDER_INVALID", "Ollama returned an invalid response. No answer was saved.", 502);
    }
  }

  async models(signal) {
    const result = await this.request("/api/tags", undefined, signal);
    if (!Array.isArray(result.models)) throw new AppError("PROVIDER_INVALID", "Ollama returned an invalid model inventory.", 502);
    return result.models.filter(localModel).map(({ name, digest, size }) => ({ name, digest, size }));
  }

  async verify(name, signal) {
    const model = (await this.models(signal)).find((m) => m.name === name);
    if (!model) throw new AppError("LOCAL_MODEL_REQUIRED", "Choose an installed, verifiable local GGUF model. Cloud and ambiguous models are not permitted.", 409);
    const details = await this.request("/api/show", { model: name }, signal);
    const architecture = details.model_info?.["general.architecture"];
    const context = details.model_info?.[`${architecture}.context_length`];
    if (details.remote_model || details.remote_host || details.details?.format !== "gguf" ||
        !Array.isArray(details.capabilities) || !details.capabilities.includes("completion") ||
        !Number.isSafeInteger(context) || context < 2048) {
      throw new AppError("MODEL_UNVERIFIED", "This model's local completion capability and context could not be verified. Select another local model.", 409);
    }
    return { ...model, context: Math.min(context, limits.contextTokens) };
  }

  async generate(model, messages, signal) {
    const result = await this.request("/api/chat", {
      model: model.name, messages, stream: false, think: false,
      options: { num_ctx: model.context, num_predict: limits.outputTokens },
      keep_alive: "0"
    }, signal);
    if (result.done !== true || result.message?.role !== "assistant" ||
        typeof result.message.content !== "string" || !result.message.content.trim() ||
        result.message.tool_calls?.length || result.done_reason === "length") {
      throw new AppError("ANSWER_INCOMPLETE", "The runtime returned an empty, incomplete, or tool-dependent answer. Try a shorter request or a compatible local model.", 502);
    }
    if (Number.isFinite(result.prompt_eval_count) && result.prompt_eval_count + limits.outputTokens >= model.context) {
      throw new AppError("CONTEXT_TOO_LARGE", "The model context is full. Start a new conversation; no history was intentionally trimmed.", 413);
    }
    return result.message.content;
  }
}

module.exports = { Ollama, resolveExecutable, availablePort, localModel };
