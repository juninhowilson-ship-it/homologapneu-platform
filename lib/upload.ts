import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { ValidationError } from "@/lib/errors";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function saveUploadedImage(
  formData: FormData,
  folder: string
): Promise<{ url: string }> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ValidationError("Arquivo não enviado");
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new ValidationError(
      "Formato não suportado. Use PNG, JPEG, WEBP ou SVG."
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new ValidationError("Arquivo maior que 2MB");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  const fileName = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, fileName), buffer);

  return { url: `/uploads/${folder}/${fileName}` };
}
