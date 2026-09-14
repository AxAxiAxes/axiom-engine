// Express (and several of its dependencies, e.g. template engines) branch
// on NODE_ENV: in anything other than "production" they skip view/route
// caching and take slower, more verbose code paths meant for local
// development. Deployments that forget to set NODE_ENV pay that cost on
// every request for no benefit. Default it to "production" here -- before
// express is required -- so a missing env var never silently degrades
// throughput, while still letting an explicit override win.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

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

app.listen(process.env.PORT || 3000, () => {
  console.log("AXIOM engine running");
});
