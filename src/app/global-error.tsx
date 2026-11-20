"use client";

const styles = {
  body: {
    margin: 0,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "radial-gradient(circle at 20% 10%, #eff6ff 0%, #f8fafc 45%, #f1f5f9 100%)",
    color: "#0f172a",
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  } satisfies React.CSSProperties,
  card: {
    width: "100%",
    maxWidth: "540px",
    textAlign: "center",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "22px",
    padding: "44px 30px",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.10)",
  } satisfies React.CSSProperties,
  icon: {
    width: "76px",
    height: "76px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
    border: "1px solid #fde68a",
  } satisfies React.CSSProperties,
  eyebrow: {
    margin: "26px 0 0",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color: "#64748b",
  },
  title: {
    margin: "10px 0 0",
    fontSize: "30px",
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  text: {
    margin: "16px auto 0",
    maxWidth: "410px",
    fontSize: "15px",
    lineHeight: 1.65,
    color: "#475569",
  },
  textSmall: {
    margin: "8px auto 0",
    maxWidth: "410px",
    fontSize: "13px",
    lineHeight: 1.65,
    color: "#64748b",
  },
  actions: {
    marginTop: "28px",
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "center",
    gap: "12px",
  },
  primary: {
    display: "inline-block",
    padding: "12px 22px",
    borderRadius: "10px",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    border: "1px solid #0f172a",
    cursor: "pointer",
    textDecoration: "none",
  } satisfies React.CSSProperties,
  secondary: {
    display: "inline-block",
    padding: "12px 22px",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 600,
    border: "1px solid #cbd5e1",
    cursor: "pointer",
    textDecoration: "none",
  } satisfies React.CSSProperties,
  reference: {
    margin: "24px 0 0",
    fontSize: "12px",
    color: "#94a3b8",
  },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
} as const;

function WarningIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d97706"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={styles.body}>
        <main style={styles.card}>
          <div style={styles.icon}>
            <WarningIcon />
          </div>
          <p style={styles.eyebrow}>Store update</p>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.text}>
            We're having a small technical issue right now. Your cart and account
            are safe — please try again in a moment.
          </p>
          <p style={styles.textSmall}>
            কিছু একটা সমস্যা হয়েছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।
          </p>

          <div style={styles.actions}>
            <button type="button" onClick={reset} style={styles.primary}>
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={styles.secondary}>
              Back to home
            </a>
          </div>

          {error?.digest && (
            <p style={styles.reference}>
              Reference ID: <span style={styles.code}>{error.digest}</span>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
