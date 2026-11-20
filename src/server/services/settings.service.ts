import { getStoreSettings } from "@/server/repositories/settings.repo";

export async function getSettings() {
  return getStoreSettings();
}
