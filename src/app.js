const express = require("express");
const path = require("node:path");
const { localAccess } = require("./local-access");
const { limits } = require("./config");
const { AppError, fields, text } = require("./errors");
const { identity } = require("./identity");

function createApp({ store, provider, runs, media, access = localAccess(), log = (code) => console.error(code) }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(access.boundary);
  app.use(express.json({ limit: limits.bodyBytes }));
  app.get("/", (req, res) => res.type("application/json").send('{"status":"AXIOM engine online"}'));
  app.use("/app", express.static(path.join(__dirname, "..", "public"), { redirect: true, etag: false }));
  app.post("/api/session", access.pair);
  app.use(["/api", "/axiom"], access.authenticate);
  app.get("/api/session", access.current);
  app.delete("/api/session", access.logout);
  const route = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);
  app.get("/api/status", (req, res) => res.json({
    app: "ready", storage: runs.failure ? "failed" : "ready", database: store.path,
    runtime: provider.status(), media: media?.status(), ...runs.status(),
    counts: {
      templates: store.profiles().filter((p) => p.template).length,
      enabledProfiles: store.profiles().filter((p) => p.enabled).length,
      activeRuns: runs.active ? 1 : 0
    }
  }));
  app.get("/api/models", route(async (req, res) => res.json(await provider.models())));
  app.get("/api/identity", (req, res) => res.json(identity));
  app.get("/api/profiles", (req, res) => res.json(store.profiles()));
  app.post("/api/profiles", (req, res) => res.status(201).json(store.saveProfile(req.body)));
  app.patch("/api/profiles/:id", (req, res) => res.json(store.saveProfile(req.body, req.params.id)));
  if (media) {
    let receiving = false;
    app.put("/api/profiles/:id/media", (req, res, next) => {
      if (!["image/png", "image/jpeg", "video/mp4"].includes(req.headers["content-type"])) {
        return next(new AppError("MEDIA_TYPE", "Use JPEG, PNG, or MP4 media.", 415));
      }
      if (req.headers["x-axes-rights"] !== "confirmed") return next(new AppError("RIGHTS_REQUIRED", "Confirm your media rights and permissions."));
      if (media.busy || receiving) return next(new AppError("MEDIA_BUSY", "A media operation is already active.", 409));
      receiving = true;
      const release = () => { receiving = false; };
      res.once("finish", release);
      res.once("close", release);
      next();
    }, (req, res, next) => express.raw({
      type: ["image/png", "image/jpeg", "video/mp4"],
      limit: (req.headers["content-type"] === "video/mp4" ? 25 : 12) * 1024 * 1024
    })(req, res, next),
    route(async (req, res) => res.json(await media.replace(req.params.id, req.body, req.headers["content-type"], true))));
    app.get("/api/profiles/:id/media", (req, res) => media.serve(req.params.id, res));
    app.delete("/api/profiles/:id/media", (req, res) => {
      fields(req.body, []);
      media.delete(req.params.id);
      res.status(204).end();
    });
  }
  app.get("/api/conversations", (req, res) => res.json(store.conversations()));
  app.post("/api/conversations", (req, res) => res.status(201).json(store.createConversation(req.body)));
  app.get("/api/conversations/:id", (req, res) => res.json(store.conversation(req.params.id)));
  app.delete("/api/conversations/:id", (req, res) => {
    if (runs.active?.conversationId === req.params.id) throw new AppError("BUSY", "Cancel the active generation before deleting this conversation.", 409);
    store.deleteConversation(req.params.id);
    res.status(204).end();
  });
  app.post("/api/conversations/:id/runs", route(async (req, res) => res.status(202).json(await runs.start(req.params.id, req.body))));
  app.get("/api/runs/:id", (req, res) => res.json(store.run(req.params.id)));
  app.post("/api/runs/:id/cancel", (req, res) => {
    fields(req.body, []);
    res.json(runs.cancel(req.params.id));
  });
  app.post("/axiom", (req, res) => {
    fields(req.body, ["action", "payload"], ["action", "payload"]);
    text(req.body.action, "Action", 200);
    res.set("Deprecation", "true").json({
      engine: "AXIOM", actionReceived: req.body.action, payloadReceived: req.body.payload, status: "processed"
    });
  });
  app.use((req, res, next) => next(new AppError("NOT_FOUND", "Route not found.", 404)));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const known = error instanceof AppError;
    const code = known ? error.code : error.type === "entity.too.large" ? "REQUEST_TOO_LARGE" :
      error.type === "entity.parse.failed" ? "INVALID_JSON" : "INTERNAL_ERROR";
    const status = known ? error.status : code === "REQUEST_TOO_LARGE" ? 413 : code === "INVALID_JSON" ? 400 : 500;
    if (status === 500) log(code);
    res.status(status).json({ error: { code, message: known ? error.message :
      status === 500 ? "The local operation failed. Check storage permissions and the launch terminal before retrying." :
      code === "INVALID_JSON" ? "The request body is not valid JSON." :
      req.path.endsWith("/media") ? "Media exceeds its upload limit (12 MiB images, 25 MiB video)." : "The request exceeds 64 KiB." } });
  });
  return { app, access };
}

module.exports = { createApp };
