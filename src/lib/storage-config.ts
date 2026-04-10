import path from "node:path";

export type StorageProvider = "LOCAL_FS" | "S3_STORAGE";

export type S3StorageConfig = {
  endpoint: string;
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "/uploads";
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function getStorageProvider(): StorageProvider {
  const configuredProvider = (process.env.STORAGE_PROVIDER ?? "").toUpperCase();
  if (configuredProvider === "S3_STORAGE") {
    return "S3_STORAGE";
  }

  if (configuredProvider === "LOCAL_FS") {
    return "LOCAL_FS";
  }

  const legacyDriver = (process.env.STORAGE_DRIVER ?? "").toLowerCase();
  if (legacyDriver === "s3") {
    return "S3_STORAGE";
  }

  return "LOCAL_FS";
}

export function getLocalStorageRoot(): string {
  if (process.env.STORAGE_LOCAL_ROOT) {
    return path.resolve(process.env.STORAGE_LOCAL_ROOT);
  }

  if (process.env.NODE_ENV === "production") {
    return "/app/public/uploads";
  }

  return path.join(process.cwd(), "public", "uploads");
}

export function getStoragePublicBaseUrl(): string {
  return normalizeBaseUrl(process.env.STORAGE_PUBLIC_BASE_URL ?? "/uploads");
}

export function getS3StorageConfig(): S3StorageConfig {
  return {
    endpoint: process.env.S3_STORAGE_ENDPOINT ?? "",
    bucket: process.env.S3_STORAGE_BUCKET ?? "",
    region: process.env.S3_STORAGE_REGION,
    accessKeyId: process.env.S3_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_STORAGE_SECRET_ACCESS_KEY
  };
}
