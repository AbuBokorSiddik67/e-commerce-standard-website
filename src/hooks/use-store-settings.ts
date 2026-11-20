"use client";

import { create } from "zustand";

type StoreSettingsState = {
  settings: Record<string, unknown> | null;
  setSettings: (s: Record<string, unknown>) => void;
};

export const useStoreSettingsStore = create<StoreSettingsState>((set) => ({
  settings: null,
  setSettings: (s) => set({ settings: s }),
}));

export function useStoreSettings() {
  return useStoreSettingsStore((s) => s.settings);
}
