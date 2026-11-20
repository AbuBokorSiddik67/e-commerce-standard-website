import { hexToHsl } from "@/lib/utils";

// Store settings already normalize validated hex colors to six digits.
export function colorLuminance(hex: string) {
  return [1, 3, 5].reduce((sum, index, i) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return sum + [0.2126, 0.7152, 0.0722][i] * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  }, 0);
}
export function contrastRatio(a: string, b: string) {
  const levels = [colorLuminance(a), colorLuminance(b)];
  return (Math.max(...levels) + 0.05) / (Math.min(...levels) + 0.05);
}
export function onHex(hex: string) {
  return colorLuminance(hex) > 0.179 ? "0 0% 0%" : "0 0% 100%";
}
export function readableOnLight(hex: string) {
  return contrastRatio(hex, "#edf2fa") >= 4.5 ? hexToHsl(hex) : "222 47% 11%";
}
