import { z } from "zod";

function hasConfiguredValue(value: string | undefined | null) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return !trimmed.toUpperCase().includes("PLACEHOLDER");
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),

    ADMIN_PASSWORD_HASH: z.string().optional(),
    ADMIN_SESSION_SECRET: z.string().optional(),
    DONATION_STATUS_TOKEN_SECRET: z.string().optional(),
    CRON_SECRET: z.string().optional(),

    CHAPA_SECRET_KEY: z.string().optional(),
    CHAPA_WEBHOOK_SECRET: z.string().optional(),
    CHAPA_INIT_URL: z.string().url().default("https://api.chapa.co/v1/transaction/initialize"),
    CHAPA_VERIFY_URL: z.string().url().default("https://api.chapa.co/v1/transaction/verify/"),
    CHAPA_CALLBACK_URL: z.string().url().optional(),
    CHAPA_RETURN_URL: z.string().min(1).optional(),

    STORAGE_PROVIDER: z.enum(["LOCAL_FS", "S3_STORAGE"]).default("LOCAL_FS"),
    STORAGE_DRIVER: z.string().optional(),
    STORAGE_LOCAL_ROOT: z.string().optional(),
    STORAGE_PUBLIC_BASE_URL: z.string().optional(),

    S3_STORAGE_ENDPOINT: z.string().optional(),
    S3_STORAGE_BUCKET: z.string().optional(),
    S3_STORAGE_REGION: z.string().optional(),
    S3_STORAGE_ACCESS_KEY_ID: z.string().optional(),
    S3_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),

    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    DEFAULT_LOCALE: z.string().optional(),
    SUPPORTED_LOCALES: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") {
      return;
    }

    const requiredSecrets: Array<keyof typeof value> = [
      "ADMIN_PASSWORD_HASH",
      "ADMIN_SESSION_SECRET",
      "DONATION_STATUS_TOKEN_SECRET",
      "CRON_SECRET",
      "CHAPA_SECRET_KEY",
      "CHAPA_WEBHOOK_SECRET",
      "CHAPA_CALLBACK_URL",
      "CHAPA_RETURN_URL"
    ];

    for (const key of requiredSecrets) {
      if (!hasConfiguredValue(value[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be configured for production.`
        });
      }
    }

    if ((value.ADMIN_SESSION_SECRET?.length ?? 0) < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_SESSION_SECRET"],
        message: "ADMIN_SESSION_SECRET must be at least 32 characters in production."
      });
    }

    if ((value.DONATION_STATUS_TOKEN_SECRET?.length ?? 0) < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DONATION_STATUS_TOKEN_SECRET"],
        message: "DONATION_STATUS_TOKEN_SECRET must be at least 32 characters in production."
      });
    }

    if ((value.CRON_SECRET?.length ?? 0) < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CRON_SECRET"],
        message: "CRON_SECRET must be at least 32 characters in production."
      });
    }

    if (value.STORAGE_PROVIDER === "LOCAL_FS" && !hasConfiguredValue(value.STORAGE_LOCAL_ROOT)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STORAGE_LOCAL_ROOT"],
        message: "STORAGE_LOCAL_ROOT is required when STORAGE_PROVIDER=LOCAL_FS."
      });
    }

    if (value.STORAGE_PROVIDER === "S3_STORAGE") {
      const requiredS3: Array<keyof typeof value> = ["S3_STORAGE_ENDPOINT", "S3_STORAGE_BUCKET", "S3_STORAGE_REGION"];

      for (const key of requiredS3) {
        if (!hasConfiguredValue(value[key])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_PROVIDER=S3_STORAGE.`
          });
        }
      }
    }
  });

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const shouldSkipValidation = process.env.SKIP_ENV_VALIDATION === "true";

const parsed = envSchema.safeParse(process.env);
let resolvedEnv: z.infer<typeof envSchema>;

if (!parsed.success) {
  if (!isBuildPhase && !shouldSkipValidation) {
    const formatted = JSON.stringify(parsed.error.format(), null, 2);
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  // Fallback keeps build-time imports alive; runtime still enforces strict validation.
  resolvedEnv = process.env as unknown as z.infer<typeof envSchema>;
} else {
  resolvedEnv = parsed.data;
}

export const env = resolvedEnv;
