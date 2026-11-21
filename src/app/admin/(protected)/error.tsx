"use client";

import { logClientError } from "@/lib/client-diagnostics";
import { useEffect } from "react";
import { AppError } from "@/components/shared/app-error";

export default function AdminProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError("admin-protected-error", error);
  }, [error]);

  return <AppError variant="admin" error={error} onRetry={reset} />;
}
