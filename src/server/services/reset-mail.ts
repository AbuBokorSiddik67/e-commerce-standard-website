import { createPasswordResetToken } from "./auth-security";

export function resetMailConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.PASSWORD_RESET_FROM?.trim();
  const base = env.AUTH_URL ?? env.NEXTAUTH_URL;
  if (!apiKey || !from || !base) return null;
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return { apiKey, from, origin: url.origin };
  } catch { return null; }
}

export async function sendCustomerReset(email: string) {
  const config = resetMailConfig();
  if (!config) return; // Fail closed: never create a token that cannot be emailed.
  const reset = await createPasswordResetToken(email);
  if (!reset) return;
  const link = `${config.origin}/reset-password#token=${reset.token}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8_000),
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [reset.email], subject: "Reset your ShopBD password",
      text: `Use this link within 20 minutes to reset your ShopBD password:\n\n${link}\n\nIgnore this email if you did not request it.` }),
  });
  await response.body?.cancel();
  if (!response.ok) throw new Error("Reset email delivery failed");
}
