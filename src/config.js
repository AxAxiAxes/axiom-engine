const path = require("node:path");
const os = require("node:os");

const limits = Object.freeze({
  bodyBytes: 65536,
  inputBytes: 12000,
  outputTokens: 1024,
  contextTokens: 16384,
  runMs: 120000,
  providerBytes: 2 * 1024 * 1024,
  sessionMs: 8 * 60 * 60 * 1000
});

function port(value, fallback) {
  const n = Number(value === undefined ? fallback : value);
  if (!Number.isInteger(n) || n < 1024 || n > 65535) {
    throw new Error("Ports must be integers between 1024 and 65535.");
  }
  return n;
}

function config(env = process.env) {
  const appPort = port(env.PORT, 3000);
  const runtimePort = port(env.AXES_OLLAMA_PORT, 11435);
  if (appPort === runtimePort) throw new Error("App and Ollama ports must differ.");
  const base = process.platform === "win32" ? env.LOCALAPPDATA :
    (env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"));
  if (!env.AXES_DATA_DIR && !base) throw new Error("Set AXES_DATA_DIR to an absolute data directory.");
  const dataDir = env.AXES_DATA_DIR || path.join(base, "AXES", "axiom-engine");
  if (!path.isAbsolute(dataDir)) throw new Error("AXES_DATA_DIR must be absolute.");
  return { appPort, runtimePort, dataDir, executable: env.AXES_OLLAMA_EXE };
}

module.exports = { config, limits };
