"use client";

import { logClientError } from "@/lib/client-diagnostics";
import { useEffect } from "react";
import { AppError } from "@/components/shared/app-error";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError("shop-error", error);
  }, [error]);

  return <AppError error={error} onRetry={reset} />;
}
