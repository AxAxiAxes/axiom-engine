const express = require("express");
const app = express();

app.use(express.json());

// The health check body never changes, so serialize it once at startup
// instead of re-running JSON.stringify/object allocation on every hit.
// This route is typically polled frequently by load balancers/orchestrators,
// making it a hot path worth avoiding repeated work on.
const HEALTH_CHECK_BODY = JSON.stringify({ status: "AXIOM engine online" });

// Health check
app.get("/", (req, res) => {
  res.type("application/json").send(HEALTH_CHECK_BODY);
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
