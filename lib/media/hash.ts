import { createHash } from "node:crypto";

export function sha256OfBuffer(buffer: Buffer | ArrayBuffer | Uint8Array): string {
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  return createHash("sha256").update(data).digest("hex");
}
