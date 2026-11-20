import { NextResponse } from "next/server";
import { lstat, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { allowPublicRequest } from "@/lib/shared-rate-limit";
import { BodyLimitError, isSameOrigin, readBoundedBody } from "@/lib/request-security";
import { MAX_UPLOAD_BODY, MAX_UPLOAD_FILES, normalizeImage } from "@/server/services/upload-image";

export const runtime = "nodejs";
const failure = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });

async function authorize(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return failure("Unauthorized", 401);
  if (session.user.role !== "ADMIN" || !isSameOrigin(req)) return failure("Forbidden", 403);
  return session.user.id;
}

export async function POST(req: Request) {
  const localFiles: string[] = [];
  const cloudKeys: string[] = [];
  let deleteCloud: ((keys: string[]) => Promise<unknown>) | undefined;
  try {
    const admin = await authorize(req);
    if (typeof admin !== "string") return admin;
    if (!(await allowPublicRequest("image-upload", req.headers, 12, 60, admin))) return failure("Try again shortly", 429);
    const configured = Boolean(process.env.UPLOADTHING_TOKEN);
    const type = req.headers.get("content-type");
    if (!type || !/^multipart\/form-data\s*;/i.test(type)) return failure("Invalid upload request", 415);
    const bytes = await readBoundedBody(req, MAX_UPLOAD_BODY);
    const form = await new Response(bytes, { headers: { "content-type": type } }).formData().catch(() => null);
    const entries = form && [...form.entries()];
    if (!entries?.length || entries.length > MAX_UPLOAD_FILES || entries.some(([key]) => key !== "files")) return failure("Select one to four images", 400);
    const files: File[] = [];
    for (const [, value] of entries) {
      const image = await normalizeImage(value);
      if (!image) return failure("Use valid JPEG, PNG or WebP images up to 4 MB and 4096 pixels per edge", 400);
      files.push(image);
    }
    if (!configured && process.env.NODE_ENV === "production") return failure("Image storage is not configured", 503);
    const urls: string[] = [];
    if (configured) {
      const { UTApi } = await import("uploadthing/server");
      const ut = new UTApi();
      deleteCloud = (keys) => ut.deleteFiles(keys);
      const results = await ut.uploadFiles(files);
      for (const result of results) {
        if (result.data) { cloudKeys.push(result.data.key); urls.push(result.data.ufsUrl); }
      }
      if (urls.length !== files.length) throw new Error("Storage rejected one or more files");
    } else {
      const directory = path.join(process.cwd(), "public", "uploads");
      await mkdir(directory, { recursive: true });
      if (!(await lstat(directory)).isDirectory()) throw new Error("Unsafe upload directory");
      for (const file of files) {
        const target = path.join(directory, file.name);
        await writeFile(target, new Uint8Array(await file.arrayBuffer()), { flag: "wx", mode: 0o644 });
        localFiles.push(target);
        urls.push(`/uploads/${file.name}`);
      }
    }
    await prisma.auditLog.create({ data: { userId: admin, action: "IMAGE_UPLOAD", entity: "Image", detail: { count: urls.length } } });
    return NextResponse.json({ urls }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof BodyLimitError) return failure("Images exceed the upload limit", 413);
    const results = await Promise.allSettled([...localFiles.map((file) => unlink(file)), ...(cloudKeys.length && deleteCloud ? [deleteCloud(cloudKeys)] : [])]);
    if (results.some((result) => result.status === "rejected")) logError("api.upload.cleanup", new Error());
    logError("api.upload", error);
    return failure("Upload failed. Please try again.", 500);
  }
}

export async function DELETE(req: Request) {
  const authorization = await authorize(req);
  if (typeof authorization !== "string") return authorization;
  // Media may be shared by existing products/receipts. Authorized admin edits
  // can detach references. Physical deletion is restricted to storage operators.
  return failure("Direct file deletion is not supported", 405);
}
