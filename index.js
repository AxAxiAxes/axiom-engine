const express = require("express");
const app = express();

// Express only defaults to compact (non-indented) JSON when NODE_ENV is
// "production". Setting this explicitly guarantees every response skips
// the extra indentation work and bytes regardless of how the process is
// launched/deployed.
app.set("json spaces", 0);

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
