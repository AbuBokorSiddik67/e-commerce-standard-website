"use client";

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
    console.error("[store:root-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <AppError error={error} onRetry={reset} />
    </div>
  );
}
