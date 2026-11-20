import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/customer/auth-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  // The token is in the URL fragment and never enters server navigation or page props.
  return <ResetPasswordForm />;
}
