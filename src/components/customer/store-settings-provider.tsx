"use client";

import { useStoreSettingsStore } from "@/hooks/use-store-settings";
import { useEffect } from "react";

export function StoreSettingsProvider({
  settings,
  children,
}: {
  settings: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const setSettings = useStoreSettingsStore((s) => s.setSettings);
  useEffect(() => {
    setSettings(settings);
  }, [settings, setSettings]);
  return <>{children}</>;
}
