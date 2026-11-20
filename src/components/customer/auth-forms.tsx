"use client";

import { startTransition, useEffect, useState } from "react";
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
      if (!result?.ok || result.error) {
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
    try {
      const result = await registerAction(payload);
      if (!result.success) { toast.error(result.error ?? "Could not create account"); return; }
      const login = await signIn("credentials", { email: payload.email, password: payload.password, redirect: false }).catch(() => null);
      toast.success("Account created!");
      router.push(login?.ok && !login.error ? "/account" : "/login");
      router.refresh();
    } catch { toast.error("Could not create account"); }
    finally { setLoading(false); }
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
            minLength={12}
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
            minLength={12}
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
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await requestPasswordResetAction({ email: String(formData.get("email") ?? "") });
      if (!result.success) { toast.error(result.error ?? "Could not request a reset"); return; }
      setSent(true);
    } catch { toast.error("Could not request a reset. Try again shortly."); }
    finally { setLoading(false); }
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
            If that email is eligible, you’ll receive password reset instructions.
          </p>

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

export function ResetPasswordForm() {
  const [token, setToken] = useState<string>();
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    startTransition(() => setToken(value));
  }, []);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await resetPasswordAction({ token, password: String(formData.get("password") ?? ""), confirmPassword: String(formData.get("confirmPassword") ?? "") });
      if (!result.success) { toast.error(result.error ?? "Could not reset password"); return; }
      window.history.replaceState(null, "", "/reset-password");
      toast.success("Password updated. Please sign in.");
      router.replace("/login");
    } catch { toast.error("Could not reset password. Try again shortly."); }
    finally { setLoading(false); }
  }

  if (token === undefined) return <FormShell title="Reset password" subtitle="Checking your reset link…"><span /></FormShell>;
  if (!/^[0-9a-f]{64}$/.test(token)) {
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
            minLength={12}
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
            minLength={12}
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
