"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/server/actions/account";

function FormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid email or password");
        return;
      }
      toast.success("Welcome back!");
      router.push("/account");
      router.refresh();
    } catch {
      toast.error("We couldn't sign you in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormShell
      title="Sign in"
      subtitle="Access your orders, addresses and wishlist."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </FormShell>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };
    setLoading(true);
    const result = await registerAction(payload);
    if (!result.success) {
      setLoading(false);
      toast.error(result.error ?? "Could not create account");
      return;
    }
    let signedIn = true;
    try {
      await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });
    } catch {
      signedIn = false;
    }
    setLoading(false);
    toast.success("Account created!");
    router.push(signedIn ? "/account" : "/login");
    router.refresh();
  }

  return (
    <FormShell
      title="Create account"
      subtitle="Track orders, save addresses and build a wishlist."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="register-name">Full name</Label>
          <Input id="register-name" name="name" autoComplete="name" required />
        </div>
        <div>
          <Label htmlFor="register-email">Email</Label>
          <Input id="register-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="register-phone">Phone</Label>
          <Input
            id="register-phone"
            name="phone"
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
            required
          />
        </div>
        <div>
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <Label htmlFor="register-confirm">Confirm password</Label>
          <Input
            id="register-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </FormShell>
  );
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    const result = await requestPasswordResetAction({
      email: String(formData.get("email") ?? ""),
    });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not send reset link");
      return;
    }
    setSent(true);
    setResetUrl(result.resetUrl ?? null);
  }

  return (
    <FormShell
      title="Forgot password"
      subtitle="Enter your account email to receive a reset link."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            If an account exists for that email, a reset link has been created.
          </p>
          {resetUrl && (
            <p className="break-all rounded-md bg-muted p-3 text-xs">
              Dev reset link:{" "}
              <Link href={resetUrl} className="text-primary underline">
                {resetUrl}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="forgot-email">Email</Label>
            <Input id="forgot-email" name="email" type="email" autoComplete="email" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
    </FormShell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    const result = await resetPasswordAction({
      token,
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not reset password");
      return;
    }
    toast.success("Password updated. Please sign in.");
    router.push("/login");
  }

  if (!token) {
    return (
      <FormShell title="Reset password" subtitle="This reset link is invalid or incomplete.">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Request a new link
        </Link>
      </FormShell>
    );
  }

  return (
    <FormShell title="Reset password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <Input
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </FormShell>
  );
}
