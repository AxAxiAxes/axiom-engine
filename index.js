const express = require("express");
const app = express();

// Bound the request body size: without a limit, express.json() will buffer
// and parse arbitrarily large payloads, which can spike memory/CPU and
// block the event loop on a single oversized or malicious request.
app.use(express.json({ limit: "100kb" }));

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
