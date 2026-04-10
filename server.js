"use strict";

const fs = require("fs");
const path = require("path");

const standaloneServerPath = path.join(__dirname, ".next", "standalone", "server.js");

if (!fs.existsSync(standaloneServerPath)) {
  console.error("Standalone server not found at .next/standalone/server.js");
  console.error("Run 'npm run build' first, then copy public and .next/static into .next/standalone.");
  process.exit(1);
}

// cPanel commonly sets this env var for Node apps.
if (!process.env.PORT && process.env.NODEJS_PORT) {
  process.env.PORT = process.env.NODEJS_PORT;
}

// Bind to all interfaces in shared hosting environments.
if (!process.env.HOSTNAME) {
  process.env.HOSTNAME = "0.0.0.0";
}

require(standaloneServerPath);
