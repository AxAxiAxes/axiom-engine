const { AppError, text, fields } = require("./errors");
const { limits } = require("./config");

class Runs {
  constructor(store, provider, { runMs = limits.runMs, onFatal = () => {} } = {}) {
    this.store = store;
    this.provider = provider;
    this.runMs = runMs;
    this.onFatal = onFatal;
    this.active = null;
    this.failure = null;
  }

  status() {
    return { activeRun: this.active?.id || null, preparing: !!this.active && !this.active.id, storageError: !!this.failure };
  }

  async start(conversationId, body) {
    fields(body, ["input", "model"], ["input", "model"]);
    const input = text(body.input, "Message", 8000);
    const name = text(body.model, "Model", 200);
    if (this.failure) throw new AppError("STORAGE_FAILED", "Run persistence failed. Restart after checking local storage.", 503);
    if (this.active) throw new AppError("BUSY", "One generation is already active. Cancel it or wait.", 409);
    const conversation = this.store.conversation(conversationId);
    const profile = this.store.profile(conversation.profile_id);
    if (!profile.enabled) throw new AppError("PROFILE_DISABLED", "Enable this role before generating.", 409);
    const active = { id: null, conversationId, controller: new AbortController(), reason: null };
    this.active = active;
    active.timer = setTimeout(() => {
      active.reason = "TIMEOUT";
      active.controller.abort();
    }, this.runMs);
    try {
      const model = await this.provider.verify(name, active.controller.signal);
      active.controller.signal.throwIfAborted();
      // Failed turns stay visible in history but are never silently replayed to a model.
      const completed = new Set(conversation.runs.filter((r) => r.status === "completed").map((r) => r.id));
      const messages = [
        { role: "system", content: profile.instructions },
        ...conversation.messages.filter((m) => completed.has(m.run_id)).map(({ role, content }) => ({ role, content })),
        { role: "user", content: input }
      ];
      const bytes = Buffer.byteLength(JSON.stringify(messages));
      // A conservative byte budget is not a tokenizer. Runtime context errors remain explicit.
      if (bytes > limits.inputBytes || bytes + messages.length * 64 + limits.outputTokens + 512 > model.context) {
        throw new AppError("CONTEXT_TOO_LARGE", "Conversation input exceeds the conservative local context budget. Start a new conversation or shorten the message; history was not dropped.", 413);
      }
      const run = this.store.startRun(conversationId, input, model.name, model.digest, profile.instructions);
      active.id = run.id;
      active.done = this.execute(active, model, messages);
      return run;
    } catch (error) {
      clearTimeout(active.timer);
      this.active = null;
      if (active.reason === "TIMEOUT") throw new AppError("TIMEOUT", "Model verification timed out. Check the runtime and try explicitly again.", 504);
      throw error;
    }
  }

  async execute(active, model, messages) {
    try {
      const content = await this.provider.generate(model, messages, active.controller.signal);
      active.controller.signal.throwIfAborted();
      this.store.finishRun(active.id, "completed", content);
    } catch (error) {
      const reason = active.reason;
      const failure = reason === "CANCELLED" ? new AppError("CANCELLED", "Generation cancelled. No automatic retry was made.") :
        reason === "TIMEOUT" ? new AppError("TIMEOUT", "Generation exceeded 120 seconds. No automatic retry was made.") :
        error instanceof AppError ? error :
        new AppError("INFERENCE_FAILED", "The local inference request failed. Check runtime readiness, model compatibility, context, and available memory.");
      try {
        this.store.finishRun(active.id, reason === "CANCELLED" ? "cancelled" : "failed", undefined, failure);
      } catch (storageError) {
        this.failure = storageError;
        this.onFatal("STORAGE_FAILED");
      }
    } finally {
      clearTimeout(active.timer);
      if (this.active === active) this.active = null;
    }
  }

  cancel(id) {
    const run = this.store.run(id);
    if (!this.active || this.active.id !== id) return run;
    this.active.reason = "CANCELLED";
    this.active.controller.abort();
    return run;
  }

  async stop() {
    if (this.active) {
      this.active.reason = "CANCELLED";
      this.active.controller.abort();
      await this.active.done;
    }
  }
}

module.exports = { Runs };
