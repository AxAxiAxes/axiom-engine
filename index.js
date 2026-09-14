const express = require("express");
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

const server = app.listen(process.env.PORT || 3000, () => {
  console.log("AXIOM engine running");
});

// Disable Nagle's algorithm on every incoming connection. By default TCP
// batches small outgoing packets and can delay them up to ~40ms waiting to
// coalesce writes. Our responses are small JSON payloads sent one at a time,
// so that batching only adds latency with no throughput benefit — disabling
// it lets each response go out immediately.
server.on("connection", (socket) => {
  socket.setNoDelay(true);
});
