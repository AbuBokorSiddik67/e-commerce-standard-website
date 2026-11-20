import { auth } from "@/lib/auth";
import { logError } from "@/lib/errors";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

async function getSessionSafely() {
  try {
    return await auth();
  } catch (error) {
    // A misconfigured secret or a temporary auth failure should send the user
    // to the sign-in page instead of crashing the whole route.
    logError("authGuard.session", error);
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSessionSafely();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }
  return session;
}

export async function requireAuth() {
  const session = await getSessionSafely();
  if (!session?.user) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireRole(role: Role) {
  const session = await getSessionSafely();
  if (!session?.user || session.user.role !== role) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireCustomer() {
  const session = await getSessionSafely();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    redirect("/login");
  }
  return session;
}

export async function getOptionalSession() {
  return getSessionSafely();
}
