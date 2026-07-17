import Link from "next/link";
import { getRandomMoodleModule, getRandomMoodleBook } from "@/data/moodle-modules";

export function MoodleQuickLink({ gradeLevel }: { gradeLevel?: string }) {
  const moodle = getRandomMoodleModule(gradeLevel);
  if (!moodle) return null;

  return (
    <Link
      href={moodle.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <span className="text-3xl">📄</span>
      <span className="text-xs font-semibold text-center">Modul Moodle</span>
    </Link>
  );
}

export function MoodleBookQuickLink({ gradeLevel }: { gradeLevel?: string }) {
  const book = getRandomMoodleBook(gradeLevel);
  if (!book) return null;

  return (
    <Link
      href={book.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <span className="text-3xl">📘</span>
      <span className="text-xs font-semibold text-center">Buku Moodle</span>
    </Link>
  );
}
