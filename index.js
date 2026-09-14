const express = require("express");
const app = express();

// Express defaults to the "extended" query parser, which pulls in the `qs`
// library to support nested objects/arrays in query strings (e.g.
// `?a[b]=1`). That recursive parsing is unnecessary overhead for routes
// that only ever expect flat query strings, and it also accepts
// attacker-controlled deeply-nested input. The "simple" parser uses
// Node's built-in `querystring` module instead, which is faster and has
// no nested-parsing surface to exploit.
app.set("query parser", "simple");

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
