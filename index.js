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

// Node's default TCP backlog (511) is the max number of pending connections
// the OS will queue while the event loop is busy accepting them. Under bursty
// traffic that queue can fill up, causing new connections to be refused or
// reset instead of just waiting briefly. Raising it gives the server more
// headroom to absorb spikes without dropping clients.
app.listen({ port: process.env.PORT || 3000, backlog: 1024 }, () => {
  console.log("AXIOM engine running");
});
