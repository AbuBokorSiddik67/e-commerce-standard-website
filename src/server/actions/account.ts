"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { allowPublicRequest } from "@/lib/shared-rate-limit";
import { after } from "next/server";
import { changePassword, resetPassword } from "@/server/services/auth-security";
import { sendCustomerReset } from "@/server/services/reset-mail";
import { actionErrorMessage, logError } from "@/lib/errors";
import { registerSchema, passwordResetRequestSchema, passwordResetSchema, changePasswordSchema } from "@/lib/validations/auth";
import { profileSchema, addressSchema } from "@/lib/validations/account";
import {
  registerCustomer,
  updateCustomerProfile,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  toggleWishlist,
} from "@/server/services/account.service";

import { cancelCustomerOrder } from "@/server/services/order.service";
import { z } from "zod";

type ActionResult = { success: boolean; error?: string; wishlisted?: boolean };

const resourceId = z.string().trim().min(1).max(100);

async function customerId() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "CUSTOMER") return null;
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

  try {
    if (!(await allowPublicRequest("registration", await headers(), 5, 300, parsed.data.email))) return { success: false, error: "Please wait before trying again" };
    await registerCustomer(parsed.data);
    return { success: true };
  } catch (error) {
    logError("account.register", error);
    return { success: false, error: "Could not create account. If you already have an account, sign in or reset your password." };
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

  if (id !== null && !resourceId.safeParse(id).success) return { success: false, error: "Address not found" };
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
  if (!resourceId.safeParse(id).success) return { success: false, error: "Invalid item" };
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
  if (!resourceId.safeParse(id).success) return { success: false, error: "Invalid item" };
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
  if (!resourceId.safeParse(productId).success) return { success: false, error: "Invalid item" };
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
  if (!parsed.success) return { success: false, error: "Enter a valid email address" };
  const requestHeaders = await headers();
  // Neither account lookup nor provider latency changes the public response.
  after(async () => {
    try {
      if (await allowPublicRequest("password-reset", requestHeaders, 3, 900, parsed.data.email)) await sendCustomerReset(parsed.data.email);
    } catch (error) { logError("account.passwordResetDelivery", error); }
  });
  return { success: true };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const failure = { success: false, error: "This reset link is invalid or has expired. Request a new link." };
  try {
    if (!(await allowPublicRequest("password-reset-confirm", await headers(), 8, 300, parsed.data.token))) return failure;
    return (await resetPassword(parsed.data)) ? { success: true } : failure;
  } catch (error) { logError("account.passwordReset", error); return failure; }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Please sign in" };
    if (session.user.role === "ADMIN" && parsed.data.password.length < 16) return { success: false, error: "Use at least 16 characters for an admin password" };
    if (!(await allowPublicRequest("password-change", await headers(), 5, 900, session.user.id))) return { success: false, error: "Please wait before trying again" };
    if (await changePassword(session.user.id, parsed.data.currentPassword, parsed.data.password)) return { success: true };
  } catch (error) { logError("account.passwordChange", error); }
  return { success: false, error: "Could not change your password. Check your current password and try again." };
}

export async function cancelMyOrderAction(orderNumber: unknown): Promise<ActionResult> {
  const userId = await customerId();
  const parsed = z.string().trim().min(1).max(100).safeParse(orderNumber);
  if (!userId || !parsed.success) return { success: false, error: "Order not found" };
  try {
    await cancelCustomerOrder(userId, parsed.data);
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${encodeURIComponent(parsed.data)}`);
    revalidatePath("/admin/orders");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: actionErrorMessage("account.cancelOrder", error, "Could not cancel this order") };
  }
}
