export function escapeCsv(value: string) {
  // Spreadsheet formula indicators can follow spaces and control characters.
  const text = /^[\s\u0000-\u001f\u007f\uFEFF]*[=+\-@]/u.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}
