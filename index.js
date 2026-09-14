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

const server = app.listen(process.env.PORT || 3000, () => {
  console.log("AXIOM engine running");
});

// Node's default keepAliveTimeout (5s) is shorter than the idle timeout of
// most load balancers/proxies in front of this service (e.g. AWS ALB
// defaults to 60s). That mismatch causes the LB to keep reusing a
// connection Node has already torn down, forcing a fresh TCP/TLS handshake
// on the next request instead of reusing the socket. Raising these above
// typical upstream idle timeouts lets connections stay open and be reused,
// cutting handshake overhead under sustained/repeated traffic (e.g.
// frequent health-check polling). headersTimeout must stay greater than
// keepAliveTimeout to avoid a known Node race that can drop pipelined
// requests.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
