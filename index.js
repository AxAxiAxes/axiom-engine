// zlib (used by the gzip/deflate compression middleware below) offloads its
// work to libuv's threadpool, which defaults to only 4 threads. Under
// concurrent traffic, every in-flight response competes for those same
// threads, serializing compression work and adding latency once all 4 are
// busy. Widening the pool gives compression (and any other threadpool-based
// work, e.g. fs/dns/crypto) more room to run in parallel. This must be set
// before any module that touches the threadpool is required/used.
if (!process.env.UV_THREADPOOL_SIZE) {
  process.env.UV_THREADPOOL_SIZE = "8";
}

const express = require("express");
const compression = require("compression");
const app = express();

// Gzip/deflate-compress response bodies before they hit the wire. This
// cuts payload size (and therefore latency) for clients, especially as
// responses grow, for a single line of middleware and no application
// changes elsewhere.
app.use(compression());

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
  console.log("AXIOM engine running");
});
