"use client";

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
    console.error("[store:shop-error]", error);
  }, [error]);

  return <AppError error={error} onRetry={reset} />;
}
