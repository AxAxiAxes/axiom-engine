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

const jsonParser = express.json();

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
app.post("/axiom", jsonParser, (req, res) => {
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
