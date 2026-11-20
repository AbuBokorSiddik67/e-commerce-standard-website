import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { IMAGE_MAX_SIZE } from "@/lib/constants";

export const MAX_UPLOAD_FILES = 4;
export const MAX_UPLOAD_BODY = MAX_UPLOAD_FILES * IMAGE_MAX_SIZE + 64 * 1024;
const MAX_EDGE = 4096;
const MAX_PIXELS = 12_000_000;

function signature(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/** Output contains only decoded pixels, never the original bytes, metadata or name. */
export async function normalizeImage(value: FormDataEntryValue) {
  if (!(value instanceof File) || value.size < 1 || value.size > IMAGE_MAX_SIZE) return null;
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/jpg": "jpeg", "image/png": "png", "image/webp": "webp" };
  const expected = formats[value.type];
  if (!expected) return null;
  const input = Buffer.from(await value.arrayBuffer());
  if (signature(input) !== expected) return null;
  try {
    const image = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "warning" });
    const meta = await image.metadata();
    if (meta.format !== expected || !meta.width || !meta.height || (meta.pages ?? 1) > 1 ||
        meta.width > MAX_EDGE || meta.height > MAX_EDGE || meta.width * meta.height > MAX_PIXELS) return null;
    const clean = await image.rotate().webp({ quality: 86 }).toBuffer();
    if (clean.length > IMAGE_MAX_SIZE) return null;
    return new File([new Uint8Array(clean)], `${randomUUID()}.webp`, { type: "image/webp" });
  } catch { return null; }
}
