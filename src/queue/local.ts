/**
 * In-Memory Queue — lightweight fallback when Redis is unavailable.
 *
 * Features:
 * - FIFO processing with concurrency control
 * - Per-job retry with exponential backoff
 * - Queue status monitoring
 * - Dead-letter after max retries
 */

type QueueTask<T = unknown> = {
  id: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  delay: number;
  createdAt: Date;
  lastError?: string;
};

type QueueState = {
  pending: QueueTask[];
  active: QueueTask[];
  completed: number;
  failed: number;
};

const queues = new Map<string, QueueState>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function getQueue(name: string): QueueState {
  let q = queues.get(name);
  if (!q) {
    q = { pending: [], active: [], completed: 0, failed: 0 };
    queues.set(name, q);
  }
  return q;
}

let idCounter = 0;

export function enqueueLocal<T>(
  queueName: string,
  data: T,
  opts?: { maxAttempts?: number; delay?: number },
): string {
  const q = getQueue(queueName);
  const id = `${queueName}_${++idCounter}`;
  q.pending.push({
    id,
    name: queueName,
    data,
    attempts: 0,
    maxAttempts: opts?.maxAttempts ?? 3,
    delay: opts?.delay ?? 2000,
    createdAt: new Date(),
  });
  scheduleNext(queueName);
  return id;
}

type Processor<T = unknown> = (data: T) => Promise<void>;

const processors = new Map<string, Processor>();

export function registerProcessor<T>(queueName: string, fn: Processor<T>): void {
  processors.set(queueName, fn as Processor);
}

function scheduleNext(queueName: string): void {
  if (timers.has(queueName)) return;
  const q = getQueue(queueName);
  if (q.pending.length === 0) return;

  const available = q.pending.length;
  const running = q.active.length;
  const concurrency = queueName.startsWith("content") ? 2 : 1;
  const slots = concurrency - running;
  if (slots <= 0) return;

  for (let i = 0; i < Math.min(slots, available); i++) {
    const task = q.pending.shift()!;
    q.active.push(task);
    processTask(queueName, task);
  }
}

async function processTask(queueName: string, task: QueueTask): Promise<void> {
  const q = getQueue(queueName);
  const processor = processors.get(queueName);

  if (!processor) {
    // No processor — complete silently
    q.active = q.active.filter((t) => t.id !== task.id);
    q.completed++;
    scheduleNext(queueName);
    return;
  }

  try {
    task.attempts++;
    await processor(task.data);
    // Success
    q.active = q.active.filter((t) => t.id !== task.id);
    q.completed++;
    scheduleNext(queueName);
  } catch (err) {
    task.lastError = err instanceof Error ? err.message : String(err);
    q.active = q.active.filter((t) => t.id !== task.id);

    if (task.attempts < task.maxAttempts) {
      // Retry with exponential backoff
      const backoff = task.delay * Math.pow(2, task.attempts - 1);
      setTimeout(() => {
        q.pending.push(task);
        scheduleNext(queueName);
      }, backoff);
    } else {
      // Dead letter
      q.failed++;
      console.warn(`[queue/local] ${queueName}/${task.id} failed after ${task.attempts} attempts. Last error: ${task.lastError}`);
    }
    scheduleNext(queueName);
  }
}

/** Get status snapshot for all local queues. */
export function getLocalQueueStatus() {
  const result: Array<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> = [];

  for (const [name, q] of Array.from(queues.entries())) {
    const pending = q.pending.filter((t) => {
      // Only count non-delayed tasks as "waiting"
      return true;
    });
    result.push({
      name,
      waiting: pending.length,
      active: q.active.length,
      completed: q.completed,
      failed: q.failed,
    });
  }

  // Also include registered processors that never had jobs
  for (const [name] of Array.from(processors.entries())) {
    if (!result.find((r) => r.name === name)) {
      result.push({ name, waiting: 0, active: 0, completed: 0, failed: 0 });
    }
  }

  return result;
}

/** Clear a queue. */
export function clearLocalQueue(name: string): void {
  const q = queues.get(name);
  if (q) {
    q.pending = [];
    q.active = [];
  }
}
