/**
 * Reusable skeleton loading components.
 * Uses CSS pulse animation — no external dependencies.
 */

/* ── Base skeleton block ── */

export function SkeletonBlock({
  className = "",
  style,
  width,
  height,
  rounded = "rounded-xl",
}: {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}) {
  return (
    <div
      className={`animate-pulse ${rounded} ${className}`}
      style={{
        backgroundColor: "var(--su-bg-hover, #1e2230)",
        width: width ?? "100%",
        height: height ?? "1rem",
        ...style,
      }}
    />
  );
}

/* ── Skeleton text lines ── */

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height="0.75rem"
        />
      ))}
    </div>
  );
}

/* ── Dashboard card shimmer ── */

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 space-y-3 ${className}`}
      style={{
        backgroundColor: "var(--su-bg-card, #181b24)",
        border: "1px solid var(--su-border, #2a2e3a)",
      }}
    >
      <div className="flex items-start gap-3">
        <SkeletonBlock width="2.5rem" height="2.5rem" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock width="40%" height="1rem" />
          <SkeletonBlock width="60%" height="0.75rem" />
        </div>
        <SkeletonBlock width="0.625rem" height="0.625rem" rounded="rounded-full" />
      </div>
      <div className="space-y-1.5 pt-2">
        <SkeletonBlock width="100%" height="0.5rem" />
        <SkeletonBlock width="100%" height="0.5rem" />
        <SkeletonBlock width="100%" height="0.5rem" />
      </div>
      <SkeletonBlock width="50%" height="0.75rem" />
    </div>
  );
}

/* ── Stats bar skeleton ── */

export function SkeletonStatsBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-4 space-y-2"
          style={{
            backgroundColor: "var(--su-bg-card, #181b24)",
            border: "1px solid var(--su-border, #2a2e3a)",
          }}
        >
          <SkeletonBlock width="70%" height="0.75rem" />
          <SkeletonBlock width="40%" height="1.75rem" />
        </div>
      ))}
    </div>
  );
}

/* ── Agent pipeline skeleton ── */

export function SkeletonAgentGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-4 space-y-3"
          style={{
            backgroundColor: "var(--su-bg-card, #181b24)",
            border: "1px solid var(--su-border, #2a2e3a)",
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBlock width="2.5rem" height="2.5rem" rounded="rounded-full" />
              <div className="space-y-1.5">
                <SkeletonBlock width="5rem" height="0.875rem" />
                <SkeletonBlock width="7rem" height="0.75rem" />
              </div>
            </div>
            <SkeletonBlock width="1.5rem" height="1.5rem" rounded="rounded-full" />
          </div>
          <SkeletonBlock width="100%" height="0.5rem" />
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <SkeletonBlock key={j} width="2.5rem" height="0.75rem" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Queue monitor skeleton ── */

export function SkeletonQueueMonitor() {
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: "var(--su-bg-card, #181b24)",
        border: "1px solid var(--su-border, #2a2e3a)",
      }}
    >
      <div className="flex items-center justify-between">
        <SkeletonBlock width="10rem" height="1.25rem" />
        <SkeletonBlock width="5rem" height="0.75rem" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg p-3 space-y-2"
            style={{ backgroundColor: "var(--su-bg-hover, #1e2230)" }}
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock width="4rem" height="0.75rem" />
              <SkeletonBlock width="0.625rem" height="0.625rem" rounded="rounded-full" />
            </div>
            <SkeletonBlock width="3rem" height="0.75rem" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Student detail skeleton ── */

export function SkeletonStudentDetail() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <SkeletonBlock width="5rem" height="0.875rem" />

      {/* Header card */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: "var(--su-bg-card, #181b24)",
          border: "1px solid var(--su-border, #2a2e3a)",
        }}
      >
        <div className="flex items-start gap-4">
          <SkeletonBlock width="4rem" height="4rem" rounded="rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock width="50%" height="1.5rem" />
            <SkeletonBlock width="70%" height="0.875rem" />
            <SkeletonBlock width="40%" height="0.875rem" />
          </div>
        </div>
      </div>

      {/* Grid: mastery + schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              backgroundColor: "var(--su-bg-card, #181b24)",
              border: "1px solid var(--su-border, #2a2e3a)",
            }}
          >
            <SkeletonBlock width="10rem" height="1.25rem" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <SkeletonBlock width="6rem" height="0.875rem" />
                  <SkeletonBlock width="4rem" height="0.875rem" />
                </div>
                <SkeletonBlock width="100%" height="0.625rem" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{
              backgroundColor: "var(--su-bg-card, #181b24)",
              border: "1px solid var(--su-border, #2a2e3a)",
            }}
          >
            <SkeletonBlock width="8rem" height="1.25rem" />
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} width="100%" height="3rem" />
            ))}
          </div>
        </div>
      </div>

      {/* Interventions */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{
          backgroundColor: "var(--su-bg-card, #181b24)",
          border: "1px solid var(--su-border, #2a2e3a)",
        }}
      >
        <SkeletonBlock width="6rem" height="1.25rem" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/* ── Student page skeleton (light theme) ── */

export function SkeletonStudentPage() {
  return (
    <div className="space-y-5">
      {/* Hero card */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: "var(--st-bg-card, #ffffff)" }}
      >
        <SkeletonBlock width="30%" height="0.75rem" rounded="rounded-lg" />
        <SkeletonBlock width="60%" height="1.5rem" rounded="rounded-lg" />
        <SkeletonBlock width="8rem" height="2.5rem" rounded="rounded-xl" />
      </div>

      {/* Subject grid */}
      <div>
        <SkeletonBlock width="8rem" height="1rem" rounded="rounded-lg" className="mb-3" />
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "var(--st-bg-card, #ffffff)" }}
        >
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <SkeletonBlock width="4rem" height="4rem" rounded="rounded-full" />
                <SkeletonBlock width="3rem" height="0.75rem" rounded="rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div>
        <SkeletonBlock width="8rem" height="1rem" rounded="rounded-lg" className="mb-3" />
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ backgroundColor: "var(--st-bg-card, #ffffff)" }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <SkeletonBlock width="1.5rem" height="1.5rem" rounded="rounded-lg" />
              <div className="flex-1 space-y-1">
                <SkeletonBlock width="60%" height="0.875rem" />
                <SkeletonBlock width="40%" height="0.75rem" />
              </div>
              <SkeletonBlock width="3rem" height="1.25rem" rounded="rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Progress page skeleton (light theme) ── */

export function SkeletonProgressPage() {
  return (
    <div className="space-y-5">
      {/* Streak Calendar */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: "var(--st-bg-card, #ffffff)" }}
      >
        <SkeletonBlock width="5rem" height="1.25rem" rounded="rounded-lg" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} width="100%" height="0.75rem" rounded="rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 30 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              width="100%"
              height="2rem"
              rounded="rounded-full"
            />
          ))}
        </div>
      </div>

      {/* Mastery Chart */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: "var(--st-bg-card, #ffffff)" }}
      >
        <SkeletonBlock width="10rem" height="1.25rem" rounded="rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <SkeletonBlock width="6rem" height="0.875rem" />
              <SkeletonBlock width="3rem" height="0.875rem" />
            </div>
            <SkeletonBlock width="100%" height="0.75rem" />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 space-y-2 text-center"
            style={{ backgroundColor: "var(--st-bg-card, #ffffff)" }}
          >
            <SkeletonBlock width="1.5rem" height="1.5rem" rounded="rounded-lg" className="mx-auto" />
            <SkeletonBlock width="50%" height="1.25rem" rounded="rounded-lg" className="mx-auto" />
            <SkeletonBlock width="60%" height="0.75rem" rounded="rounded-lg" className="mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
