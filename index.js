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

// Guard against slow/stalled clients (e.g. a slow-loris style connection
// that trickles bytes in over minutes, or one that just hangs after
// connecting). Without a bound, Node keeps such a socket -- and the worker
// resources tied to it -- open indefinitely, letting a handful of slow
// clients starve capacity for everyone else. Capping the total time
// allowed to receive a full request forces those sockets closed so the
// process stays available under load.
server.requestTimeout = 30000;
