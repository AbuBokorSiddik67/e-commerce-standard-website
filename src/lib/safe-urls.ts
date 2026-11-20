// Hosted images are fetched by the Next.js optimizer; do not accept wildcard Internet hosts.
export const mediaHosts = ["utfs.io", "*.ufs.sh", ...(process.env.MEDIA_IMAGE_HOSTS ?? "")
  .split(",").map((host) => host.trim().toLowerCase()).filter((host) => /^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/.test(host))];
// The checked-in product catalog lives in one explicit static folder. Do not
// allow arbitrary subdirectories, encoded paths or non-raster extensions.
const uploadPath = /^\/uploads\/(?:products\/)?[a-z0-9][a-z0-9_.-]{0,160}\.(?:jpe?g|png|webp)$/i;

export function safeLink(value: unknown, relative = true) {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (relative && value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function safeImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  if (uploadPath.test(value)) return value;
  const safe = safeLink(value, false);
  if (!safe) return null;
  const url = new URL(safe);
  return !url.port && mediaHosts.some((host) => host.startsWith("*.") ? url.hostname.endsWith(host.slice(1)) : url.hostname === host) ? safe : null;
}
