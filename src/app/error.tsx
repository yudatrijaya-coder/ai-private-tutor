"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--su-bg)", color: "var(--su-text)" }}
    >
      <div
        className="text-center p-8 rounded-2xl max-w-md"
        style={{ backgroundColor: "var(--su-bg-card)" }}
      >
        <div className="text-6xl mb-4">😅</div>
        <h1
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Ups, ada yang error!
        </h1>
        <p className="mb-4 text-sm" style={{ color: "var(--su-text-dim)" }}>
          Jangan khawatir, ini bukan kamu — ini kami. Coba lagi ya!
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-xl font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: "var(--su-primary, #6366f1)" }}
        >
          Coba Lagi
        </button>
        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary
              className="text-xs cursor-pointer"
              style={{ color: "var(--su-text-dim)" }}
            >
              Detail Error (development only)
            </summary>
            <pre
              className="mt-2 p-3 rounded-lg text-xs overflow-auto max-h-60"
              style={{
                backgroundColor: "var(--su-bg, #0f1117)",
                color: "var(--su-danger, #ef4444)",
                border: "1px solid var(--su-border, #2a2e3a)",
              }}
            >
              {error.message}
              {"\n\n"}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
