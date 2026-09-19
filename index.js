const express = require("express");
const app = express();

const jsonParser = express.json();

// Health check
app.get("/", (req, res) => {
  res.json({ status: "AXIOM engine online" });
});

// Core automation route
app.post("/axiom", jsonParser, (req, res) => {
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
