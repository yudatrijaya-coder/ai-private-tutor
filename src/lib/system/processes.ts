/**
 * Process inspector + killer for the `/system` panel.
 *
 * Why this exists
 * ---------------
 * The service registry controls *units*. But the biggest memory consumers on
 * this host are often **ad-hoc child processes** that no unit owns: an
 * `opencode run` left behind by a cancelled task, a stranded `codebuddy`
 * session, a browser subprocess. Killing the unit would take down the service
 * that is still needed; nothing in the panel could touch the process itself.
 *
 * Security model
 * --------------
 * Unlike the service registry (fixed argv per id), this module must reference
 * arbitrary PIDs, so the guards are different:
 *
 *   1. A process is only listed here if it passes `isCandidate` — it must NOT
 *      belong to a protected unit (ai-tutor, 9router, cezar, ovis, herdr,
 *      caddy, sshd, pm2 daemon, ...). The panel can therefore never kill the
 *      web server that is serving it, or the gateway it depends on.
 *   2. `protectedReason()` is re-checked at kill time. A PID that became
 *      protected between listing and killing is refused — this closes the
 *      window where a PID could be recycled.
 *   3. Only two actions exist: SIGTERM (graceful) and SIGKILL (force). Sending
 *      an arbitrary signal is not exposed.
 *   4. Everything runs as the `ubuntu` user. Anything owned by root or another
 *      user is refused before a signal is sent, because the panel would
 *      otherwise report a confusing EPERM.
 *
 * "Resume" is deliberately absent: a process that was killed has no saved
 * state to resume from. What an operator actually wants after a kill is to
 * start the owning *service* again, which is what the service buttons do. The
 * UI states this instead of pretending a resume exists.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ProcessAction = "term" | "kill";

export interface HeavyProcess {
  pid: number;
  /** Resident set size in bytes. */
  memoryBytes: number;
  cpuPercent: number;
  /** Wall-clock age in seconds. */
  ageSeconds: number;
  user: string;
  /** Truncated command line, for identification. */
  command: string;
  /** Owning service label, when the process tree maps to one. */
  owner?: string;
  /** False when the panel must not signal this process. */
  killable: boolean;
  protectedReason?: string;
}

/**
 * Process names (lowercased basename of argv[0]) that the panel must never
 * signal. Killing any of these takes the site, the panel, or its dependencies
 * down; a "free memory" button is not worth an outage.
 */
const PROTECTED_MATCHERS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /next-server|npm\s+start|^npm$/, reason: "Proses aplikasi utama (Next.js)" },
  { pattern: /^node$/, reason: "Node generik — bisa jadi PM2/9Router/Cezar" },
  { pattern: /9router/, reason: "Gateway LLM yang dipakai semua agent" },
  { pattern: /cezar/, reason: "Cockpit agent orchestrator" },
  { pattern: /caddy/, reason: "Reverse proxy — mematikan ini memutus seluruh situs" },
  { pattern: /sshd|systemd|dbus|polkit|udev/, reason: "Proses sistem inti" },
  { pattern: /PM2\s+v\d/, reason: "PM2 God daemon — mematikan ini menghentikan semua app" },
  { pattern: /herdr|ovis/, reason: "Backend terminal Ovis" },
  { pattern: /hermes/, reason: "Hermes gateway" },
  { pattern: /caddy|postgres|redis|mysql/, reason: "Layanan infrastruktur" },
  { pattern: /^bash$|^sh$|^sudo$/, reason: "Shell/sudo — bukan kandidat" },
];

/**
 * Only agent CLI processes are candidates. An allowlist is safer than a
 * blocklist here: a new unknown process simply does not appear, instead of
 * appearing and being killable by mistake.
 */
const CANDIDATE_MATCHERS: RegExp[] = [
  /opencode/,
  /codebuddy|\bcbc\b/,
  /claude/,
  /codex/,
  /grok/,
  /^bun\b.*\b(omp|server)/,
  /python.*hermes/,
];

function basenameCommand(cmd: string): string {
  return cmd.toLowerCase();
}

/** Returns a reason when the process must not be signalled. */
export function protectedReason(command: string): string | undefined {
  const c = basenameCommand(command);
  for (const m of PROTECTED_MATCHERS) {
    if (m.pattern.test(c)) return m.reason;
  }
  return undefined;
}

function isCandidate(command: string): boolean {
  const c = basenameCommand(command);
  return CANDIDATE_MATCHERS.some((re) => re.test(c));
}

interface RawProc {
  pid: number;
  rssKb: number;
  cpu: number;
  etimeSeconds: number;
  user: string;
  command: string;
}

/**
 * Parse `ps -eo pid,rss,pcpu,etimes,user,args`.
 *
 * `etimes` is used instead of `etime` because the latter is formatted
 * (`1-21:25:50`) and would need a parser; `etimes` is seconds since start.
 */
async function listProcesses(): Promise<RawProc[]> {
  const { stdout } = await execFileAsync(
    "ps",
    ["-eo", "pid,rss,pcpu,etimes,user,args", "--no-headers", "--sort=-rss"],
    { timeout: 8000, maxBuffer: 4 * 1024 * 1024 },
  );

  const out: RawProc[] = [];
  for (const line of stdout.split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    if (!m) continue;
    out.push({
      pid: Number(m[1]),
      rssKb: Number(m[2]),
      cpu: Number(m[3]),
      etimeSeconds: Number(m[4]),
      user: m[5],
      command: m[6],
    });
  }
  return out;
}

/** Minimum resident memory before a process is worth showing. */
const MIN_MEMORY_BYTES = 50 * 1024 * 1024;

export async function heavyProcesses(): Promise<HeavyProcess[]> {
  const [procs, ownUser] = await Promise.all([
    listProcesses(),
    Promise.resolve(process.env.USER || "ubuntu"),
  ]);

  const result: HeavyProcess[] = [];
  for (const p of procs) {
    const memoryBytes = p.rssKb * 1024;
    if (memoryBytes < MIN_MEMORY_BYTES) continue;
    if (!isCandidate(p.command)) continue;
    // The panel's own process tree is never a candidate even if the name
    // matches — `next-server` is already protected, this is belt and braces.
    if (p.pid === process.pid) continue;

    const prot = protectedReason(p.command);
    const rightUser = p.user === ownUser;

    result.push({
      pid: p.pid,
      memoryBytes,
      cpuPercent: Math.round(p.cpu * 10) / 10,
      ageSeconds: p.etimeSeconds,
      user: p.user,
      command: p.command.length > 120 ? `${p.command.slice(0, 117)}…` : p.command,
      killable: !prot && rightUser,
      protectedReason: prot ?? (rightUser ? undefined : `Dijalankan oleh user "${p.user}"`),
    });
  }

  return result;
}

export interface ProcessActionResult {
  ok: boolean;
  message: string;
}

/**
 * Signal one process.
 *
 * Re-validates everything against a fresh `ps` read: the PID the caller holds
 * may have exited and been recycled since the list was rendered, and the
 * replacement could be a protected process.
 */
export async function signalProcess(
  pid: number,
  action: ProcessAction,
): Promise<ProcessActionResult> {
  if (!Number.isInteger(pid) || pid <= 1) {
    return { ok: false, message: "PID tidak valid." };
  }

  let current: RawProc | undefined;
  try {
    const procs = await listProcesses();
    current = procs.find((p) => p.pid === pid);
  } catch {
    return { ok: false, message: "Tidak dapat membaca daftar proses." };
  }

  if (!current) {
    return { ok: false, message: `Proses ${pid} sudah tidak berjalan.` };
  }

  const prot = protectedReason(current.command);
  if (prot) {
    return { ok: false, message: `Ditolak: ${prot}.` };
  }

  const ownUser = process.env.USER || "ubuntu";
  if (current.user !== ownUser) {
    return { ok: false, message: `Ditolak: proses milik user "${current.user}".` };
  }

  if (!isCandidate(current.command)) {
    return { ok: false, message: "Ditolak: proses ini bukan instance agent." };
  }

  const signal = action === "kill" ? "KILL" : "TERM";
  try {
    await execFileAsync("kill", [`-${signal}`, String(pid)], { timeout: 5000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // `kill` exiting non-zero usually means the process vanished first, which
    // is the outcome the operator wanted.
    return { ok: false, message: `Gagal mengirim SIG${signal}: ${msg.slice(0, 160)}` };
  }

  const label = action === "kill" ? "SIGKILL (paksa)" : "SIGTERM (sopan)";
  return {
    ok: true,
    message: `PID ${pid} dikirimi ${label}. Jika proses masih ada setelah ~5 detik, gunakan Force kill.`,
  };
}
