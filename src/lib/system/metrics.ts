/**
 * Host metrics for the `/system` panel.
 *
 * Everything here is read from `/proc` and `os`, plus one `df` call for
 * filesystem usage. No dependency on an extra monitoring package: the panel
 * needs four numbers to answer "is the box healthy", and `os.loadavg()` +
 * `/proc/meminfo` + `df` cover that.
 *
 * CPU utilisation needs two samples: `/proc/stat` reports counters since boot,
 * so a single read tells you the average since uptime began, not what the box
 * is doing now. `cpuPercent()` keeps the previous sample in module scope and
 * returns the delta; the first call of a process returns `null` rather than a
 * misleading lifetime average.
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CpuSample {
  /** Busy percentage between the previous sample and this one, or null on first read. */
  percent: number | null;
  cores: number;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
}

export interface MemoryInfo {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
}

export interface DiskInfo {
  filesystem: string;
  mount: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
}

export interface HostMetrics {
  cpu: CpuSample;
  memory: MemoryInfo;
  disks: DiskInfo[];
  uptimeSeconds: number;
  hostname: string;
  bootedAt: string;
  nodeVersion: string;
  capturedAt: string;
}

let previousCpu: { idle: number; total: number } | null = null;

/** Parse the aggregate `cpu` line of /proc/stat. */
async function readCpuCounters(): Promise<{ idle: number; total: number }> {
  const stat = await readFile("/proc/stat", "utf8");
  const line = stat.split("\n").find((l) => l.startsWith("cpu "));
  if (!line) throw new Error("/proc/stat has no aggregate cpu line");

  // user nice system idle iowait irq softirq steal guest guest_nice
  const fields = line.trim().split(/\s+/).slice(1).map(Number);
  const [user, nice, system, idle, iowait, irq, softirq, steal] = fields;
  const idleTotal = idle + (iowait ?? 0);
  const total =
    user + nice + system + idle + (iowait ?? 0) + (irq ?? 0) + (softirq ?? 0) + (steal ?? 0);
  return { idle: idleTotal, total };
}

export async function cpuSample(): Promise<CpuSample> {
  const current = await readCpuCounters();
  const load = os.loadavg();

  let percent: number | null = null;
  if (previousCpu) {
    const idleDelta = current.idle - previousCpu.idle;
    const totalDelta = current.total - previousCpu.total;
    // A zero delta means the call happened within the same clock tick; report
    // the previous reading instead of emitting NaN.
    if (totalDelta > 0) percent = Math.round(((totalDelta - idleDelta) / totalDelta) * 1000) / 10;
  }
  previousCpu = current;

  return {
    percent,
    cores: os.cpus().length,
    loadAvg1: Math.round(load[0] * 100) / 100,
    loadAvg5: Math.round(load[1] * 100) / 100,
    loadAvg15: Math.round(load[2] * 100) / 100,
  };
}

export async function memoryInfo(): Promise<MemoryInfo> {
  const meminfo = await readFile("/proc/meminfo", "utf8");
  const kv = new Map<string, number>();
  for (const line of meminfo.split("\n")) {
    const m = /^(\w+):\s+(\d+)\s*kB/.exec(line);
    if (m) kv.set(m[1], Number(m[2]) * 1024);
  }

  const total = kv.get("MemTotal") ?? 0;
  const available = kv.get("MemAvailable") ?? kv.get("MemFree") ?? 0;
  const used = Math.max(0, total - available);

  const swapTotal = kv.get("SwapTotal") ?? 0;
  const swapFree = kv.get("SwapFree") ?? 0;

  return {
    totalBytes: total,
    usedBytes: used,
    availableBytes: available,
    usedPercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
    swapTotalBytes: swapTotal,
    swapUsedBytes: Math.max(0, swapTotal - swapFree),
  };
}

/**
 * Filesystem usage via `df`.
 *
 * `df -P` (POSIX output) keeps the columns stable regardless of long device
 * names. Overlay/container filesystems are skipped because they report the
 * host's numbers a second time and make the panel confusing.
 */
export async function diskInfo(): Promise<DiskInfo[]> {
  const { stdout } = await execFileAsync("df", ["-P", "-k"], { timeout: 5000 });
  const lines = stdout.trim().split("\n").slice(1);

  const skipFs = /^(tmpfs|devtmpfs|overlay|squashfs|udev|none)$/;
  const disks: DiskInfo[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;
    const [filesystem, blocks, used, available, percent, ...mountParts] = parts;
    const mount = mountParts.join(" ");
    if (skipFs.test(filesystem)) continue;
    if (mount.startsWith("/snap")) continue;

    disks.push({
      filesystem,
      mount,
      totalBytes: Number(blocks) * 1024,
      usedBytes: Number(used) * 1024,
      availableBytes: Number(available) * 1024,
      usedPercent: Number(String(percent).replace("%", "")),
    });
  }

  // Root filesystem first (that is the one that fills up), then by size.
  return disks.sort((a, b) => {
    const aRoot = a.mount === "/" ? 0 : 1;
    const bRoot = b.mount === "/" ? 0 : 1;
    if (aRoot !== bRoot) return aRoot - bRoot;
    return b.totalBytes - a.totalBytes;
  });
}

export async function hostMetrics(): Promise<HostMetrics> {
  const [cpu, memory, disks] = await Promise.all([cpuSample(), memoryInfo(), diskInfo()]);
  return {
    cpu,
    memory,
    disks,
    uptimeSeconds: Math.round(os.uptime()),
    hostname: os.hostname(),
    bootedAt: new Date(Date.now() - os.uptime() * 1000).toISOString(),
    nodeVersion: process.version,
    capturedAt: new Date().toISOString(),
  };
}
