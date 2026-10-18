import type { Context } from "telegraf";
import type { Student, Quiz } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";
import type { BotSession } from "../session";
import { setSession, clearSession, getSession } from "../session";
import { handleActivity } from "@/lib/gamification";
import { gradeAttempt } from "@/agents/assessment/grader";
import { escapeMd } from "@/lib/telegram-format";
import { parseQuestions } from "@/lib/quiz-grading";
import { callLLM } from "@/llm/client";
import { bot } from "../bot";

/** Callback data prefix for quiz answer buttons. */
export const QUIZ_ANS_PREFIX = "quiz:ans:";
export const QUIZ_EXIT_PREFIX = "quiz:exit";
/** Callback data prefix for subject picker buttons. */
export const QUIZ_SUBJECT_PREFIX = "quiz:subject:";
/** Callback data prefix for quiz pick buttons. */
export const QUIZ_PICK_PREFIX = "quiz:pick:";
/** Callback data prefix for the post-quiz "ulang quiz ini" button. */
export const QUIZ_REDO_PREFIX = "quiz:redo:";
/** Callback data prefix for the post-quiz "jelaskan topik ini" button. */
export const QUIZ_EXPLAIN_PREFIX = "quiz:explain:";
/** Minutes a quiz session stays alive without input. */
const QUIZ_TIMEOUT_MIN = 10;
/** Default per-question timer (seconds) when the student did not ask for one. */
export const DEFAULT_QUESTION_SECONDS = 60;
/** Bounds for a per-question timer a student can request. */
const MIN_QUESTION_SECONDS = 10;
const MAX_QUESTION_SECONDS = 300;

/** Per-question session context, persisted in SessionState.context. */
interface QuizCtxData {
  quizId: string;
  currentIndex: number;
  answers: { questionIndex: number; selectedIndex: number }[];
  startedAt?: number;
  lastActivityAt?: number;
  /** Per-question time limit in seconds (0/undefined = no limit). */
  questionSeconds?: number;
  /** Epoch ms when the current question expires. */
  deadlineAt?: number;
  /**
   * Display order: `order[displayIndex] = originalIndex`. Absent for a normal
   * quiz (display order == original). Set by "ulang, lebih sulit" so hard
   * questions show first WITHOUT renumbering — answers and grading always use
   * the original index.
   */
  order?: number[];
}

/**
 * Minimal outbound channel so the same quiz code can drive either an incoming
 * update (`ctx`) or an unsolicited send (the countdown timer, which fires with
 * no `ctx` in hand). Handlers used to take `ctx` directly, which is why the
 * timer had nowhere to send from.
 */
interface QuizSender {
  reply: (text: string, extra?: Record<string, unknown>) => Promise<unknown>;
  answerCbQuery?: (text?: string) => Promise<unknown>;
}

function ctxSender(ctx: Context): QuizSender {
  return {
    reply: (text, extra) => ctx.reply(text, extra as never),
    answerCbQuery: (text) => ctx.answerCbQuery(text).catch(() => undefined),
  };
}

/**
 * Sender for the countdown timer, which fires with no `ctx` in hand. Messages
 * go straight to the student's chat via the bot instance.
 */
function directSender(telegramId: string): QuizSender {
  return {
    reply: (text, extra) =>
      bot ? bot.telegram.sendMessage(telegramId, text, extra as never) : Promise.resolve(),
  };
}

/** Live per-question countdowns, keyed by student id. Deliberately not persisted. */
const questionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearQuestionTimer(studentId: string): void {
  const t = questionTimers.get(studentId);
  if (t) {
    clearTimeout(t);
    questionTimers.delete(studentId);
  }
}

/**
 * Start (or restart) the countdown for the question the student is on.
 *
 * The timer is only a convenience layer on top of the persisted `deadlineAt`:
 * a process restart drops the timer but not the deadline, because both answer
 * paths re-check the deadline before recording. One source of truth, two
 * triggers — so a missed timer degrades to "enforced on next input", never to
 * "no timer at all".
 */
function scheduleQuestionTimer(
  student: Student,
  quiz: Quiz,
  index: number,
  seconds: number,
): void {
  clearQuestionTimer(student.id);
  if (!seconds || seconds <= 0) return;

  const timer = setTimeout(() => {
    questionTimers.delete(student.id);
    void handleQuestionTimeout(student, quiz, index).catch((err) =>
      console.warn("[quiz] timer handler failed:", err),
    );
  }, seconds * 1000);

  // A countdown must never be the reason the process stays alive.
  (timer as { unref?: () => void }).unref?.();
  questionTimers.set(student.id, timer);
}

/** Has the current question's countdown already elapsed? */
function isPastDeadline(ctxData: QuizCtxData): boolean {
  return typeof ctxData.deadlineAt === "number" && Date.now() > ctxData.deadlineAt;
}

/**
 * Parse a per-question time limit out of the student's own words.
 * "30 detik", "1 menit", "45s" → seconds; "10 soal" → null (no unit match).
 */
export function parseQuizTimerRequest(raw: string): number | null {
  const t = (raw ?? "").toLowerCase();
  const sec = t.match(/(\d{1,3})\s*(detik|second|seconds|sec|s)\b/);
  if (sec) {
    const n = parseInt(sec[1], 10);
    if (n >= MIN_QUESTION_SECONDS && n <= MAX_QUESTION_SECONDS) return n;
  }
  const min = t.match(/(\d{1,2})\s*(menit|minute|minutes|min)\b/);
  if (min) {
    const n = parseInt(min[1], 10) * 60;
    if (n >= MIN_QUESTION_SECONDS && n <= MAX_QUESTION_SECONDS) return n;
  }
  return null;
}

/** Hard ceiling on an assembled quiz, so "buat 1000 soal" cannot melt the bot. */
export const MAX_QUIZ_QUESTIONS = 30;

/**
 * Parse how many questions the student asked for.
 *
 *   "buat 20 soal"            → 20
 *   "kasih saya 10 soal ipas" → 10
 *   "buat 3 soal"             → 3
 *   "kasih saya quiz"         → null  (no count → the bank decides)
 *
 * Only a number immediately attached to a question word counts. A bare "20"
 * (which is what a student types when they think the bot asked them something)
 * must NOT be read as a count — that was one of the ways the old flow
 * mis-answered. Values are clamped to [1, MAX_QUIZ_QUESTIONS].
 */
export function parseQuizCount(raw: string): number | null {
  const t = (raw ?? "").toLowerCase();
  // number directly before "soal"/"pertanyaan", or before "soal" with the
  // request verb between ("minta 20 soal", "buat 20 soal pilihan ganda").
  const m =
    t.match(/(\d+)\s*(?:soal|pertanyaan|butir)/) ??
    t.match(/(?:soal|pertanyaan)\s*(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, MAX_QUIZ_QUESTIONS);
}

/**
 * Is the student insisting — not just asking once?
 *
 * Used to decide whether a shortfall should be filled by GENERATING questions
 * (the expensive path) or answered honestly with what the bank already holds.
 * Naming an exact number is itself a demand; so are the words students actually
 * use when a bot under-delivers ("baca yang benar 6 bukan 20", "pokoknya 20",
 * "harus 20", "masa cuma segini").
 */
export function isDemandingQuizRequest(raw: string): boolean {
  const t = (raw ?? "").toLowerCase();
  if (!t.trim()) return false;
  // An explicit "20 soal" is already a demand for exactly that many.
  if (parseQuizCount(t) !== null) return true;
  return /\b(harus|pokoknya|serius|jangan|bukan|masa|kok|bener|benar|sesuai|tepat|persis|ulang|lagi|kurang)\b/.test(
    t,
  );
}

/**
 * Does this message ask for a quiz?
 *
 * Used as a deterministic fallback when the tutor LLM answers a quiz request
 * in prose instead of emitting `[QUIZ]` — the failure mode where the student
 * was told to type answers instead of getting buttons.
 *
 * Tuned against the real corpus of student messages: "buat soal satu2 dan saya
 * milih pill box" and "munculkan satu satu soalnya" must match, while
 * "aki mau nanya soal himpunan" (a question ABOUT a topic) must not.
 */
export function isQuizRequest(raw: string): boolean {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return false;
  // A genuine question about a topic is not a request for a quiz.
  if (/\b(nanya|tanya|bertanya|nanyak)\b/.test(t)) return false;
  if (/\b(quiz|kuis)\b/.test(t)) return true;
  if (/\blatihan\b/.test(t)) return true;
  if (/\b(buat|buatkan|bikin|kasih|beri|berikan|minta|mau|pengen|ayo|mulai)\b[^.!?]{0,25}\bsoal\b/.test(t)) {
    return true;
  }
  if (/\b(test|uji|tes)\b\s+(aku|saya|gue|gw)\b/.test(t)) return true;
  if (/\bsoal\b[^.!?]{0,25}\b(pilihan ganda|pg)\b/.test(t)) return true;
  if (/\bulang( lagi| lah)?\b/.test(t)) return true;
  // A bare subject name with a request word ("mtk dong kak", "mau ipas") is a
  // request for a quiz on that subject.
  if (
    /\b(dong|mau|pengen|minta|kasih|beri|buat|bikin|latihan|quiz|kuis)\b/.test(t) &&
    SUBJECT_ALIASES.some(([, aliases]) =>
      aliases.some((a) => new RegExp(`(^|[^a-z])${a.replace(/\./g, "\\.?")}([^a-z]|$)`).test(t)),
    )
  ) {
    return true;
  }
  return false;
}

/** Common short forms → a substring of the canonical `Material.subject`. */
const SUBJECT_ALIASES: [string, string[]][] = [
  ["matematika", ["matematika", "mtk", "math"]],
  ["indonesia", ["bahasa indonesia", "b. indonesia", "b indonesia", "bindo"]],
  ["inggris", ["bahasa inggris", "b. inggris", "b inggris", "bing", "english"]],
  ["ipas", ["ipas", "ipa", "sains"]],
  ["ips", ["ips", "sosial"]],
  ["pancasila", ["pancasila", "ppkn", "pkn", "kewarganegaraan"]],
  ["pjok", ["pjok", "penjas", "olahraga", "jasmani"]],
  ["informatika", ["informatika", "tik", "komputer"]],
];

/** Words that carry no topic information in a quiz request. */
const QUIZ_STOPWORDS = new Set([
  "quiz", "kuis", "latihan", "soal", "soalnya", "dong", "kak", "aku", "saya", "gue", "gw",
  "mau", "pengen", "minta", "kasih", "beri", "berikan", "buat", "buatkan", "bikin", "ayo",
  "mulai", "tolong", "coba", "nih", "ya", "tentang", "topik", "bab", "materi", "pelajaran",
  "mapel", "dengan", "yang", "dan", "untuk", "per", "lagi", "ulang", "test", "uji", "tes",
  "pilihan", "ganda", "sekarang", "aja", "saja", "adik", "kakak", "bisa", "boleh",
  // time units — "kasih saya quiz 30 detik" is about the clock, not the topic
  "detik", "menit", "second", "seconds", "sec", "minute", "minutes", "min", "jam", "hour",
  // subject short forms — they identify the subject, never the topic
  "mtk", "math", "bindo", "bing", "english", "ipas", "ipa", "sains", "ips", "sosial",
  "ppkn", "pkn", "penjas", "jasmani", "olahraga", "tik", "komputer", "kewarganegaraan",
]);

export interface QuizRequestInfo {
  subject?: string;
  topic?: string;
}

/**
 * The subjects this student actually has quizzes for, newest first.
 *
 * Used to match a student's words against real subject names instead of a
 * hardcoded list that would drift from the database.
 */
export async function getStudentSubjects(studentId: string): Promise<string[]> {
  const rows = await prisma.quiz.findMany({
    where: { studentId },
    select: { material: { select: { subject: true } } },
    distinct: ["materialId"],
  });
  const seen = new Set<string>();
  for (const r of rows) {
    const s = (r.material as { subject?: string } | null)?.subject;
    if (s) seen.add(s);
  }
  return [...seen];
}

/**
 * Pull the subject and topic a student named in a quiz request.
 *
 *   "quiz IPAS tentang fotosintesis" → { subject: "IPAS", topic: "fotosintesis" }
 *   "aku mau quiz matematika"        → { subject: "Matematika" }
 *   "kasih saya quiz"                → { }  (no subject → caller shows the picker)
 *
 * Subject matching runs against the student's REAL subjects (plus common short
 * forms like "mtk"/"bindo"/"penjas") so it never drifts from the database. The
 * topic is the phrase after "tentang/topik/bab/materi", or the leftover content
 * words when no marker is used.
 */
export function parseQuizRequest(raw: string, subjects: string[]): QuizRequestInfo {
  const t = (raw ?? "").toLowerCase();
  if (!t.trim()) return {};

  // 1. Subject — the student's own subject names first, then aliases.
  let subject: string | undefined;
  for (const s of subjects) {
    if (s && t.includes(s.toLowerCase())) {
      subject = s;
      break;
    }
  }
  if (!subject) {
    for (const [canon, aliases] of SUBJECT_ALIASES) {
      if (aliases.some((a) => new RegExp(`(^|[^a-z])${a.replace(/\./g, "\\.?")}([^a-z]|$)`).test(t))) {
        subject = subjects.find((s) => s.toLowerCase().includes(canon));
        if (subject) break;
      }
    }
  }

  // 2. Topic — after an explicit marker, else the leftover content words.
  const marker = t.match(/\b(?:tentang|topik|bab|materi)\s+(.+)$/);
  const candidate = marker ? marker[1] : t;
  const subjectWords = new Set((subject ?? "").toLowerCase().split(/\s+/));
  const words = candidate
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !QUIZ_STOPWORDS.has(w) && !subjectWords.has(w));
  const topic = words.length ? words.slice(0, 3).join(" ") : undefined;

  return { subject, topic };
}

interface QuizQuestion {
  question: string;
  options?: string[];
  /** Legacy field. No question in the bank carries it; kept for the "?" fallback. */
  correctAnswer?: string;
  correctIndex?: number;
  explanation?: string;
  /** "easy" | "medium" | "hard" — present on ~70% of bank questions. */
  difficulty?: string;
}

/**
 * Read `Quiz.questions` as the bot's own shape.
 *
 * `parseQuestions` is the normalisation boundary. Part of the bank stores
 * options as `{text, isCorrect}` objects rather than strings, which reached the
 * inline keyboard as "[object Object]" and made `matchAnswerToIndex` throw on
 * `o.trim()`. It also guarantees `correctIndex` is in range whenever it is set.
 */
function readQuestions(raw: unknown): QuizQuestion[] {
  return parseQuestions(raw).map((q) => ({
    question: q.question ?? "",
    options: q.options ?? [],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    difficulty: q.difficulty,
  }));
}

/**
 * Display order for "ulang, lebih sulit": hardest questions first.
 *
 * Returns `order[displayIndex] = originalIndex`. Order only — answers keep
 * addressing the ORIGINAL positions, and `sendQuestion`/feedback translate
 * through this map. Reordering the array itself and renumbering would silently
 * re-point every stored answer, because the grader reads `quiz.questions` from
 * the database in its original order.
 *
 * Exported for tests — the grading invariant depends on this staying a pure
 * permutation of `[0..n)`.
 */
export function hardFirstOrder(questions: { difficulty?: string }[]): number[] {
  const rank = (d?: string) => {
    const s = (d ?? "").toLowerCase();
    if (s === "hard" || s === "sulit" || s === "tinggi") return 0;
    if (s === "medium" || s === "sedang") return 1;
    return 2; // easy / unknown
  };
  return questions
    .map((q, i) => ({ i, r: rank(q.difficulty) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.i);
}

/** Original question index for a display position, honouring an order map. */
export function origIndex(order: number[] | undefined, displayIndex: number): number {
  return order?.[displayIndex] ?? displayIndex;
}

/** The question shown at `displayIndex`, honouring an order map. */
function questionAt(
  questions: QuizQuestion[],
  order: number[] | undefined,
  displayIndex: number,
): QuizQuestion | undefined {
  return questions[origIndex(order, displayIndex)];
}

/**
 * /quiz — subject picker with spaced-repetition priority.
 * Step 1: Show inline buttons per subject (due reviews first).
 * Step 2: Show quiz list for selected subject.
 * Step 3: Start selected quiz.
 */
export async function handleQuizStart(
  ctx: Context,
  student: Student,
  opts?: {
    questionSeconds?: number;
    subject?: string;
    topic?: string;
    /** How many questions the student asked for, if they named a number. */
    count?: number;
    /** Whether the student is insisting (drives the generate-on-demand path). */
    demanding?: boolean;
  },
): Promise<void> {
  const persona = getPersona(student.persona);

  // ── Step 1: Build subject list with due-review count ──
  const [quizzes, dueReviews] = await Promise.all([
    prisma.quiz.findMany({
      where: { studentId: student.id },
      include: { material: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reviewQueue.findMany({
      where: { studentId: student.id, mastered: false },
      select: { subject: true, id: true },
    }),
  ]);

  if (quizzes.length === 0) {
    await ctx.reply(
      `${persona.emoji} Wah, belum ada kuis untuk kamu nih, ${student.name}! ` +
        `Coba /materi dulu ya 📚`,
    );
    return;
  }

  // Remember the requested timer (if any) so the quiz picked two taps later
  // starts with it. Session context is the only place that survives the
  // subject → quiz → start hops. A later /quiz with no timer clears it, so a
  // stale limit is never silently inherited.
  const session = await getSession(student.id);
  await setSession(student.id, {
    currentMode: session.currentMode,
    context: {
      ...session.context,
      pendingQuestionSeconds: opts?.questionSeconds ?? null,
    },
  });

  // ── Fast path: the student named a subject/topic, so skip the picker ──
  // "quiz IPAS tentang fotosintesis" must NOT be answered with a generic
  // "Pilih Mapel" menu — that is the rigid behaviour. Resolve their words to a
  // real quiz and start it directly; only fall back to the picker when their
  // words match nothing.
  //
  // When they ALSO named a number of questions ("buat 20 soal …"), assemble a
  // quiz of that size instead of serving whatever single bank quiz exists —
  // merging the bank (A) and, if they insist on a specific topic, generating
  // the shortfall (B), otherwise saying so plainly (C).
  if (opts?.count && opts.count > 0 && (opts.subject || opts.topic)) {
    const counted = await tryStartCountedQuiz(ctx, student, quizzes, {
      subject: opts.subject,
      topic: opts.topic,
      count: opts.count,
      demanding: opts.demanding === true,
    });
    if (counted) return;
  }

  if (opts?.subject || opts?.topic) {
    const started = await tryStartNamedQuiz(ctx, student, quizzes, {
      subject: opts.subject,
      topic: opts.topic,
    });
    if (started) return;
  }

  // Group by subject; annotate with due review count
  const subjectMap = new Map<string, { dueCount: number; quizCount: number }>();
  const quizSubjectMap = new Map<string, typeof quizzes>();

  for (const q of quizzes) {
    const subj = (q.material as any)?.subject || "Lainnya";
    if (!quizSubjectMap.has(subj)) quizSubjectMap.set(subj, []);
    quizSubjectMap.get(subj)!.push(q);
    const cur = subjectMap.get(subj) ?? { dueCount: 0, quizCount: 0 };
    subjectMap.set(subj, { ...cur, quizCount: cur.quizCount + 1 });
  }

  for (const r of dueReviews) {
    const subj = r.subject || "Lainnya";
    const cur = subjectMap.get(subj) ?? { dueCount: 0, quizCount: 0 };
    subjectMap.set(subj, { ...cur, dueCount: cur.dueCount + 1 });
  }

  // Show subject picker
  const subjectLines = [...subjectMap.entries()].sort((a, b) => b[1].dueCount - a[1].dueCount);
  const subjectEmoji = (subj: string) => {
    if (/matematika/i.test(subj)) return "🔢";
    if (/indonesia|bahasa/i.test(subj)) return "📖";
    if (/inggris/i.test(subj)) return "🌍";
    if (/ipa|sains|biolog|fisika|kimia/i.test(subj)) return "🔬";
    if (/ips|geografi|sosiologi|ekonomi|sejarah/i.test(subj)) return "🌏";
    if (/pancasila/i.test(subj)) return "🇮🇩";
    if (/pjok|olahraga/i.test(subj)) return "⚽";
    if (/informatika/i.test(subj)) return "💻";
    return "📚";
  };

  const keyboard: { text: string; callback_data: string }[][] = subjectLines.map(([subj, meta]) => {
    const label = `${subjectEmoji(subj)} ${subj}${meta.dueCount > 0 ? ` 🔁(${meta.dueCount})` : ""}`;
    return [{ text: label, callback_data: `${QUIZ_SUBJECT_PREFIX}${subj}` }];
  });
  keyboard.push([{ text: "🚪 Keluar", callback_data: QUIZ_EXIT_PREFIX }]);

  const totalDue = dueReviews.length;
  const intro = totalDue > 0
    ? `🔁 *Pilih Mapel* — Ada *${totalDue}* soal yang perlu diulang!`
    : `📚 *Pilih Mapel*`;

  const timerNote = opts?.questionSeconds
    ? `\n⏱️ Timer per soal: *${opts.questionSeconds} detik*`
    : "";

  await ctx.reply(
    intro + timerNote + "\n\nPilih mapel yang mau dikerjakan:",
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } },
  );
}

/**
 * Resolve a named subject/topic to a real quiz and start it immediately.
 *
 * Preference order: (1) a quiz whose TOPIC matches the student's words, within
 * the named subject if there is one; (2) any quiz in the named subject (picking
 * one with a due review first). Returns false when nothing matches, so the
 * caller can fall back to the subject picker.
 */
async function tryStartNamedQuiz(
  ctx: Context,
  student: Student,
  quizzes: BankQuiz[],
  want: { subject?: string; topic?: string },
): Promise<boolean> {
  const persona = getPersona(student.persona);
  const norm = (s: string) => (s ?? "").toLowerCase().trim();

  let pool = quizzes;
  if (want.subject) {
    const ws = norm(want.subject);
    pool = pool.filter((q) => {
      const subj = norm(q.material?.subject ?? "");
      return subj.includes(ws) || ws.includes(subj);
    });
  }

  // Topic match — the student said what they want to practise.
  if (want.topic) {
    const words = norm(want.topic).split(/\s+/).filter((w) => w.length >= 3);
    const scored = pool
      .map((q) => {
        const hay = `${norm(q.material?.topic ?? "")} ${norm(q.material?.subTopic ?? "")}`;
        const hits = words.filter((w) => hay.includes(w)).length;
        return { q, hits };
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits);

    if (scored.length > 0) {
      const best = scored[0].q;
      const topic = best.material?.topic ?? want.topic;
      await ctx.reply(
        `${persona.emoji} Siap! Kuis *${escapeMd(topic)}*${
          want.subject ? ` (${escapeMd(want.subject)})` : ""
        }. Yuk mulai! 🎯`,
        { parse_mode: "Markdown" },
      );
      await handleQuizPick(ctx, student, best.id);
      return true;
    }
  }

  // Subject-only request: start a quiz in that subject (prefer a due review).
  if (want.subject && pool.length > 0) {
    const dueIds = new Set(
      (
        await prisma.reviewQueue.findMany({
          where: { studentId: student.id, subject: want.subject, mastered: false },
          select: { quizId: true },
        })
      ).map((r) => r.quizId),
    );
    const chosen = pool.find((q) => dueIds.has(q.id)) ?? pool[0];
    const topic = ((chosen.material as any)?.topic as string) ?? want.subject;
    await ctx.reply(
      `${persona.emoji} Siap! Kuis *${escapeMd(want.subject)}* — ${escapeMd(topic)}. Yuk mulai! 🎯`,
      { parse_mode: "Markdown" },
    );
    await handleQuizPick(ctx, student, chosen.id);
    return true;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*  Count-aware assembly (A: merge bank, B: generate top-up, C: be honest) */
/* ------------------------------------------------------------------ */

/**
 * A bank quiz together with the material it was built from. `material` is
 * nullable because a quiz can outlive its material row; the helpers below treat
 * a missing material as "matches nothing" rather than throwing.
 */
type BankQuiz = {
  id: string;
  materialId: string;
  questions: unknown;
  material: { subject: string; topic: string; subTopic: string | null } | null;
};

/** Normalise question text so duplicates across quizzes collapse to one. */
function questionKey(q: { question?: string }): string {
  return (q.question ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Rank the student's quizzes for a named subject/topic.
 *
 * Order: topic-word hits (most first), then quizzes with a due review, then
 * newest. Shared by the plain "start one quiz" path and the count-aware
 * assembler so both agree on what "most relevant" means.
 */
function rankCandidateQuizzes(
  quizzes: BankQuiz[],
  want: { subject?: string; topic?: string },
  dueIds: Set<string>,
): BankQuiz[] {
  const norm = (s: string) => (s ?? "").toLowerCase().trim();

  let pool = quizzes;
  if (want.subject) {
    const ws = norm(want.subject);
    const filtered = pool.filter((q) => {
      const subj = norm(q.material?.subject ?? "");
      return subj.includes(ws) || ws.includes(subj);
    });
    if (filtered.length > 0) pool = filtered;
  }

  const words = want.topic
    ? norm(want.topic).split(/\s+/).filter((w) => w.length >= 3)
    : [];

  return [...pool]
    .map((q) => {
      const hay = `${norm(q.material?.topic ?? "")} ${norm(q.material?.subTopic ?? "")}`;
      const hits = words.filter((w) => hay.includes(w)).length;
      return { q, hits };
    })
    .sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      const ad = dueIds.has(a.q.id) ? 1 : 0;
      const bd = dueIds.has(b.q.id) ? 1 : 0;
      if (bd !== ad) return bd - ad;
      return 0;
    })
    .map((s) => s.q);
}

/**
 * Start a quiz holding (about) `want.count` questions on the student's named
 * subject/topic, assembling it from what the bank already holds.
 *
 * Strategy, in the order the product owner chose:
 *   A. Merge questions from every matching bank quiz, de-duplicated, until the
 *      requested count is met (or the bank runs out).
 *   C. If the bank cannot reach the count, tell the student the truth and let
 *      them decide — never silently serve 6 when 20 were asked for.
 *   B. Only when the student is DEMANDING about a SPECIFIC topic, generate the
 *      missing questions with the LLM and append them.
 *
 * Returns false when nothing matched at all, so the caller falls back to the
 * subject picker.
 */
export async function tryStartCountedQuiz(
  ctx: Context,
  student: Student,
  quizzes: BankQuiz[],
  want: { subject?: string; topic?: string; count: number; demanding: boolean; rawText?: string },
): Promise<boolean> {
  const persona = getPersona(student.persona);
  const norm = (s: string) => (s ?? "").toLowerCase().trim();

  const dueIds = new Set(
    (
      await prisma.reviewQueue.findMany({
        where: { studentId: student.id, mastered: false },
        select: { quizId: true },
      })
    ).map((r) => r.quizId),
  );

  const ranked = rankCandidateQuizzes(quizzes, want, dueIds);
  const topicWords = want.topic
    ? norm(want.topic).split(/\s+/).filter((w) => w.length >= 3)
    : [];

  // Score each candidate by how many of the student's topic words its material
  // title contains, then keep ONLY the best-matching tier.
  //
  // This is the fix for a real contamination bug: asking for "20 soal Pemisahan
  // Campuran" used to pull in the broader "Campuran" material (whose questions
  // are about molaritas/larutan) because it matched one of the two words. The
  // student would get a quiz that silently mixed two different topics and the
  // bot would claim the full count. Restricting to the highest tier keeps the
  // assembled quiz coherent. When no topic was named, every subject match is
  // one tier and may be combined.
  const scoredSources = ranked.map((q) => {
    const hay = `${norm(q.material?.topic ?? "")} ${norm(q.material?.subTopic ?? "")}`;
    const hits = topicWords.filter((w) => hay.includes(w)).length;
    return { q, hits };
  });
  const maxHits = topicWords.length ? Math.max(0, ...scoredSources.map((s) => s.hits)) : 0;
  const sources =
    topicWords.length === 0
      ? scoredSources.map((s) => s.q)
      : scoredSources.filter((s) => s.hits === maxHits && s.hits > 0).map((s) => s.q);

  if (sources.length === 0) return false;

  // ── A. Gather unique questions from the bank ──
  const gathered: QuizQuestion[] = [];
  const seen = new Set<string>();
  let sourceMaterialId: string | null = null;
  let sourceMaterial: { subject?: string; topic?: string } | null = null;
  let singleSourceQuizId: string | null = null;
  let usedOneQuiz = true;

  for (const quiz of sources) {
    if (gathered.length >= want.count) break;
    const qs = readQuestions(quiz.questions);
    if (singleSourceQuizId === null) singleSourceQuizId = quiz.id;
    else usedOneQuiz = false;
    if (sourceMaterialId === null) {
      sourceMaterialId = quiz.materialId ?? null;
      sourceMaterial = quiz.material ?? null;
    }
    for (const q of qs) {
      if (gathered.length >= want.count) break;
      const k = questionKey(q);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      gathered.push(q);
    }
  }

  // The simplest case: one bank quiz already holds exactly what was asked for.
  // Start it directly — no new row, no generation, and the student keeps the
  // quiz's own history/redo/explain buttons.
  if (usedOneQuiz && singleSourceQuizId && gathered.length === want.count) {
    await ctx.reply(
      `${persona.emoji} Siap! Kuis *${escapeMd(
        (sourceMaterial?.topic as string) ?? want.topic ?? want.subject ?? "ini",
      )}* — ${gathered.length} soal. Yuk mulai! 🎯`,
      { parse_mode: "Markdown" },
    );
    await handleQuizPick(ctx, student, singleSourceQuizId);
    return true;
  }

  // ── B. Top-up by generating the shortfall (demanding + specific topic) ──
  let generated = 0;
  let shortfall = want.count - gathered.length;
  if (shortfall > 0 && want.demanding && topicWords.length > 0) {
    await ctx.reply(
      `${persona.emoji} Oke, kakak bikinin ${want.count} soal *${escapeMd(
        want.topic ?? "",
      )}* ya. Sebentar… ✍️`,
    );
    const { generateQuestionsForTopic } = await import("@/agents/assessment/generator");
    const fresh = await generateQuestionsForTopic({
      subject: want.subject ?? (sourceMaterial?.subject as string) ?? "",
      topic: want.topic,
      count: shortfall,
      studentId: student.id,
      gradeLevel: String(student.gradeLevel ?? "").replace("_", " "),
      exclude: gathered.map((q) => q.question ?? ""),
      contextText: await loadTopicContext(student.id, want),
    });
    for (const q of fresh) {
      if (gathered.length >= want.count) break;
      const k = questionKey(q);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      gathered.push(q);
      generated++;
    }
    shortfall = want.count - gathered.length;
  }

  // ── C. Honest message when we still cannot reach the count ──
  if (gathered.length === 0) return false;

  if (gathered.length < want.count) {
    const topicLabel = want.topic ?? want.subject ?? "topik ini";
    const canGenerate = topicWords.length > 0;
    await ctx.reply(
      `${persona.emoji} Kakak cek dulu ya: untuk *${escapeMd(topicLabel)}* baru ada ` +
        `*${gathered.length} soal* di bank soal (kamu minta ${want.count}).\n\n` +
        (generated > 0 ? `${generated} soal baru sudah kakak tambahkan. ` : "") +
        (canGenerate
          ? `Mau kakak buatkan sisa *${want.count - gathered.length} soal* lagi dengan AI? ` +
            `Ketik: *buat ${want.count} soal ${escapeMd(topicLabel)}* — nanti kakak usahakan penuh. 💪`
          : `Ketik *buat soal ${escapeMd(topicLabel)}* kalau mau kakak coba tambah. 💪`),
      { parse_mode: "Markdown" },
    );
    // Still start with what we honestly have — the student came to practise.
    if (gathered.length >= 1) {
      const assembledId = await saveAssembledQuiz(student, sourceMaterialId, gathered);
      if (assembledId) {
        await handleQuizPick(ctx, student, assembledId);
        return true;
      }
    }
    return true;
  }

  const assembledId = await saveAssembledQuiz(student, sourceMaterialId, gathered);
  if (!assembledId) return false;
  await ctx.reply(
    `${persona.emoji} Siap! Kuis *${escapeMd(
      want.topic ?? want.subject ?? "ini",
    )}* — ${gathered.length} soal${generated > 0 ? ` (${generated} baru dari AI)` : ""}. Yuk mulai! 🎯`,
    { parse_mode: "Markdown" },
  );
  await handleQuizPick(ctx, student, assembledId);
  return true;
}

/** Persist a merged/generated question set as a real Quiz row the flow can drive. */
async function saveAssembledQuiz(
  student: Student,
  materialId: string | null,
  questions: QuizQuestion[],
): Promise<string | null> {
  if (!materialId || questions.length === 0) return null;
  try {
    const quiz = await prisma.quiz.create({
      data: {
        materialId,
        studentId: student.id,
        type: "QUIZ" as never,
        questions: questions as never,
        maxScore: questions.length,
        timeLimit: 10,
      },
      select: { id: true },
    });
    return quiz.id;
  } catch (err) {
    console.warn("[quiz] saveAssembledQuiz failed:", err);
    return null;
  }
}

/**
 * Best-effort source text for generation: the processed content of the
 * student's materials that match the named topic, so generated questions are
 * grounded in what they actually studied rather than invented.
 */
async function loadTopicContext(
  studentId: string,
  want: { subject?: string; topic?: string },
): Promise<string | undefined> {
  try {
    const words = (want.topic ?? "").toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    const materials = await prisma.material.findMany({
      where: {
        ...(want.subject ? { subject: want.subject } : {}),
        ...(words.length
          ? { OR: words.map((w) => ({ topic: { contains: w, mode: "insensitive" as const } })) }
          : {}),
      },
      select: { processedContent: true },
      take: 3,
    });
    const text = materials
      .map((m) => m.processedContent ?? "")
      .filter((t) => t.trim().length > 0)
      .join("\n\n");
    return text.trim() ? text : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Handle subject picker callback — show quiz list for that subject.
 */
export async function handleSubjectCallback(
  ctx: Context,
  student: Student,
  subject: string,
): Promise<boolean> {
  const persona = getPersona(student.persona);

  const quizzes = await prisma.quiz.findMany({
    where: {
      studentId: student.id,
      material: { subject },
    },
    include: { material: true },
    orderBy: { createdAt: "desc" },
  });

  if (quizzes.length === 0) {
    await ctx.answerCbQuery(`Tidak ada kuis untuk ${subject}`);
    return true;
  }

  // Check which quizzes have due reviews
  const dueReviewQuizIds = new Set(
    (
      await prisma.reviewQueue.findMany({
        where: { studentId: student.id, subject, mastered: false },
        select: { quizId: true },
      })
    ).map((r) => r.quizId)
  );

  const keyboard: { text: string; callback_data: string }[][] = quizzes.slice(0, 10).map((q) => {
    const dueBadge = dueReviewQuizIds.has(q.id) ? " 🔁" : "";
    const topic = ((q.material as any)?.topic as string) || "";
    const label = `${topic.slice(0, 40) || "Kuis " + q.id.slice(0, 6)}${dueBadge}`;
    return [{ text: label, callback_data: `${QUIZ_PICK_PREFIX}${q.id}` }];
  });
  keyboard.push([{ text: "⬅️ Kembali", callback_data: "quiz:back:subjects" }]);
  keyboard.push([{ text: "🚪 Keluar", callback_data: QUIZ_EXIT_PREFIX }]);

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📖 *${escapeMd(subject)}* — pilih kuis:\n(🔁 = ada soal untuk diulang)`,
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } },
  );
  return true;
}

/**
 * /drill — start a quiz for the student's weakest topic.
 * Finds the weakest topic with a severe/moderate weakness and launches
 * its quiz (or sends the student to the dashboard if none exists).
 */
export async function handleDrillStart(
  ctx: Context,
  student: Student,
): Promise<void> {
  const persona = getPersona(student.persona);
  const weak = await prisma.topicMastery.findFirst({
    where: { studentId: student.id, weaknessLevel: { in: ["severe", "moderate"] } },
    orderBy: { mastery: "asc" },
  });

  if (!weak) {
    await ctx.reply(
      `${persona.emoji} Mantap, ${student.name}! Semua topik sudah kamu kuasai. ` +
        `Coba /quiz untuk latihan baru ya! 💪`,
    );
    return;
  }

  const quiz = await prisma.quiz.findFirst({
    where: { studentId: student.id, material: { topic: weak.topic } },
    include: { material: true },
  });

  if (!quiz) {
    await ctx.reply(
      `${persona.emoji} Topik paling lemah kamu: *${escapeMd(weak.topic)}* (mastery ${Math.round(weak.mastery)}%).\n` +
        `Belum ada kuis khusus topik ini — buka materinya dulu ya:\n` +
        `${"https://senangbelajar.web.id/student/subject/" + encodeURIComponent(weak.subject)}`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  await ctx.reply(
    `${persona.emoji} Deteksi topik lemah: *${escapeMd(weak.topic)}* (mastery ${Math.round(weak.mastery)}%). Yuk drill sekarang! 🎯`,
    { parse_mode: "Markdown" },
  );
  await handleQuizPick(ctx, student, quiz.id);
}

/** Answer a callback query when there is one; no-op for plain messages. */
async function safeAnswerCbQuery(ctx: Context, text?: string): Promise<void> {
  if (!ctx.callbackQuery) return;
  try {
    await ctx.answerCbQuery(text);
  } catch {
    // A stale/expired callback must never abort the flow it triggered.
  }
}

/**
 * Handle quiz pick callback — start the selected quiz.
 */
export async function handleQuizPick(
  ctx: Context,
  student: Student,
  quizId: string,
  opts?: { hard?: boolean },
): Promise<boolean> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId, studentId: student.id },
    include: { material: true },
  });

  if (!quiz) {
    await safeAnswerCbQuery(ctx, "Kuis tidak ditemukan");
    return true;
  }

  // Timer: explicit request (remembered from handleQuizStart) wins, else the
  // default. This is what makes "satu per satu + timer" the out-of-the-box
  // experience instead of something the student has to ask for.
  const session = await getSession(student.id);
  const pending = (session.context as { pendingQuestionSeconds?: number })
    .pendingQuestionSeconds;
  let questionSeconds =
    typeof pending === "number" && pending > 0 ? pending : DEFAULT_QUESTION_SECONDS;

  // "Lebih sulit" = hardest questions first (the bank tags ~70% of questions
  // easy/medium/hard) AND a tighter clock. The order map is display-only:
  // grading still addresses the original question indices, so a reordered quiz
  // cannot silently mis-grade.
  const questions = readQuestions(quiz.questions);
  const order = opts?.hard ? hardFirstOrder(questions) : undefined;
  if (opts?.hard) {
    questionSeconds = Math.max(MIN_QUESTION_SECONDS, Math.round(questionSeconds / 2));
  }

  // Start session
  await setSession(student.id, {
    currentMode: "quiz_active",
    context: {
      quizId: quiz.id,
      currentIndex: 0,
      answers: [],
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      questionSeconds,
      deadlineAt: Date.now() + questionSeconds * 1000,
      ...(order ? { order } : {}),
    },
  });

  await safeAnswerCbQuery(ctx, opts?.hard ? "Mode sulit! ⏱️" : "Mulai! 🎉");
  await sendQuestion(ctx, quiz, 0, questionSeconds, order);
  scheduleQuestionTimer(student, quiz, 0, questionSeconds);
  return true;
}

/**
 * Handle a quiz-answer message when state is quiz_active.
 * Accepts: text answer (typed), or "keluar"/"batal" to exit.
 */
export async function handleQuizAnswer(
  ctx: Context,
  session: BotSession,
  student: Student,
): Promise<void> {
  const sender = ctxSender(ctx);
  const ctxData = session.context as unknown as QuizCtxData;

  // Idle timeout — 10 min since LAST answer (not since quiz start)
  const idleMs = Date.now() - (ctxData.lastActivityAt ?? ctxData.startedAt ?? 0);
  if (idleMs > QUIZ_TIMEOUT_MIN * 60_000) {
    await clearSession(student.id);
    await ctx.reply("⏰ Waktu kuis habis (10 menit tanpa jawaban). Ketik /quiz kalau mau lanjut lagi ya! 😊");
    return;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: ctxData.quizId },
    include: { material: true },
  });

  if (!quiz) {
    await ctx.reply("Wah, kuisnya nggak ditemukan. Coba /quiz lagi ya.");
    await clearSession(student.id);
    return;
  }

  const questions = readQuestions(quiz.questions);

  // Cancel commands
  const raw = ctx.message && "text" in ctx.message ? ctx.message.text ?? "" : "";
  const trimmed = raw.trim().toLowerCase();
  if (/^(keluar|batal|stop|quit|cancel)$/i.test(trimmed) || trimmed === "/cancel") {
    clearQuestionTimer(student.id);
    await clearSession(student.id);
    await ctx.reply("👋 Kuis dibatalkan. Ketik /quiz kapan pun mau lanjut ya!");
    return;
  }
  // Restart quiz mid-session
  if (/^\/(quiz|kuis)$/i.test(trimmed)) {
    clearQuestionTimer(student.id);
    await clearSession(student.id);
    await handleQuizStart(ctx, student);
    return;
  }

  // Ignore non-text (photos, stickers, etc.) during quiz
  if (!("text" in ctx.message!)) {
    await ctx.reply("📝 Ketik jawabanmu ya, atau pakai tombol pilihan di atas!");
    return;
  }

  // The countdown already expired — the timer has advanced the session. Tell
  // the student rather than grading a late answer against the wrong question.
  if (isPastDeadline(ctxData)) {
    await ctx.reply("⏰ Waktunya udah habis untuk soal itu. Jawab soal yang terbaru ya! 👇");
    return;
  }

  const currentIdx = ctxData.currentIndex;
  // `currentIdx` is a DISPLAY position; resolve it through the order map or a
  // "lebih sulit" session would match the typed answer against the wrong
  // question's options.
  const q = questionAt(questions, ctxData.order, currentIdx);
  if (!q) {
    await finishQuiz(sender, student, quiz, questions, ctxData.answers);
    return;
  }

  // Resolve typed answer → option index (robust matching)
  const selectedIndex = matchAnswerToIndex(q, trimmed);
  if (selectedIndex === -1) {
    await ctx.reply(
      "🤔 Hmm, jawabanmu nggak ketemu di pilihan. Ketik nomor (misal: `2`), huruf (`b`), atau teks pilihan yang tersedia ya!",
      { parse_mode: "Markdown" },
    );
    return;
  }

  await recordAnswer(sender, student, quiz, ctxData, currentIdx, selectedIndex);
}

/**
 * Handle an inline keyboard button press.
 *   quiz:ans:<qIdx>:<optIdx> — an answer
 *   quiz:exit               — leave the quiz
 *   quiz:redo:<quizId>[:hard] — restart this quiz (optionally harder)
 *   quiz:explain:<quizId>   — ask the tutor to explain the topic
 */
export async function handleQuizCallback(
  ctx: Context,
  student: Student,
): Promise<boolean> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return false;
  const data = ctx.callbackQuery.data;
  const sender = ctxSender(ctx);

  if (data.startsWith(QUIZ_EXIT_PREFIX)) {
    clearQuestionTimer(student.id);
    await clearSession(student.id);
    await ctx.answerCbQuery("Kuis dibatalkan 👋");
    await ctx.reply("👋 Kuis dibatalkan. Ketik /quiz kapan pun mau lanjut ya!");
    return true;
  }

  if (data.startsWith(QUIZ_REDO_PREFIX)) {
    const rest = data.slice(QUIZ_REDO_PREFIX.length);
    const [quizId, mode] = rest.split(":");
    await ctx.answerCbQuery(mode === "hard" ? "Siap, versi lebih sulit! 💪" : "Ulang lagi! 🔁");
    const harder = mode === "hard";
    if (harder) {
      await ctx.reply(
        "💪 Oke, kakak kasih versi yang lebih menantang. Semangat ya!",
      );
    }
    await handleQuizPick(ctx, student, quizId, { hard: harder });
    return true;
  }

  if (data.startsWith(QUIZ_EXPLAIN_PREFIX)) {
    const quizId = data.slice(QUIZ_EXPLAIN_PREFIX.length);
    await ctx.answerCbQuery("Siap, kakak jelasin ya! 💡");
    await explainQuizTopic(ctx, student, quizId);
    return true;
  }

  if (!data.startsWith(QUIZ_ANS_PREFIX)) return false;

  const parts = data.split(":");
  // quiz:ans:<qIdx>:<optIdx>
  const qIdx = parseInt(parts[2] ?? "", 10);
  const optIdx = parseInt(parts[3] ?? "", 10);
  if (Number.isNaN(qIdx) || Number.isNaN(optIdx)) return false;

  const session = await getSession(student.id);
  const ctxData = session.context as unknown as QuizCtxData;

  // Stale callback — session not in quiz
  if (session.currentMode !== "quiz_active" || !ctxData.quizId) {
    await ctx.answerCbQuery("Sesi kuis sudah berakhir. Ketik /quiz untuk mulai baru ya!");
    return true;
  }

  // Idle timeout — 10 min since LAST answer (not since quiz start)
  const idleMs = Date.now() - (ctxData.lastActivityAt ?? ctxData.startedAt ?? 0);
  if (idleMs > QUIZ_TIMEOUT_MIN * 60_000) {
    clearQuestionTimer(student.id);
    await clearSession(student.id);
    await ctx.answerCbQuery("⏰ Sesi kuis berakhir (10 menit tanpa jawaban). Ketik /quiz lagi ya!");
    return true;
  }

  // Countdown already elapsed — the timer has moved the session on.
  if (isPastDeadline(ctxData)) {
    await ctx.answerCbQuery("⏰ Waktu soal itu sudah habis");
    return true;
  }

  // Stale answer — from an older question (e.g. user tapped twice quickly)
  if (qIdx !== ctxData.currentIndex) {
    await ctx.answerCbQuery(
      qIdx < ctxData.currentIndex ? "Soal ini sudah dijawab ✅" : "Belum sampai soal ini ya!",
    );
    return true;
  }

  // Already answered this question? (`answers` holds ORIGINAL indices; qIdx is
  // a display position, so translate before comparing.)
  if (ctxData.answers.some((a) => a.questionIndex === origIndex(ctxData.order, qIdx))) {
    await ctx.answerCbQuery("Soal ini sudah dijawab ✅");
    return true;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: ctxData.quizId },
    include: { material: true },
  });
  if (!quiz) {
    await ctx.answerCbQuery("Kuis tidak ditemukan");
    await clearSession(student.id);
    return true;
  }

  await recordAnswer(sender, student, quiz, ctxData, qIdx, optIdx);
  return true;
}

/**
 * Explain the topic behind a quiz, on demand, via the tutor LLM.
 *
 * This is the destination of the "💡 Jelaskan topik ini" button — the student
 * asked for an explanation, so the answer is prose from the tutor, not another
 * quiz.
 */
async function explainQuizTopic(
  ctx: Context,
  student: Student,
  quizId: string,
): Promise<void> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId, studentId: student.id },
    include: { material: true },
  });
  const persona = getPersona(student.persona);
  const subject = (quiz?.material as any)?.subject ?? "";
  const topic = (quiz?.material as any)?.topic ?? subject;

  if (!quiz || !topic) {
    await ctx.reply(`${persona.emoji} Hmm, kakak nggak nemu topiknya. Coba /quiz lagi ya!`);
    return;
  }

  await ctx.reply(
    `${persona.emoji} Oke, kakak jelasin *${escapeMd(topic)}* ya. Sebentar… 📖`,
    { parse_mode: "Markdown" },
  );

  try {
    const prompt = [
      `Kamu ${persona.displayName}, tutor privat untuk ${student.name} (${subject}).`,
      `Jelaskan topik "${topic}" dengan cara yang mudah dipahami.`,
      "",
      "Aturan:",
      "- Maksimal 4 paragraf pendek.",
      "- Pakai analogi sehari-hari.",
      "- Bahasa Indonesia, hangat, sesuaikan dengan jenjang siswa.",
      "- Akhiri dengan SATU pertanyaan cek pemahaman.",
    ].join("\n");

    const raw = await Promise.race([
      callLLM("tutor", [{ role: "user", content: prompt }], {
        studentId: student.id,
        // Reasoning models (ai_tutor_agent/hermes) spend tokens on hidden
        // reasoning BEFORE emitting content. A small cap (was 500) gets fully
        // consumed by that reasoning, so the model returns empty content with
        // finish_reason="length" and the student sees "kakak lagi nggak bisa
        // jelasin". 2048 matches the interactive chat default.
        maxTokens: 2048,
        temperature: 0.6,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 20_000)),
    ]);

    // Plain text — LLM prose is not Markdown-safe to send with parse_mode.
    if (raw?.trim()) await ctx.reply(raw.trim());
    else
      await ctx.reply(
        `${persona.emoji} Maaf ya, kakak lagi nggak bisa jelasin sekarang. Coba tanya langsung aja! 😊`,
      );
  } catch (err) {
    console.warn("[quiz] explain LLM failed:", err);
    await ctx.reply(
      `${persona.emoji} Maaf ya, kakak lagi nggak bisa jelasin sekarang. Coba tanya langsung aja! 😊`,
    );
  }
}

/**
 * Record an answer, show immediate per-question feedback, then move on.
 *
 * `selectedIndex === -1` records an unanswered (timed-out) question: it scores
 * wrong, which is the honest outcome, and it feeds spaced repetition like any
 * other miss.
 */
async function recordAnswer(
  sender: QuizSender,
  student: Student,
  quiz: Quiz & { material?: unknown },
  ctxData: QuizCtxData,
  displayIndex: number,
  selectedIndex: number,
  opts?: { timedOut?: boolean },
): Promise<void> {
  const questions = readQuestions(quiz.questions);
  const q = questionAt(questions, ctxData.order, displayIndex);
  if (!q) return;
  // Stop the countdown immediately: it must not fire while we are recording
  // this very answer, or the timeout path would file a second (duplicate) miss.
  clearQuestionTimer(student.id);
  // Grading and spaced repetition address the ORIGINAL question positions; the
  // display order only decides what the student sees first.
  const questionIndex = origIndex(ctxData.order, displayIndex);

  const timedOut = opts?.timedOut === true || selectedIndex < 0;

  // Persist answer (a timeout is filed as an unanswered miss)
  ctxData.answers.push({ questionIndex, selectedIndex: timedOut ? -1 : selectedIndex });
  ctxData.lastActivityAt = Date.now();
  const isCorrect = !timedOut && selectedIndex === q.correctIndex;
  const correctText = q.options?.[q.correctIndex ?? -1] ?? q.correctAnswer ?? "?";

  // Immediate per-question feedback
  let feedback: string;
  if (timedOut) {
    feedback = `⏰ *Waktu habis!* Jawaban benar: *${escapeMd(correctText)}*`;
  } else if (isCorrect) {
    feedback = `✅ *Benar!*`;
  } else {
    feedback = `❌ *Kurang tepat* — jawaban benar: *${escapeMd(correctText)}*`;
  }
  if (q.explanation) feedback += `\n💡 ${escapeMd(q.explanation)}`;

  if (sender.answerCbQuery) {
    await sender.answerCbQuery(
      timedOut ? "⏰ Waktu habis" : isCorrect ? "✅ Benar!" : "❌ Kurang tepat",
    );
  }
  await sender.reply(feedback, { parse_mode: "Markdown" }).catch(() => {});

  // Advance (display space)
  clearQuestionTimer(student.id);
  const nextIdx = displayIndex + 1;
  if (nextIdx < questions.length) {
    const seconds = ctxData.questionSeconds ?? 0;
    const nextCtx: QuizCtxData = {
      ...ctxData,
      currentIndex: nextIdx,
      deadlineAt: seconds > 0 ? Date.now() + seconds * 1000 : undefined,
    };
    await setSession(student.id, {
      currentMode: "quiz_active",
      context: nextCtx as unknown as Record<string, unknown>,
    });
    await sendQuestion(sender, quiz, nextIdx, seconds, ctxData.order);
    scheduleQuestionTimer(student, quiz, nextIdx, seconds);
  } else {
    await finishQuiz(sender, student, quiz, questions, ctxData.answers);
  }
}

/**
 * Countdown elapsed for the current question — file it as unanswered and move
 * on. Re-reads the session so a stale timer (student already answered, or
 * already moved to another question) does nothing.
 */
async function handleQuestionTimeout(
  student: Student,
  quiz: Quiz,
  index: number,
): Promise<void> {
  const session = await getSession(student.id);
  const ctxData = session.context as unknown as QuizCtxData;

  if (session.currentMode !== "quiz_active") return;
  if (ctxData.quizId !== quiz.id || ctxData.currentIndex !== index) return;
  // `answers` stores ORIGINAL indices; `index` is a display position. Compare
  // like with like, or a reordered ("lebih sulit") quiz would double-file a
  // timeout for a question the student already answered.
  const origIdx = origIndex(ctxData.order, index);
  if (ctxData.answers.some((a) => a.questionIndex === origIdx)) return;

  const telegramId = student.telegramId;
  if (!telegramId) return;

  await recordAnswer(directSender(telegramId), student, quiz, ctxData, index, -1, {
    timedOut: true,
  });
}

/**
 * Render the body of a quiz question message.
 *
 * Exported as a pure function so the escaping can be asserted directly, against
 * the real template, rather than against a copy of it in a test.
 *
 * Question text is LLM-generated and routinely contains `_` or `*` — physics
 * writes F_N, maths writes lim_{x→2}. Unescaped, that opens a Markdown entity
 * which never closes and Telegram rejects the ENTIRE message with "can't parse
 * entities", so the student silently receives nothing.
 *
 * Answer options are NOT escaped here: they become inline-keyboard button
 * labels, and Telegram does not parse those, so escaping would show the student
 * literal backslashes.
 */
export function renderQuestionText(index: number, total: number, question: string): string {
  return `📝 *Soal ${index + 1} dari ${total}*\n\n${escapeMd(question)}`;
}

/**
 * Build the question message (text + inline keyboard) as a pure function.
 *
 * Pure so a test can assert the two things that broke in production: that a
 * question with options ALWAYS yields one tappable button per option, and that
 * the countdown line is present. `index` is the DISPLAY position; the callback
 * data carries that position and `recordAnswer` maps it back through `order`.
 */
export function buildQuestionMessage(
  index: number,
  questions: QuizQuestion[],
  order?: number[],
  questionSeconds?: number,
): { text: string; keyboard: { text: string; callback_data: string }[][] } {
  const q = questionAt(questions, order, index);
  if (!q) return { text: "", keyboard: [] };

  let text = renderQuestionText(index, questions.length, q.question);
  if (questionSeconds && questionSeconds > 0) {
    text += `\n\n⏱️ *${questionSeconds} detik* — pilih jawabanmu sebelum waktu habis!`;
  }

  const keyboard: { text: string; callback_data: string }[][] = [];
  if (q.options && q.options.length > 0) {
    q.options.forEach((opt, i) => {
      keyboard.push([
        {
          text: `${String.fromCharCode(65 + i)}. ${opt}`,
          // `index` is the DISPLAY position; recordAnswer maps it back to the
          // original question index before grading.
          callback_data: `${QUIZ_ANS_PREFIX}${index}:${i}`,
        },
      ]);
    });
  } else {
    text += "\n\nKetik jawabanmu ya! 🤗";
  }

  keyboard.push([{ text: "🚪 Keluar", callback_data: QUIZ_EXIT_PREFIX }]);
  return { text, keyboard };
}

/**
 * Render a question with inline answer buttons (when options exist).
 *
 * Buttons are labelled `A. …`, `B. …` — the letters students already use when
 * they type an answer, and the letters the feedback message quotes. The numeric
 * position is still what `quiz:ans:<qIdx>:<optIdx>` carries, so nothing about
 * matching changes; only the label is friendlier.
 */
async function sendQuestion(
  sender: QuizSender,
  quiz: Quiz,
  index: number,
  questionSeconds?: number,
  order?: number[],
): Promise<void> {
  const questions = readQuestions(quiz.questions);
  const { text, keyboard } = buildQuestionMessage(index, questions, order, questionSeconds);
  if (!text) return;

  await sender.reply(text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });
}

/**
 * Match a typed answer to an option index.
 * Accepts: "2", "b", "B.", "2.", full option text, case-insensitive.
 */
function matchAnswerToIndex(q: QuizQuestion, raw: string): number {
  if (!q.options || q.options.length === 0) {
    // Free-text question — no options; match against correctAnswer if present
    if (q.correctAnswer) {
      return raw.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ? 0 : -1;
    }
    return raw.trim() !== "" ? 0 : -1;
  }

  const t = raw.trim().toLowerCase();
  if (!t) return -1;

  // Numeric "2" / "2." / "2)" → index 1
  const numMatch = t.match(/^(\d+)[.)]?$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= q.options.length) return n - 1;
    return -1;
  }

  // Letter "b" / "b." / "b)" → index 1
  const letterMatch = t.match(/^([a-z])[.)]?$/);
  if (letterMatch) {
    const c = letterMatch[1].charCodeAt(0) - 97;
    if (c >= 0 && c < q.options.length) return c;
    return -1;
  }

  // Full text match (case-insensitive, trimmed)
  const fullIdx = q.options.findIndex((o) => o.trim().toLowerCase() === t);
  if (fullIdx >= 0) return fullIdx;

  // Partial contains match — but only when unambiguous
  const containsIdx = q.options.filter((o) =>
    o.trim().toLowerCase().includes(t),
  );
  if (containsIdx.length === 1) {
    return q.options.findIndex((o) => o.trim().toLowerCase().includes(t));
  }

  return -1;
}

/**
 * Grade the quiz using the server-side grader (same as the web app),
 * persist the attempt, award XP/badges, queue wrong answers for review.
 */
async function finishQuiz(
  sender: QuizSender,
  student: Student,
  quiz: Quiz & { material?: unknown },
  questions: QuizQuestion[],
  answers: { questionIndex: number; selectedIndex: number }[],
): Promise<void> {
  const persona = getPersona(student.persona);
  clearQuestionTimer(student.id);

  // Capture mastery BEFORE grading so we can report the delta (quantitative feedback)
  const qSubject = (quiz.material as any)?.subject ?? "";
  const qTopic = (quiz.material as any)?.topic ?? qSubject;
  let beforeMastery: { mastery: number } | null = null;
  if (qTopic) {
    beforeMastery = await prisma.topicMastery
      .findFirst({
        where: { studentId: student.id, subject: qSubject, topic: qTopic },
        orderBy: { mastery: "desc" },
      })
      .catch(() => null);
  }

  // Grade server-side (persists Attempt + ProgressSnap)
  let grade: Awaited<ReturnType<typeof gradeAttempt>> | null = null;
  try {
    grade = await gradeAttempt({
      quizId: quiz.id,
      studentId: student.id,
      answers: answers.map((a) => ({
        questionIndex: a.questionIndex,
        selectedIndex: a.selectedIndex,
      })),
    });
    console.log("[quiz] Attempt saved (server grader):", quiz.id, grade.score, "/", grade.maxScore);
  } catch (dbErr) {
    console.error("[quiz] gradeAttempt failed:", dbErr);
  }

  if (!grade) {
    await clearSession(student.id);
    await sender.reply("😅 Gagal menyimpan hasil kuis. Coba /quiz lagi ya!");
    return;
  }

  const score = grade.score;
  const maxScore = grade.maxScore;
  const mastery = maxScore > 0 ? (score / maxScore) * 100 : 0;

  // Mastery delta for the quiz topic
  let masteryLine = "";
  if (qTopic) {
    try {
      const afterMastery = await prisma.topicMastery.findFirst({
        where: { studentId: student.id, subject: qSubject, topic: qTopic },
        orderBy: { mastery: "desc" },
      });
      const afterPct = afterMastery ? Math.round(afterMastery.mastery) : null;
      if (afterPct !== null) {
        const beforePct = beforeMastery ? Math.round(beforeMastery.mastery) : null;
        masteryLine =
          beforePct === null
            ? "\n📈 Mastery *" + escapeMd(qTopic) + "* tercatat: " + afterPct + "%"
            : "\n📈 Mastery *" + escapeMd(qTopic) + "*: " + beforePct + "% → " + afterPct + "% " + (afterPct >= beforePct ? "▲" : "▼");
      }
    } catch (mErr) {
      console.warn("[quiz] mastery delta failed:", mErr);
    }
  }

  // Gamification: award XP, update streak, check badges
  const { xpAwarded } = await handleActivity({
    studentId: student.id,
    materialId: quiz.materialId ?? undefined,
    type: "quiz_complete",
    metadata: { score, maxScore, subject: (quiz as any).material?.subject },
  }).catch((err) => {
    console.warn("[quiz] handleActivity error:", err);
    return { xpAwarded: 0, newBadges: [] };
  });

  // Spaced repetition is filed inside gradeAttempt() now (see
  // src/agents/assessment/grader.ts step 7). The loop that used to live here
  // ran in addition to it, and because addToReviewQueue() upserts with
  // `lapses: { increment: 1 }`, every wrong answer was counted twice — one
  // lapse from each loop. One writer, one increment.

  // Reset session
  await clearSession(student.id);
  console.log("[quiz] Session cleared");

  // Build per-question feedback.
  //
  // Numbered by the position the student actually saw, NOT `questionIndex + 1`:
  // in "ulang, lebih sulit" mode the questions are shown hard-first, so the
  // original indices would print a scrambled 7, 2, 9… `answers` is pushed in
  // display order, so its array position is the number to show.
  const feedbackLines: string[] = [];
  const wrongQuestions: { question: string; correctText: string; explanation?: string }[] = [];
  answers.forEach((a, seq) => {
    const q = questions[a.questionIndex];
    if (!q) return;
    const shownNo = seq + 1;
    const correctText = q.options?.[q.correctIndex ?? -1] ?? q.correctAnswer ?? "?";
    const isCorrect = a.selectedIndex === q.correctIndex && a.selectedIndex >= 0;
    if (isCorrect) {
      feedbackLines.push(`✅ Soal ${shownNo}: ${escapeMd(q.question.slice(0, 60))}…`);
    } else {
      const yourText =
        a.selectedIndex < 0 ? "(tidak dijawab — waktu habis)" : q.options?.[a.selectedIndex] ?? "?";
      wrongQuestions.push({ question: q.question, correctText, explanation: q.explanation });
      feedbackLines.push(
        `❌ Soal ${shownNo}: ${escapeMd(q.question.slice(0, 80))}…\n` +
        `   Jawabanmu: *${escapeMd(yourText)}* | Jawaban benar: *${escapeMd(correctText)}*\n` +
        `   💡 ${escapeMd(q.explanation ?? "Coba baca materinya lagi ya!")}`,
      );
    }
  });

  const gradeEmoji = mastery >= 80 ? "🌟" : mastery >= 60 ? "👍" : "💪";

  const resultText =
    `${persona.emoji} *Selesai!* ${gradeEmoji}\n\n` +
    `Skor kamu: *${score}/${maxScore}* (${Math.round(mastery)}%)` +
    (xpAwarded > 0 ? `\n✨ +${xpAwarded} XP` : "") +
    (masteryLine ? masteryLine : "") +
    `\n\n` +
    feedbackLines.join("\n\n");

  // ── Proactive evaluation + follow-up offer ──
  const evaluation = await buildQuizEvaluation({
    student,
    persona,
    subject: qSubject,
    topic: qTopic,
    score,
    maxScore,
    wrongQuestions,
  });

  // Follow-up buttons: concrete next steps instead of a dead-end "ada yang mau
  // ditanyakan?" that leaves the student to invent their own next move.
  const followUp: { text: string; callback_data: string }[][] = [
    [
      { text: "🔁 Ulang quiz ini", callback_data: `${QUIZ_REDO_PREFIX}${quiz.id}` },
      { text: "💪 Ulang, lebih sulit", callback_data: `${QUIZ_REDO_PREFIX}${quiz.id}:hard` },
    ],
    [{ text: "💡 Jelaskan topik ini", callback_data: `${QUIZ_EXPLAIN_PREFIX}${quiz.id}` }],
    [{ text: "📚 Pilih mapel lain", callback_data: "quiz:back:subjects" }],
  ];

  try {
    await sender.reply(resultText, { parse_mode: "Markdown" });
    // Plain text (no parse_mode): the evaluation is free-form LLM prose and
    // escaping it would either show backslashes or risk a rejected send.
    if (evaluation) await sender.reply(evaluation);
    await sender.reply("Mau lanjut ke mana? 👇", {
      reply_markup: { inline_keyboard: followUp },
    });
    console.log("[quiz] Result sent");
  } catch (replyErr) {
    console.error("[quiz] Failed to send result:", replyErr);
  }
}

/**
 * Proactive evaluation of a finished quiz.
 *
 * The score line is arithmetic; this is the part that names the weak topic and
 * makes a concrete offer ("mau kakak jelaskan?", "mau ulang lebih susah?").
 * Routed through the tutor LLM so the wording matches the student's persona,
 * with a deterministic template as fallback — a model outage degrades to a
 * still-useful message rather than silence.
 */
async function buildQuizEvaluation(input: {
  student: Student;
  persona: { displayName: string; emoji: string };
  subject: string;
  topic: string;
  score: number;
  maxScore: number;
  wrongQuestions: { question: string; correctText: string; explanation?: string }[];
}): Promise<string> {
  const { student, persona, subject, topic, score, maxScore, wrongQuestions } = input;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const missed = maxScore - score;

  // Nothing to coach on — a perfect run gets a short, honest note and the
  // follow-up buttons carry the rest.
  const fallback = (() => {
    if (missed === 0) {
      return `${persona.emoji} Mantap ${student.name}! Semua soal kamu jawab benar 🎉 Mau coba yang lebih susah?`;
    }
    const topicPart = topic ? `Topik *${topic}*` : `Bagian ini`;
    return (
      `${persona.emoji} ${topicPart} masih bisa ditingkatkan ya — ${missed} soal masih salah. ` +
      `Mau kakak jelaskan lagi, atau ulang quiznya? 💪`
    );
  })();

  try {
    const wrongList = wrongQuestions
      .slice(0, 6)
      .map((w, i) => `${i + 1}. ${w.question}\n   (jawaban benar: ${w.correctText})`)
      .join("\n");

    const prompt = [
      `Kamu ${persona.displayName}, tutor privat untuk ${student.name}.`,
      `Siswa baru selesai mengerjakan quiz ${subject}${topic ? ` (topik: ${topic})` : ""}.`,
      `Skor: ${score}/${maxScore} (${pct}%).`,
      wrongList ? `Soal yang masih salah:\n${wrongList}` : "Semua soal benar.",
      "",
      "Tulis 2–3 kalimat singkat dalam Bahasa Indonesia yang:",
      "1. Mengevaluasi hasilnya dengan jujur tapi hangat (jangan berlebihan memuji kalau skornya rendah).",
      "2. Menyebut topik/konsep spesifik yang masih lemah (kalau ada yang salah).",
      "3. Menawarkan SATU tindak lanjut konkret, misalnya mau dijelaskan ulang, mau contoh tambahan, atau mau ulang quiznya dengan tingkat lebih sulit.",
      "",
      "Jangan tulis daftar bernomor. Jangan ulangi skornya. Jangan pakai format Markdown (tanpa *, _, `). Maksimal 3 kalimat.",
    ].join("\n");

    const raw = await Promise.race([
      callLLM("tutor", [{ role: "user", content: prompt }], {
        studentId: student.id,
        // Same reasoning-model trap as explainQuizTopic: 220 tokens were fully
        // consumed by hidden reasoning, yielding empty content every time.
        maxTokens: 1024,
        temperature: 0.6,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 12_000)),
    ]);

    const text = raw?.trim();
    // A model that answers with Markdown would break the plain-text send, and
    // one that answers with a wall of text is worse than the fallback.
    if (!text || text.length > 600) return fallback;
    return text.replace(/[*_`]/g, "");
  } catch (err) {
    console.warn("[quiz] evaluation LLM failed, using fallback:", err);
    return fallback;
  }
}
