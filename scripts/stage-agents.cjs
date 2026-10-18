const { readFileSync, statSync } = require("node:fs");
const path = require("node:path");
const { Store } = require("../src/store");

let store;
try {
  const [manifest, dataDirectory] = process.argv.slice(2);
  if (!manifest || !dataDirectory || !path.isAbsolute(manifest) || !path.isAbsolute(dataDirectory)) {
    throw new Error("Supply absolute manifest and data-directory paths. Stop the app using that data first.");
  }
  if (statSync(manifest).size > 256 * 1024) throw new Error("Source manifest exceeds 256 KiB.");
  const document = JSON.parse(readFileSync(manifest, "utf8").replace(/^\uFEFF/, ""));
  store = new Store(dataDirectory);
  const agents = store.stageAgents(document);
  console.log(JSON.stringify({
    staged: agents.map(({ id, name, enabled }) => ({ id, name, enabled })),
    status: "Source configurations staged; original registration timestamps/history are not created or inferred. No task permissions granted."
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { store?.close(); }
