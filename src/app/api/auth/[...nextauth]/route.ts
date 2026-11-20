import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { BodyLimitError, readBoundedBody } from "@/lib/request-security";
import { logError } from "@/lib/errors";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  try {
    const bytes = await readBoundedBody(request, 16 * 1024);
    return await handlers.POST(new NextRequest(request.url, { method: "POST", headers: request.headers, body: bytes }));
  } catch (error) {
    if (error instanceof BodyLimitError) return NextResponse.json({ error: "Invalid authentication request" }, { status: 413 });
    logError("auth.handler", error);
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 500 });
  }
}
