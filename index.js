if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";

const { config } = require("./src/config");
const { Store } = require("./src/store");
const { Ollama } = require("./src/providers/ollama");
const { Runs } = require("./src/runs");
const { createApp } = require("./src/app");
const { Media } = require("./src/media");

async function main({ log = console.log } = {}) {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major !== 24 || minor < 22) throw new Error("AXES requires Node 24.22.0 or newer in the Node 24 LTS line.");
  const settings = config();
  const store = new Store(settings.dataDir);
  const provider = new Ollama(settings);
  const runs = new Runs(store, provider, { onFatal: (code) => console.error(code) });
  const media = new Media(settings.dataDir, store);
  const { app, access } = createApp({ store, provider, runs, media });
  let server;
  try {
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(settings.appPort, "127.0.0.1", () => resolve(listener));
      listener.once("error", reject);
    });
  } catch (error) {
    store.close();
    throw error;
  }
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  log(`AXES local workspace: http://127.0.0.1:${settings.appPort}/app/`);
  log(`Pairing code (private, valid for this launch): ${access.pairingCode}`);
  log("16 starter templates are profiles, not running agents. No cloud fallback.");
  const starting = provider.start();
  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    server.close();
    server.closeAllConnections();
    await provider.stop();
    await starting;
    await runs.stop();
    await media.stop();
    store.close();
  }
  process.once("SIGINT", () => { shutdown().catch(() => { console.error("SHUTDOWN_FAILED"); process.exitCode = 1; }); });
  process.once("SIGTERM", () => { shutdown().catch(() => { console.error("SHUTDOWN_FAILED"); process.exitCode = 1; }); });
  return { server, store, provider, runs, access, shutdown };
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`AXES startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}
module.exports = { main };
