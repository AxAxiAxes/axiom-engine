const { randomBytes, timingSafeEqual } = require("node:crypto");
const { AppError, fields, text } = require("./errors");
const { limits } = require("./config");

function secret() { return randomBytes(32).toString("hex"); }
function equal(a, b) {
  return typeof a === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function localAccess({ pairingCode = secret(), now = Date.now } = {}) {
  let session;
  let attempts = [];
  return {
    pairingCode,
    boundary(req, res, next) {
      const host = `127.0.0.1:${req.socket.localPort}`;
      res.set({
        "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; media-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Cache-Control": "no-store"
      });
      if (req.headers.host !== host) return next(new AppError("INVALID_HOST", "Use the printed 127.0.0.1 app address.", 403));
      if (req.headers.origin && req.headers.origin !== `http://${host}`) {
        return next(new AppError("INVALID_ORIGIN", "Cross-origin access is not allowed.", 403));
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        if (req.headers.origin !== `http://${host}`) return next(new AppError("INVALID_ORIGIN", "A same-origin request is required.", 403));
        const mediaUpload = req.method === "PUT" && /^\/api\/profiles\/[^/]+\/media$/.test(req.path);
        if (!mediaUpload && !req.is("application/json")) return next(new AppError("JSON_REQUIRED", "Use application/json.", 415));
      }
      next();
    },
    pair(req, res, next) {
      try {
        attempts = attempts.filter((time) => now() - time < 60000);
        if (attempts.length >= 5) throw new AppError("PAIRING_LIMIT", "Too many pairing attempts. Wait one minute.", 429);
        attempts.push(now());
        fields(req.body, ["code"], ["code"]);
        if (!equal(text(req.body.code, "Pairing code", 128), pairingCode)) {
          throw new AppError("PAIRING_FAILED", "The pairing code is incorrect.", 401);
        }
        session = { token: secret(), csrf: secret(), expires: now() + limits.sessionMs };
        res.cookie("axes_session", session.token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: limits.sessionMs });
        res.json({ csrf: session.csrf });
      } catch (error) { next(error); }
    },
    authenticate(req, res, next) {
      const cookie = (req.headers.cookie || "").split(";").map((part) => part.trim())
        .find((part) => part.startsWith("axes_session="))?.slice("axes_session=".length);
      if (!session || session.expires <= now() || !equal(cookie, session.token)) {
        return next(new AppError("PAIRING_REQUIRED", "Pair this browser using the code in the launch terminal.", 401));
      }
      if (!["GET", "HEAD"].includes(req.method) && !equal(req.headers["x-axes-csrf"], session.csrf)) {
        return next(new AppError("INVALID_CSRF", "The session changed. Pair this browser again.", 403));
      }
      next();
    },
    current(req, res) { res.json({ csrf: session.csrf }); },
    logout(req, res) {
      session = undefined;
      res.clearCookie("axes_session", { path: "/", httpOnly: true, sameSite: "strict" });
      res.status(204).end();
    }
  };
}

module.exports = { localAccess };
