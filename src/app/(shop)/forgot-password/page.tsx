import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/customer/auth-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
