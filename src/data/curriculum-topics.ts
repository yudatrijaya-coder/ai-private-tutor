/**
 * Kurikulum Merdeka — Full Topic Map
 *
 * Complete topic hierarchy from official SIBI Kemendikdasmen PDFs.
 * All topics sourced from Buku Siswa Kurikulum Merdeka resmi.
 *
 * SD/5  → curriculum-topics-sd5.ts   (from 6 PDF Buku SD Kelas V)
 * SMP/1 → curriculum-topics-smp7.ts  (from 7 PDF Buku SMP Kelas VII)
 * SMA/2 → curriculum-topics-sma11.ts (from 9 PDF Buku SMA Kelas XI)
 *
 * @module @/data/curriculum-topics
 */

import { GRADE_TOPICS_SD5 } from "./curriculum-topics-sd5";
import { GRADE_TOPICS_SMP7 } from "./curriculum-topics-smp7";
import { GRADE_TOPICS_SMA11 } from "./curriculum-topics-sma11";

export interface TopicEntry {
  subject: string;
  topic: string;
  subTopic: string;
  weekOrder: number;
  priority: number;
}

export const GRADE_TOPICS: Record<string, TopicEntry[]> = {
  SD_5: GRADE_TOPICS_SD5.SD_5,
  SMP_1: GRADE_TOPICS_SMP7.SMP_1,
  SMA_2: GRADE_TOPICS_SMA11.SMA_2,
};
