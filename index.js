const cluster = require("cluster");
const os = require("os");
const express = require("express");

function startServer() {
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

// Use all available CPU cores in production so incoming requests are spread
// across multiple Node processes instead of a single event loop. Falls back
// to a single process in development/test to keep local debugging simple.
if (process.env.NODE_ENV === "production" && cluster.isPrimary) {
  const numWorkers = os.cpus().length;
  console.log(`AXIOM primary ${process.pid} starting ${numWorkers} workers`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.error(`Worker ${worker.process.pid} exited (${signal || code}), restarting`);
    cluster.fork();
  });
} else {
  startServer();
}
