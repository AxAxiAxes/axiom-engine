const cluster = require("cluster");
const os = require("os");
const express = require("express");

// Node's event loop is single-threaded, so a single process can only ever
// use one CPU core no matter how much traffic arrives. Forking one worker
// per core lets the OS load-balance incoming connections across all of
// them, multiplying throughput on multi-core hosts for essentially no
// added application complexity. The primary process only manages workers
// and restarts any that die; all actual request handling still happens in
// the code below, unchanged.
if (cluster.isPrimary || cluster.isMaster) {
  const numWorkers = process.env.WEB_CONCURRENCY || os.cpus().length;

  console.log(`AXIOM primary ${process.pid} starting ${numWorkers} worker(s)`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code}), restarting`);
    cluster.fork();
  });
} else {
  const app = express();

  app.use(express.json());

  // Health check
  app.get("/", (req, res) => {
    res.json({ status: "AXIOM engine online" });
  });

  // Core automation route
  app.post("/axiom", (req, res) => {
    const { action, payload } = req.body;

    res.json({
      engine: "AXIOM",
      actionReceived: action,
      payloadReceived: payload,
      status: "processed"
    });
  });

  app.listen(process.env.PORT || 3000, () => {
    console.log(`AXIOM engine running (worker ${process.pid})`);
  });
}
