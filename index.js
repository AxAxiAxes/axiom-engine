const express = require("express");
const app = express();

app.use(express.json());

// Health check
// This body is static and typically polled very frequently by load
// balancers/orchestrators. Allowing a short public cache window lets
// intermediary proxies/CDNs answer repeat checks without hitting this
// process at all, which is far cheaper than any server-side
// serialization optimization alone.
app.get("/", (req, res) => {
  res.set("Cache-Control", "public, max-age=5");
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
