import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

type CriticalEvent = "ADMIN_LOGIN" | "DONATION_SUCCESS" | "WEBHOOK_FAILURE" | "PROJECT_DELETION";

type CriticalLogInput = {
  event: CriticalEvent;
  userId?: string | null;
  ip?: string | null;
  message?: string;
  metadata?: Record<string, unknown>;
};

const AUDIT_CHANNEL = "ZEGA_AUDIT";
const ERROR_LOG_DIRECTORY = path.join(process.cwd(), "logs");
const ERROR_LOG_PATH = path.join(ERROR_LOG_DIRECTORY, "error.log");

function normalizeIp(value: string | null | undefined) {
  return value?.trim() || "unknown";
}

export function getIpFromHeaders(headersValue: Headers) {
  const forwarded = headersValue.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headersValue.get("x-real-ip")?.trim();
  return normalizeIp(forwarded || realIp);
}

export function logCriticalEvent(input: CriticalLogInput) {
  const entry = {
    channel: AUDIT_CHANNEL,
    severity: "critical",
    timestamp: new Date().toISOString(),
    event: input.event,
    userId: input.userId ?? "anonymous",
    ip: normalizeIp(input.ip),
    message: input.message ?? "",
    metadata: input.metadata ?? {}
  };

  console.log(JSON.stringify(entry));
}

type ServerActionErrorInput = {
  action: string;
  userId?: string | null;
  ip?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
};

async function writeErrorLogLine(payload: Record<string, unknown>) {
  try {
    await mkdir(ERROR_LOG_DIRECTORY, { recursive: true });
    await appendFile(ERROR_LOG_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (error: unknown) {
    console.error("Failed to write error log", error);
  }
}

export async function logServerActionFailure(input: ServerActionErrorInput) {
  const payload = {
    channel: "ZEGA_ERROR",
    severity: "critical",
    timestamp: new Date().toISOString(),
    action: input.action,
    userId: input.userId ?? "anonymous",
    ip: normalizeIp(input.ip),
    message: input.message,
    metadata: input.metadata ?? {}
  };

  console.error(JSON.stringify(payload));
  await writeErrorLogLine(payload);
}
