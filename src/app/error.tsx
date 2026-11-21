"use client";

import { logClientError } from "@/lib/client-diagnostics";
import { useEffect } from "react";
import { AppError } from "@/components/shared/app-error";

export default function RootRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError("root-error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <AppError error={error} onRetry={reset} />
    </div>
  );
}
