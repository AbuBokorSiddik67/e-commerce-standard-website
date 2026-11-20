import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { IMAGE_ALLOWED_TYPES, IMAGE_MAX_SIZE } from "@/lib/constants";
import { logError } from "@/lib/errors";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const urls: string[] = [];

    const uploadThingConfigured = Boolean(
      process.env.UPLOADTHING_TOKEN ||
        (process.env.UPLOADTHING_SECRET && process.env.UPLOADTHING_APP_ID),
    );

    for (const file of files) {
      if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed. Use JPEG, PNG, or WebP.` },
          { status: 400 },
        );
      }
      if (file.size > IMAGE_MAX_SIZE) {
        return NextResponse.json({ error: "File exceeds 4MB limit" }, { status: 400 });
      }
    }

    if (uploadThingConfigured) {
      const { UTApi } = await import("uploadthing/server");
      const utapi = new UTApi();
      const results = await utapi.uploadFiles(files);
      for (const result of results) {
        if (result.error) {
          return NextResponse.json({ error: result.error.message ?? "Upload failed" }, { status: 500 });
        }
        if (result.data?.url) urls.push(result.data.url);
      }
    } else {
      // No external storage configured: save files locally under public/uploads
      // and return a short URL. Never return base64 data URLs here, because they
      // are later sent through Server Actions and exceed the 1 MB body limit.
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        const ext = EXT_BY_TYPE[file.type] ?? "bin";
        const filename = `${randomUUID()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(uploadDir, filename), buffer);
        urls.push(`/uploads/${filename}`);
      }
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "IMAGE_UPLOAD",
      entity: "Image",
      detail: { count: urls.length },
    });

    return NextResponse.json({ urls });
  } catch (error) {
    logError("api.upload", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again with a smaller image." },
      { status: 500 },
    );
  }
}
