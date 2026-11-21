"use client";

import { logClientError } from "@/lib/client-diagnostics";
import { useEffect } from "react";
import { toast } from "sonner";

const BENIGN_ERROR = /ResizeObserver loop|Script error\.?/i;

function isAbortError(reason: unknown): boolean {
  return (
    typeof reason === "object" &&
    reason !== null &&
    "name" in reason &&
    (reason as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Catches errors that React error boundaries cannot catch: failed server-action
 * calls from event handlers and other unhandled promise rejections. Instead of
 * failing silently, the customer gets a short, friendly notification.
 */
export function GlobalErrorListener() {
  useEffect(() => {
    let lastNotified = 0;

    function notify() {
      const now = Date.now();
      if (now - lastNotified < 4000) return;
      lastNotified = now;
      toast.error("Something went wrong. Please try again.", {
        id: "app-global-error",
        description: "If this keeps happening, please contact our support team.",
      });
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      if (isAbortError(event.reason)) return;
      logClientError("client.unhandledRejection", event.reason);
      notify();
    }

    function onWindowError(event: ErrorEvent) {
      if (BENIGN_ERROR.test(event.message ?? "")) return;
      logClientError("client.uncaughtError", event.error ?? event.message);
      notify();
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError);
    };
  }, []);

  return null;
}
