import type { Metadata } from "next";
import { RegisterForm } from "@/components/customer/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return <RegisterForm />;
}
