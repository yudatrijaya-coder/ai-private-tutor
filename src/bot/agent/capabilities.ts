/**
 * Bot capabilities — single source of truth for the system prompt capability list.
 * Replaces the duplicated 130-line capability block in tutor.ts.
 */
export const CAPABILITIES = [
  {
    tag: "QUIZ",
    description: "Generate or start a quiz",
    trigger: "student asks for quiz, latihan, or test",
  },
  {
    tag: "SCHEDULE",
    description: "Show today's study schedule",
    subCommands: [
      { tag: "SCHEDULE:WEEK", description: "Show this week's full schedule" },
      { tag: 'SCHEDULE:SET:{"sessionsPerDay":N,"preferredTime":"HH:MM","excludeDays":["sunday"]}', description: "Set study preferences" },
      { tag: "SCHEDULE:ASSIGN", description: "Generate sessions for upcoming days" },
    ],
    trigger: 'student says "atur jadwal" or "jadwal" — ask preference first',
  },
  {
    tag: "MATERIALS",
    description: "Show learning materials list",
    trigger: "student asks about materials or topik",
  },
  {
    tag: "SCHOOL_SCHEDULE",
    description: "Show real school timetable",
    subCommands: [
      { tag: "SCHOOL_SCHEDULE", description: "Today's schedule" },
      { tag: "SCHOOL_SCHEDULE:WEEK", description: "Full week" },
      { tag: "SCHOOL_SCHEDULE:Senin/:Selasa/:Rabu/:Kamis/:Jumat", description: "Specific day" },
      { tag: "SCHOOL_SCHEDULE:NEXT:Matematika", description: "Next subject class" },
    ],
    trigger: 'student says "sekolah", "jadwal sekolah", "mapel hari ini"',
  },
  {
    tag: 'REMINDER:CREATE:{"title":"...","remindAt":"ISO_DATE","category":"exam|homework|event|study|general","description":"..."}',
    description: "Set a reminder",
    trigger: "student mentions a deadline or exam",
  },
  {
    tag: "REMINDER:LIST",
    description: "Show all reminders",
    trigger: "student asks about reminders or list",
  },
  {
    tag: 'REMINDER:DELETE:{"all":true}',
    description: "Delete all reminders",
    trigger: "student asks to clear/delete reminders",
  },
  {
    tag: 'HOMEWORK:CREATE:{"subject":"...","description":"...","deadlineAt":"ISO_DATE"}',
    description: "Record a homework task",
    trigger: "student mentions homework or PR",
  },
  {
    tag: "HOMEWORK:LIST",
    description: "Show pending homework",
    trigger: "student asks about homework",
  },
  {
    tag: 'HOMEWORK:SUBMIT:{"subject":"..."}',
    description: "Mark homework as done",
    trigger: "student says they finished homework",
  },
  {
    tag: 'PASSWORD:SET:{"password":"..."}',
    description: "Create or change web login password",
    trigger: "student asks for web login password or ganti password",
    note: "Never reveal existing passwords. Respond with student ID first.",
  },
  {
    tag: "VIDEOS:topic",
    description: "Recommend YouTube learning videos",
    trigger: "student asks about a topic they want to learn",
  },
  {
    tag: "YOUTUBE:VIDEO_ID",
    description: "Explain a YouTube video by its ID",
    trigger: "student shares a YouTube link",
  },
  {
    tag: "DASHBOARD",
    description: "Share web dashboard link",
    trigger: "student asks about web login, portal, or dashboard",
  },
  {
    tag: "ACHIEVEMENT",
    description: "Show XP, streak, badges earned",
    trigger: "student asks about achievement, XP, streak, or badge",
  },
  {
    tag: "REVIEW",
    description: "Start spaced-repetition review of past wrong answers",
    trigger: "student asks to review, repeat, or ulang soal yang salah",
  },
];

export function buildCapabilitiesPrompt(): string {
  const lines = CAPABILITIES.map((c, i) => {
    let text = `${i + 1}. [${c.tag}] — ${c.description}`;
    if (c.subCommands) {
      text += `\n   Sub-commands:`;
      for (const s of c.subCommands) {
        text += `\n   - [${s.tag}] — ${s.description}`;
      }
    }
    if (c.trigger) text += `\n   Trigger: ${c.trigger}`;
    if (c.note) text += `\n   Note: ${c.note}`;
    return text;
  });

  return [
    "CAPABILITIES — You can do the following when the student asks:",
    ...lines,
    "",
    "When the student asks about reminders, homework, or deadlines, respond naturally AND append the appropriate command at the end.",
    'Example: "Baik Andi, aku catat ulangan matematikanya ya! 😊 [REMINDER:CREATE:{"title":"Ulangan Matematika","remindAt":"2026-07-14T08:00:00","category":"exam"}]"',
    'IMPORTANT: "jadwal" alone = [SCHEDULE]. "sekolah" = [SCHOOL_SCHEDULE].',
    'ACHIEVEMENT — Show XP, streak, badges when student asks. Data from real db.',
    'REVIEW — Start spaced-repetition review of past wrong answers.',
  ].join("\n");
}