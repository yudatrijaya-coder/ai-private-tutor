"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface CpuSample {
  percent: number | null;
  cores: number;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
}
interface MemoryInfo {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
}
interface DiskInfo {
  filesystem: string;
  mount: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
}
interface HostMetrics {
  cpu: CpuSample;
  memory: MemoryInfo;
  disks: DiskInfo[];
  uptimeSeconds: number;
  hostname: string;
  bootedAt: string;
  nodeVersion: string;
  capturedAt: string;
}
interface ServiceStatus {
  id: string;
  label: string;
  description: string;
  kind: "pm2" | "user-unit" | "root-unit";
  unit: string;
  controllable: boolean;
  blockedReason?: string;
  state: "online" | "stopped" | "errored" | "unknown";
  detail: string;
  restarts?: number;
  uptimeSeconds?: number;
  memoryBytes?: number;
  cpuPercent?: number;
}
interface HeavyProcess {
  pid: number;
  memoryBytes: number;
  cpuPercent: number;
  ageSeconds: number;
  user: string;
  command: string;
  killable: boolean;
  protectedReason?: string;
}

const REFRESH_MS = 5000;

function bytes(n: number | undefined): string {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function duration(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}h ${h}j`;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

/** Colour ramp shared by the bars: calm below 70%, warning above 85%. */
function barColour(percent: number): string {
  if (percent >= 85) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColour(percent)}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

/**
 * Boundary parsers.
 *
 * The panel reads its own API, but the response still crosses a network
 * boundary: a 502 from Caddy, a login redirect, or a future API change would
 * otherwise be trusted as a well-formed `HostMetrics`. These guards check the
 * few fields the UI actually renders and reject the rest, instead of casting
 * `unknown` to a domain type and hoping.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}

function parseMetrics(raw: unknown): HostMetrics | null {
  if (!isRecord(raw)) return null;
  const { cpu, memory, disks } = raw;
  if (!isRecord(cpu) || !isRecord(memory) || !Array.isArray(disks)) return null;
  if (!isNumberOrNull(cpu.percent) || typeof cpu.cores !== "number") return null;
  if (typeof memory.usedPercent !== "number" || typeof memory.totalBytes !== "number") return null;

  // The remaining fields are display-only; a missing one renders as "—" rather
  // than failing the whole refresh.
  return raw as unknown as HostMetrics;
}

function parseServices(raw: unknown): ServiceStatus[] | null {
  if (!isRecord(raw) || !Array.isArray(raw.services)) return null;
  return raw.services.filter((s): s is ServiceStatus => {
    if (!isRecord(s)) return false;
    return (
      typeof s.id === "string" &&
      typeof s.label === "string" &&
      typeof s.state === "string" &&
      typeof s.controllable === "boolean"
    );
  });
}

function parseProcesses(raw: unknown): HeavyProcess[] | null {
  if (!isRecord(raw) || !Array.isArray(raw.processes)) return null;
  return raw.processes.filter((p): p is HeavyProcess => {
    if (!isRecord(p)) return false;
    return (
      typeof p.pid === "number" &&
      typeof p.memoryBytes === "number" &&
      typeof p.command === "string" &&
      typeof p.killable === "boolean"
    );
  });
}

function parseActionResult(raw: unknown): { ok: boolean; text: string } {
  if (!isRecord(raw)) return { ok: false, text: "" };
  const ok = raw.ok === true;
  const text =
    typeof raw.message === "string"
      ? raw.message
      : typeof raw.error === "string"
        ? raw.error
        : "";
  return { ok, text };
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StateBadge({ state }: { state: ServiceStatus["state"] }) {
  const map: Record<ServiceStatus["state"], string> = {
    online: "bg-emerald-100 text-emerald-800",
    stopped: "bg-slate-200 text-slate-700",
    errored: "bg-red-100 text-red-800",
    unknown: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[state]}`}>{state}</span>
  );
}

export function SystemPanel() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<HostMetrics | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [processes, setProcesses] = useState<HeavyProcess[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyPid, setBusyPid] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [rebootOpen, setRebootOpen] = useState(false);
  const [rebootConfirm, setRebootConfirm] = useState("");
  const [rebootBusy, setRebootBusy] = useState(false);


  // Guards against a slow refresh landing after the component unmounted, and
  // against two overlapping polls.
  const alive = useRef(true);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [mRes, sRes, pRes] = await Promise.all([
        fetch("/api/system/metrics", { cache: "no-store" }),
        fetch("/api/system/services", { cache: "no-store" }),
        fetch("/api/system/processes", { cache: "no-store" }),
      ]);

      if (mRes.status === 401 || sRes.status === 401) {
        router.refresh(); // session expired — re-render the server component
        return;
      }
      if (!mRes.ok || !sRes.ok) throw new Error("Gagal memuat data.");

      const [rawMetrics, rawServices] = await Promise.all([mRes.json(), sRes.json()]);
      // The process list is an enhancement: a failure here must not blank out
      // the metrics and services that did load.
      const rawProcesses: unknown = pRes.ok ? await pRes.json().catch(() => null) : null;
      if (!alive.current) return;

      const nextMetrics = parseMetrics(rawMetrics);
      const nextServices = parseServices(rawServices);
      if (!nextMetrics || nextServices === null) {
        throw new Error("Format respons tidak dikenali.");
      }
      setMetrics(nextMetrics);
      setServices(nextServices);
      setProcesses(parseProcesses(rawProcesses) ?? []);
      setError(null);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally {
      inFlight.current = false;
    }
  }, [router]);

  useEffect(() => {
    alive.current = true;

    // First poll is scheduled rather than called inline: a synchronous
    // setState in the effect body would cascade a render before the browser
    // has painted, and the lint rule flags exactly that. Scheduling it also
    // means the whole polling loop shares one cancellation path.
    const kickoff = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), REFRESH_MS);

    return () => {
      alive.current = false;
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [load]);

  async function act(id: string, action: "start" | "stop" | "restart") {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch("/api/system/services/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const outcome = parseActionResult(raw);
      setNotice({
        ok: outcome.ok,
        text: outcome.text || (res.ok ? "Selesai." : "Gagal."),
      });
      // Give the daemon a moment to settle before re-reading state.
      setTimeout(() => void load(), 1500);
    } catch {
      setNotice({ ok: false, text: "Tidak dapat menghubungi server." });
    } finally {
      setBusyId(null);
    }
  }

  async function signalPid(pid: number, action: "term" | "kill") {
    setBusyPid(pid);
    setNotice(null);
    try {
      const res = await fetch("/api/system/processes/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pid, action }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const outcome = parseActionResult(raw);
      setNotice({
        ok: outcome.ok,
        text: outcome.text || (res.ok ? "Selesai." : "Gagal."),
      });
      setTimeout(() => void load(), 1200);
    } catch {
      setNotice({ ok: false, text: "Tidak dapat menghubungi server." });
    } finally {
      setBusyPid(null);
    }
  }

  // Reboot is a separate flow from `act`: it needs the confirmation phrase and
  // it must survive the page going away (the response arrives, then the host
  // drops), so the UI states plainly what happens next.
  async function reboot() {
    if (rebootBusy) return;
    setRebootBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/system/host/reboot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: rebootConfirm }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const outcome = parseActionResult(raw);
      setNotice({ ok: outcome.ok, text: outcome.text || (res.ok ? "Selesai." : "Gagal.") });
      if (res.ok) {
        setRebootConfirm("");
        setRebootOpen(false);
      }
    } catch {
      setNotice({ ok: false, text: "Tidak dapat menghubungi server." });
    } finally {
      setRebootBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/system/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Kontrol Sistem</h1>
          <p className="text-sm text-slate-500">
            {metrics ? `${metrics.hostname} · up ${duration(metrics.uptimeSeconds)}` : "memuat…"}
            {" · refresh otomatis tiap 5 detik"}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700
                     transition hover:bg-slate-50"
        >
          Keluar
        </button>
      </header>

      {error && (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card title="CPU">
          <p className="text-3xl font-semibold text-slate-900">
            {metrics?.cpu.percent === null || metrics?.cpu.percent === undefined
              ? "—"
              : `${metrics.cpu.percent}%`}
          </p>
          <div className="mt-3">
            <Bar percent={metrics?.cpu.percent ?? 0} />
          </div>
          <dl className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <dt>Core</dt>
              <dd>{metrics?.cpu.cores ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Load 1 / 5 / 15 m</dt>
              <dd>
                {metrics
                  ? `${metrics.cpu.loadAvg1} / ${metrics.cpu.loadAvg5} / ${metrics.cpu.loadAvg15}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Memori">
          <p className="text-3xl font-semibold text-slate-900">
            {metrics ? `${metrics.memory.usedPercent}%` : "—"}
          </p>
          <div className="mt-3">
            <Bar percent={metrics?.memory.usedPercent ?? 0} />
          </div>
          <dl className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <dt>Terpakai / total</dt>
              <dd>
                {metrics
                  ? `${bytes(metrics.memory.usedBytes)} / ${bytes(metrics.memory.totalBytes)}`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Tersedia</dt>
              <dd>{bytes(metrics?.memory.availableBytes)}</dd>
            </div>
            {metrics && metrics.memory.swapTotalBytes > 0 && (
              <div className="flex justify-between">
                <dt>Swap</dt>
                <dd>
                  {bytes(metrics.memory.swapUsedBytes)} / {bytes(metrics.memory.swapTotalBytes)}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card title="Storage">
          {metrics && metrics.disks.length > 0 ? (
            <div className="space-y-4">
              {metrics.disks.slice(0, 3).map((d) => (
                <div key={`${d.filesystem}-${d.mount}`}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-mono text-xs text-slate-600">{d.mount}</span>
                    <span className="font-semibold text-slate-900">{d.usedPercent}%</span>
                  </div>
                  <Bar percent={d.usedPercent} />
                  <p className="mt-1 text-xs text-slate-500">
                    {bytes(d.usedBytes)} / {bytes(d.totalBytes)} · sisa {bytes(d.availableBytes)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">—</p>
          )}
        </Card>
      </div>

      <Card title="Service">
        <ul className="divide-y divide-slate-100">
          {services.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{s.label}</span>
                  <StateBadge state={s.state} />
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                    {s.kind}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  {s.description} · <span className="font-mono">{s.unit}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {s.detail}
                  {s.restarts ? ` · restart ${s.restarts}×` : ""}
                  {s.uptimeSeconds !== undefined ? ` · up ${duration(s.uptimeSeconds)}` : ""}
                  {s.memoryBytes ? ` · ${bytes(s.memoryBytes)}` : ""}
                  {s.cpuPercent ? ` · CPU ${s.cpuPercent}%` : ""}
                </p>
                {!s.controllable && s.blockedReason && (
                  <p className="mt-1 text-xs text-amber-700">{s.blockedReason}</p>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                {(["start", "stop", "restart"] as const).map((a) => (
                  <button
                    key={a}
                    disabled={!s.controllable || busyId === s.id}
                    onClick={() => act(s.id, a)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition
                      ${
                        a === "stop"
                          ? "border border-red-200 text-red-700 hover:bg-red-50"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }
                      disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {busyId === s.id ? "…" : a}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6">
        <Card title="Instance agent (proses besar)">
          <p className="mb-4 text-xs text-slate-500">
            Proses CLI agent yang berjalan di luar PM2/systemd — biasanya sisa task
            yang dibatalkan. Mematikan proses <strong>tidak</strong> menghentikan
            servicenya; untuk itu gunakan tombol di kartu Service. Tidak ada
            &ldquo;resume&rdquo;: setelah proses mati, jalankan ulang task-nya.
          </p>
          {processes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Tidak ada instance agent di atas 50 MB. Kondisi normal.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {processes.map((p) => (
                <li key={p.pid} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">PID {p.pid}</span>
                      <span className="font-semibold text-slate-900">{bytes(p.memoryBytes)}</span>
                      <span className="text-xs text-slate-500">CPU {p.cpuPercent}%</span>
                      <span className="text-xs text-slate-400">umur {duration(p.ageSeconds)}</span>
                      {!p.killable && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          dilindungi
                        </span>
                      )}
                    </div>
                    <p className="truncate font-mono text-xs text-slate-600">{p.command}</p>
                    {p.protectedReason && (
                      <p className="mt-1 text-xs text-amber-700">{p.protectedReason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      disabled={!p.killable || busyPid === p.pid}
                      onClick={() => signalPid(p.pid, "term")}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium
                                 text-slate-700 transition hover:bg-slate-50
                                 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyPid === p.pid ? "…" : "Hentikan"}
                    </button>
                    <button
                      disabled={!p.killable || busyPid === p.pid}
                      onClick={() => signalPid(p.pid, "kill")}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium
                                 text-red-700 transition hover:bg-red-50
                                 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Force kill
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Host">
          {!rebootOpen ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Reboot mematikan panel ini juga. Butuh konfirmasi ketik, bukan satu klik.
              </p>
              <button
                onClick={() => {
                  setRebootOpen(true);
                  setNotice(null);
                }}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700
                           transition hover:bg-red-50"
              >
                Reboot VPS…
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Situs dan panel akan mati sampai host hidup lagi (biasanya &lt;1 menit).
                Ketik <code className="rounded bg-slate-100 px-1 font-mono">REBOOT VPS</code>{" "}
                untuk mengonfirmasi.
              </p>
              <input
                value={rebootConfirm}
                onChange={(e) => setRebootConfirm(e.target.value)}
                placeholder="REBOOT VPS"
                className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm
                           text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
              <div className="flex gap-2">
                <button
                  onClick={reboot}
                  disabled={rebootConfirm !== "REBOOT VPS" || rebootBusy}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition
                             hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {rebootBusy ? "Mengirim…" : "Reboot sekarang"}
                </button>
                <button
                  onClick={() => {
                    setRebootOpen(false);
                    setRebootConfirm("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700
                             transition hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
