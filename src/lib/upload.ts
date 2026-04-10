import { saveUpload } from "@/lib/storage";

export async function saveLocalUpload(file: File, subdirectory = "local") {
  return saveUpload(file, { subdirectory });
}
