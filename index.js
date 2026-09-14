const express = require("express");
const compression = require("compression");
const app = express();

// Gzip/deflate-compress responses so JSON payloads use fewer bytes on the
// wire. Cheap CPU cost per request, meaningful bandwidth/latency win,
// especially as response payloads grow.
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
