import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getLocalStorageRoot, getS3StorageConfig, getStorageProvider, getStoragePublicBaseUrl } from "@/lib/storage-config";

type SaveUploadOptions = {
  subdirectory?: string;
};

function normalizeSubdirectory(value: string) {
  return value.replace(/^\/+|\/+$/g, "") || "local";
}

function buildSafeFileName(originalName: string) {
  const safeName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `${Date.now()}-${safeName}`;
}

async function saveToLocal(file: File, subdirectory: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = buildSafeFileName(file.name);

  const rootDirectory = getLocalStorageRoot();

  const targetDirectory = path.join(rootDirectory, subdirectory);
  await mkdir(targetDirectory, { recursive: true });

  const fullPath = path.join(targetDirectory, fileName);
  await writeFile(fullPath, buffer);

  const publicBaseUrl = getStoragePublicBaseUrl();
  return `${publicBaseUrl}/${subdirectory}/${fileName}`;
}

async function saveToS3Compatible(file: File, subdirectory: string): Promise<string> {
  void file;
  void subdirectory;
  const s3 = getS3StorageConfig();

  // Placeholder path for future external object storage support.
  throw new Error(
    `S3_STORAGE provider is not implemented yet. Configure S3_STORAGE_* env vars and implement uploader. Endpoint=${s3.endpoint || "missing"}, Bucket=${s3.bucket || "missing"}`
  );
}

export async function saveUpload(file: File, options: SaveUploadOptions = {}): Promise<string> {
  const subdirectory = normalizeSubdirectory(options.subdirectory ?? "local");
  const provider = getStorageProvider();

  if (provider === "S3_STORAGE") {
    return saveToS3Compatible(file, subdirectory);
  }

  return saveToLocal(file, subdirectory);
}
