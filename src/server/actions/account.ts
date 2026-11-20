"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { actionErrorMessage, logError } from "@/lib/errors";
import { registerSchema, passwordResetRequestSchema, passwordResetSchema } from "@/lib/validations/auth";
import { profileSchema, addressSchema } from "@/lib/validations/account";
import {
  registerCustomer,
  updateCustomerProfile,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  toggleWishlist,
  createPasswordResetToken,
  resetPassword,
} from "@/server/services/account.service";

type ActionResult = { success: boolean; error?: string; resetUrl?: string; wishlisted?: boolean };

async function clientKey(prefix: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "unknown";
  return `${prefix}:${ip}`;
}

async function customerId() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CUSTOMER") return null;
    return session.user.id;
  } catch (error) {
    logError("account.session", error);
    return null;
  }
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const limiter = rateLimit(await clientKey("register"), 3, 60_000);
  if (!limiter.success) {
    return { success: false, error: "Too many attempts. Please try again in a minute." };
  }

  try {
    await registerCustomer(parsed.data);
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("account", e, "Could not create account") };
  }
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const userId = await customerId();
  if (!userId) return { success: false, error: "Please sign in to update your profile" };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateCustomerProfile(userId, parsed.data);
    revalidatePath("/account");
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("account", e, "Could not update profile") };
  }
}

export async function saveAddressAction(id: string | null, input: unknown): Promise<ActionResult> {
  const userId = await customerId();
  if (!userId) return { success: false, error: "Please sign in to manage addresses" };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    if (id) await updateCustomerAddress(userId, id, parsed.data);
    else await createCustomerAddress(userId, parsed.data);
    revalidatePath("/account/addresses");
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("account", e, "Could not save address") };
  }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const userId = await customerId();
  if (!userId) return { success: false, error: "Please sign in to manage addresses" };
  try {
    await deleteCustomerAddress(userId, id);
    revalidatePath("/account/addresses");
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("account", e, "Could not delete address") };
  }
}

export async function setDefaultAddressAction(id: string): Promise<ActionResult> {
  const userId = await customerId();
  if (!userId) return { success: false, error: "Please sign in to manage addresses" };
  try {
    await setDefaultCustomerAddress(userId, id);
    revalidatePath("/account/addresses");
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("account", e, "Could not update address") };
  }
}

export async function toggleWishlistAction(productId: string): Promise<ActionResult> {
  const userId = await customerId();
  if (!userId) return { success: false, error: "Please sign in to save items to your wishlist" };
  try {
    const result = await toggleWishlist(userId, productId);
    revalidatePath("/account/wishlist");
    return { success: true, wishlisted: result.wishlisted };
  } catch (e) {
    return { success: false, error: actionErrorMessage("account", e, "Could not update wishlist") };
  }
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  const parsed = passwordResetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const limiter = rateLimit(await clientKey("password-reset"), 3, 60_000);
  if (!limiter.success) {
    return { success: false, error: "Too many attempts. Please try again in a minute." };
  }

  try {
    const result = await createPasswordResetToken(parsed.data.email);
    if (!result) {
      return { success: true };
    }

    const base = (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, "");

    return {
      success: true,
      resetUrl:
        process.env.NODE_ENV !== "production"
          ? `${base}/reset-password?token=${result.token}`
          : undefined,
    };
  } catch (e) {
    return {
      success: false,
      error: actionErrorMessage(
        "account.requestPasswordReset",
        e,
        "Could not start password reset right now. Please try again.",
      ),
    };
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await resetPassword(parsed.data);
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("account", e, "Could not reset password") };
  }
}
