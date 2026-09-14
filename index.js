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
