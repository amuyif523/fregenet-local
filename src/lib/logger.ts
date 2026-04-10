type CriticalEvent = "ADMIN_LOGIN" | "DONATION_SUCCESS" | "WEBHOOK_FAILURE" | "PROJECT_DELETION";

type CriticalLogInput = {
  event: CriticalEvent;
  userId?: string | null;
  ip?: string | null;
  message?: string;
  metadata?: Record<string, unknown>;
};

const AUDIT_CHANNEL = "ZEGA_AUDIT";

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
