"use strict";

const fs = require("fs");
const path = require("path");

function logInfo(message) {
  const timestamp = new Date().toISOString();
  process.stderr.write(`[${timestamp}] [Passenger bootstrap] ${message}\n`);
}

function logError(message, error) {
  logInfo(message);
  if (error) {
    const details = error && error.stack ? error.stack : String(error);
    process.stderr.write(`${details}\n`);
  }
}

function resolveStandaloneServer() {
  const candidateRoots = [
    __dirname,
    process.cwd(),
    process.env.PWD,
    process.env.APP_ROOT,
    process.env.PASSENGER_APP_ROOT,
    process.env.DOCUMENT_ROOT
  ].filter(Boolean);

  const visited = new Set();

  for (const root of candidateRoots) {
    const resolvedRoot = path.resolve(root);
    if (visited.has(resolvedRoot)) {
      continue;
    }
    visited.add(resolvedRoot);

    const standaloneServerPath = path.join(resolvedRoot, ".next", "standalone", "server.js");
    if (fs.existsSync(standaloneServerPath)) {
      return {
        appRoot: resolvedRoot,
        standaloneRoot: path.dirname(standaloneServerPath),
        standaloneServerPath
      };
    }
  }

  return null;
}

function resolveAssets(appRoot, standaloneRoot) {
  const standalonePublicDir = path.join(standaloneRoot, "public");
  const standaloneStaticDir = path.join(standaloneRoot, ".next", "static");
  const appPublicDir = path.join(appRoot, "public");
  const appStaticDir = path.join(appRoot, ".next", "static");

  const publicDir = fs.existsSync(standalonePublicDir) ? standalonePublicDir : appPublicDir;
  const staticDir = fs.existsSync(standaloneStaticDir) ? standaloneStaticDir : appStaticDir;

  const hasStandalonePublic = fs.existsSync(standalonePublicDir);
  const hasStandaloneStatic = fs.existsSync(standaloneStaticDir);

  // Provide explicit path hints for diagnostics and custom middleware integrations.
  process.env.NEXT_PUBLIC_DIR_HINT = publicDir;
  process.env.NEXT_STATIC_DIR_HINT = staticDir;

  if (!hasStandalonePublic || !hasStandaloneStatic) {
    logError("Standalone assets are incomplete. Shared hosts require copied assets inside .next/standalone.");
    logError(
      "Copy both 'public' and '.next/static' into '.next/standalone' before packaging, or pages may render without CSS/images."
    );
    logInfo(`Resolved public dir hint: ${publicDir}`);
    logInfo(`Resolved static dir hint: ${staticDir}`);
  } else {
    logInfo("Standalone assets detected: public + .next/static are present in .next/standalone.");
  }
}

async function runPrismaConnectivityCheck(appRoot) {
  const skipDbCheck = process.env.SKIP_DB_CONNECTIVITY_CHECK === "1";
  if (skipDbCheck) {
    logInfo("Database connectivity check skipped (SKIP_DB_CONNECTIVITY_CHECK=1).");
    return;
  }

  const generatedClientPath = path.join(appRoot, "prisma", "generated", "client");
  const clientModule = fs.existsSync(generatedClientPath) ? generatedClientPath : "@prisma/client";

  try {
    const { PrismaClient } = require(clientModule);
    const prisma = new PrismaClient({ log: ["error"] });

    await prisma.$queryRawUnsafe("SELECT 1");
    await prisma.$disconnect();

    logInfo("Database Connectivity: OK (Prisma startup probe passed).");
  } catch (error) {
    logError("Database Connectivity: FAILED (Prisma startup probe).");
    logError(
      "Possible causes: DATABASE_URL issues, server firewall, or Prisma/OpenSSL engine mismatch on shared hosting.",
      error
    );
  }
}

async function bootstrap() {
  const resolved = resolveStandaloneServer();

  if (!resolved) {
    logError("Could not find ./.next/standalone/server.js from known Passenger roots.");
    logError(`Searched from __dirname=${__dirname}, cwd=${process.cwd()}`);
    logError("Build with 'npm run build' and deploy the '.next/standalone' output plus '.next/static' and 'public'.");
    process.exit(1);
  }

  // Passenger can launch with an unexpected cwd; run from standalone root for correct chunk/static resolution.
  if (process.cwd() !== resolved.standaloneRoot) {
    process.chdir(resolved.standaloneRoot);
  }

  // cPanel/Passenger may expose NODEJS_PORT; normalize to PORT and default to 3000.
  process.env.PORT = process.env.PORT || process.env.NODEJS_PORT || "3000";
  process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  resolveAssets(resolved.appRoot, resolved.standaloneRoot);
  await runPrismaConnectivityCheck(resolved.appRoot);

  process.stderr.write(
    `[${new Date().toISOString()}] [Passenger bootstrap] Starting Next standalone from ${resolved.standaloneServerPath} (cwd=${process.cwd()}, host=${process.env.HOSTNAME}, port=${process.env.PORT})\n`
  );

  require(resolved.standaloneServerPath);
}

process.on("uncaughtException", (error) => {
  logError("Uncaught exception during startup/runtime.", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("Unhandled promise rejection during startup/runtime.", reason);
  process.exit(1);
});

bootstrap().catch((error) => {
  logError("Failed to bootstrap Next standalone server.", error);
  process.exit(1);
});
