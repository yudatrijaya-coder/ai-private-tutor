/**
 * Service registry + control for the `/system` panel.
 *
 * Security model
 * --------------
 * Nothing here accepts a command, a unit name, or a path from the caller.
 * A request names a **registry id** ("hermes", "ai-tutor"); the registry maps
 * that id to one fixed set of argv tokens. Anything not in the registry is
 * rejected before a process is spawned, so the worst a compromised panel
 * session can do is restart a service that is already listed here.
 *
 * Three kinds of target, because they are managed by three different daemons
 * and have different permission requirements on this host:
 *
 *   pm2        — PM2 apps owned by the `ubuntu` user. Controlled directly.
 *   user-unit  — systemd --user units in /run/user/1000. Controllable, but
 *                only with XDG_RUNTIME_DIR pointing at that bus.
 *   root-unit  — system units (dsh-web, ovis-web). Controlled through
 *                `sudo -n systemctl`, which this host grants NOPASSWD.
 *
 * Catatan 2026-10-27: versi pertama file ini menyatakan root-unit TIDAK bisa
 * dikontrol karena "sudo diblokir (no_new_privs)". Itu keliru — klaim tersebut
 * diuji dari shell SSH yang memang berjalan dengan no_new_privs=1, sedangkan
 * proses PM2 berjalan dengan no_new_privs=0 dan `sudo -n` berhasil (dibuktikan
 * dengan restart unit probe). Akibatnya tombol untuk DeepSeek Harness dan Ovis
 * tidak pernah ada, padahal diminta.
 *
 * Host reboot is exposed through a SEPARATE endpoint (`/api/system/host/reboot`)
 * that requires a typed confirmation, never a single click: rebooting takes
 * this panel down with it.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type TargetKind = "pm2" | "user-unit" | "root-unit";
export type ServiceState = "online" | "stopped" | "errored" | "unknown";
export type ServiceAction = "start" | "stop" | "restart";

export interface ServiceTarget {
  /** Registry id used by the API. Never a user-supplied string. */
  id: string;
  label: string;
  description: string;
  kind: TargetKind;
  /** PM2 app name, or systemd unit name. */
  unit: string;
  /** Whether this panel can actually change its state on this host. */
  controllable: boolean;
  /** Present when `controllable` is false. */
  blockedReason?: string;
}

/**
 * Registry.
 *
 * The four services named in the original request map to these units:
 *
 *   hermes    → hermes-gateway.service   (systemd --user)
 *   dsh       → dsh-web.service          (system unit, via sudo)
 *   ovis      → ovis-web.service         (system unit, via sudo)
 *   herdr     → herdr.service            (system unit, via sudo) — the
 *               terminal backend ovis-web depends on (`After=herdr.service`),
 *               so restarting ovis without herdr is not the same thing.
 */
export const SERVICES: ServiceTarget[] = [
  {
    id: "ai-tutor",
    label: "AI Private Tutor",
    description: "Aplikasi Next.js utama (PM2, port 3000)",
    kind: "pm2",
    unit: "ai-private-tutor",
    controllable: true,
  },
  {
    id: "9router",
    label: "9Router",
    description: "Gateway LLM (PM2, port 20128)",
    kind: "pm2",
    unit: "9router",
    controllable: true,
  },
  {
    id: "hermes",
    label: "Hermes Gateway",
    description: "Hermes agent gateway (systemd --user)",
    kind: "user-unit",
    unit: "hermes-gateway.service",
    controllable: true,
  },
  {
    id: "deepseek-harness",
    label: "DeepSeek Harness",
    description: "dsh web UI (systemd, port 3080)",
    kind: "root-unit",
    unit: "dsh-web.service",
    controllable: true,
  },
  {
    id: "ovis",
    label: "Ovis / Heder",
    description: "Ovis browser UI (systemd, port 7373)",
    kind: "root-unit",
    unit: "ovis-web.service",
    controllable: true,
  },
  {
    id: "herdr",
    label: "Herdr Server",
    description: "Backend terminal workspace untuk Ovis (systemd)",
    kind: "root-unit",
    unit: "herdr.service",
    controllable: true,
  },
  {
    id: "cezar",
    label: "Cezar",
    description: "Cockpit agent orchestrator (systemd --user, port 4321)",
    kind: "user-unit",
    unit: "cezar.service",
    controllable: true,
  },
  {
    id: "poster",
    label: "Poster Server",
    description: "Server poster/gambar (systemd)",
    kind: "root-unit",
    unit: "poster-server.service",
    controllable: true,
  },
  {
    id: "pm2-daemon",
    label: "PM2 Daemon",
    description: "Proses induk yang menjalankan semua aplikasi PM2",
    kind: "root-unit",
    unit: "pm2-ubuntu.service",
    controllable: true,
  },
];

export function findService(id: string): ServiceTarget | undefined {
  return SERVICES.find((s) => s.id === id);
}

/**
 * Environment for `systemctl --user`.
 *
 * The panel process is started by PM2, which does pass XDG_RUNTIME_DIR and
 * DBUS_SESSION_BUS_ADDRESS through (verified on this host). They are set
 * explicitly anyway so the call does not depend on how the process was
 * launched.
 */
function userBusEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || "/run/user/1000",
    DBUS_SESSION_BUS_ADDRESS:
      process.env.DBUS_SESSION_BUS_ADDRESS || "unix:path=/run/user/1000/bus",
  };
}

/** Run a short, fixed command and capture output. Never uses a shell. */
async function run(
  file: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      env: opts.env ?? process.env,
      timeout: opts.timeoutMs ?? 15_000,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, stdout, stderr };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? e.message ?? String(err),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Status                                                            */
/* ------------------------------------------------------------------ */

export interface ServiceStatus {
  id: string;
  label: string;
  description: string;
  kind: TargetKind;
  unit: string;
  controllable: boolean;
  blockedReason?: string;
  state: ServiceState;
  detail: string;
  /** PM2 restart counter, or systemd NRestarts. */
  restarts?: number;
  /** Uptime in seconds when the daemon reports one. */
  uptimeSeconds?: number;
  memoryBytes?: number;
  cpuPercent?: number;
}

async function pm2Status(target: ServiceTarget): Promise<ServiceStatus> {
  const res = await run("pm2", ["jlist"], { timeoutMs: 8000 });
  const base: ServiceStatus = {
    ...target,
    state: "unknown",
    detail: "PM2 tidak merespons",
  };
  if (!res.ok) return { ...base, detail: res.stderr.slice(0, 200) };

  try {
    const list = JSON.parse(res.stdout) as Array<{
      name: string;
      pid?: number;
      pm2_env?: {
        status?: string;
        restart_time?: number;
        pm_uptime?: number;
        pm_cwd?: string;
      };
      monit?: { memory?: number; cpu?: number };
    }>;
    const app = list.find((a) => a.name === target.unit);
    if (!app) {
      return { ...base, state: "stopped", detail: "tidak terdaftar di PM2" };
    }
    const status = app.pm2_env?.status ?? "unknown";
    const state: ServiceState =
      status === "online" ? "online" : status === "errored" ? "errored" : "stopped";
    const uptime = app.pm2_env?.pm_uptime
      ? Math.max(0, Math.round((Date.now() - app.pm2_env.pm_uptime) / 1000))
      : undefined;

    return {
      ...base,
      state,
      detail: `PM2: ${status}`,
      restarts: app.pm2_env?.restart_time,
      uptimeSeconds: uptime,
      // `|| undefined` turned a genuine 0 MB / 0 % into "—". Use nullish
      // checks so a real zero is still reported.
      memoryBytes: app.monit?.memory ?? undefined,
      cpuPercent: app.monit?.cpu ?? undefined,
    };
  } catch {
    return { ...base, detail: "output PM2 tidak bisa dibaca" };
  }
}

async function systemdStatus(target: ServiceTarget): Promise<ServiceStatus> {
  const isUser = target.kind === "user-unit";
  // Status is read WITHOUT sudo, even for root units: `systemctl show` is
  // readable by any user, while going through sudo would fail in contexts
  // where `sudo` is unavailable (e.g. a process running with no_new_privs=1,
  // such as anything spawned from an SSH session on this host). Reading state
  // should never depend on a privilege we do not need.
  //
  // Only state-changing actions (start/stop/restart) go through `sudo -n`, in
  // `performAction` below.
  const args = [
    ...(isUser ? ["--user"] : []),
    "show",
    target.unit,
    "-p",
    "ActiveState",
    "-p",
    "SubState",
    "-p",
    "NRestarts",
    "-p",
    "ExecMainStartTimestamp",
    "-p",
    "MemoryCurrent",
  ];

  const res = await run("systemctl", args, {
    env: isUser ? userBusEnv() : process.env,
    timeoutMs: 10_000,
  });
  const base: ServiceStatus = { ...target, state: "unknown", detail: "tidak dapat dibaca" };
  if (!res.ok) {
    return {
      ...base,
      detail: `gagal membaca status${res.stderr ? `: ${res.stderr.trim().slice(0, 160)}` : ""}`,
    };
  }

  const kv = new Map<string, string>();
  for (const line of res.stdout.trim().split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) kv.set(line.slice(0, i), line.slice(i + 1));
  }

  const active = kv.get("ActiveState") ?? "unknown";
  const sub = kv.get("SubState") ?? "";
  const state: ServiceState =
    active === "active" ? "online" : active === "failed" ? "errored" : "stopped";

  // MemoryCurrent is in bytes and can be the literal string "[not set]".
  const memRaw = kv.get("MemoryCurrent");
  const memoryBytes = memRaw && /^\d+$/.test(memRaw) ? Number(memRaw) : undefined;

  // ExecMainStartTimestamp is empty while the unit is not running.
  const started = kv.get("ExecMainStartTimestamp");
  let uptimeSeconds: number | undefined;
  if (started) {
    const parsed = Date.parse(started);
    if (!Number.isNaN(parsed)) uptimeSeconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));
  }

  return {
    ...base,
    state,
    detail: `systemd: ${active}${sub ? ` (${sub})` : ""}`,
    // `|| undefined` was wrong here: a unit that has never restarted reports
    // 0, which is a real value worth showing as "restart 0×" vs an unknown.
    restarts: Number.isFinite(Number(kv.get("NRestarts")))
      ? Number(kv.get("NRestarts"))
      : undefined,
    uptimeSeconds,
    memoryBytes,
  };
}

export async function serviceStatus(target: ServiceTarget): Promise<ServiceStatus> {
  try {
    return target.kind === "pm2" ? await pm2Status(target) : await systemdStatus(target);
  } catch (err) {
    return {
      ...target,
      state: "unknown",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function allServiceStatuses(): Promise<ServiceStatus[]> {
  return Promise.all(SERVICES.map(serviceStatus));
}

/* ------------------------------------------------------------------ */
/*  Actions                                                           */
/* ------------------------------------------------------------------ */

export interface ActionResult {
  ok: boolean;
  message: string;
  /** Populated when the action could not even be attempted. */
  blocked?: boolean;
}

export async function performAction(
  target: ServiceTarget,
  action: ServiceAction,
): Promise<ActionResult> {
  if (!target.controllable) {
    return {
      ok: false,
      blocked: true,
      message: target.blockedReason ?? "Service ini tidak dapat dikontrol dari panel.",
    };
  }

  if (target.kind === "pm2") {
    const res = await run("pm2", [action, target.unit], { timeoutMs: 30_000 });
    return {
      ok: res.ok,
      message: res.ok
        ? `PM2 ${action} ${target.unit} selesai.`
        : `PM2 ${action} gagal: ${res.stderr.trim().slice(0, 300)}`,
    };
  }

  if (target.kind === "root-unit") {
    // `-n` = non-interactive. Without it a sudo prompt would hang the request
    // until the timeout instead of failing fast; the host's NOPASSWD rule means
    // it does not normally prompt at all.
    const res = await run("sudo", ["-n", "systemctl", action, target.unit], {
      timeoutMs: 40_000,
    });
    return {
      ok: res.ok,
      message: res.ok
        ? `systemctl ${action} ${target.unit} selesai.`
        : `systemctl ${action} gagal: ${res.stderr.trim().slice(0, 300)}`,
    };
  }

  // systemd --user
  const res = await run(
    "systemctl",
    ["--user", action, target.unit],
    { env: userBusEnv(), timeoutMs: 40_000 },
  );
  return {
    ok: res.ok,
    message: res.ok
      ? `systemctl --user ${action} ${target.unit} selesai.`
      : `systemctl --user ${action} gagal: ${res.stderr.trim().slice(0, 300)}`,
  };
}
