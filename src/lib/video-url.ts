/**
 * Normalize LLM-generated video descriptions to real YouTube search URLs.
 *
 * LLM sering ngasih judul video kayak:
 *   "Eksperimen Sumber Bunyi | Getaran pada Benda – Channel Anak Cerdas"
 *   "(Channel: Kok Bisa? atau sejenis)"
 *   "Rekomendasi: \"Cara Seru...\""
 *
 * Ini di-clean jadi YouTube search query.
 */
export function normalizeVideoUrl(input: string): string {
  if (!input) return input;

  // Already a valid URL — return as-is
  if (
    input.startsWith("http://") ||
    input.startsWith("https://") ||
    input.includes("youtube.com") ||
    input.includes("youtu.be")
  ) {
    return input;
  }

  // Bersihin artifacts LLM
  let clean = input
    // Hapus "Rekomendasi: " atau "Video edukasi: " prefix
    .replace(/^(Rekomendasi|Video|Video edukasi|Belajar|Tutorial|Tips?)\s*[:\-–—]\s*/gi, "")
    // Hapus "(Channel: ...)", "oleh channel ...", "– Channel ..." dll
    .replace(/[\(\[\(]?(Channel|Saluran|Kanal|oleh)\s*[:\-–—]?\s*[^\)\]]*[\)\]]?/gi, "")
    .replace(/[–—]\s*(channel|saluran|kanal)\s+[a-zA-Z\s]+/gi, "")
    // Hapus tanda kutip berlebih
    .replace(/["""'']/g, "")
    .trim();

  // Kalau masih panjang, ambil keyword pertama sebelum pipe atau tanda baca utama
  if (clean.length > 80) {
    // Ambil sebelum pipe pertama
    const pipeIdx = clean.indexOf("|");
    if (pipeIdx > 10) clean = clean.substring(0, pipeIdx).trim();
  }

  // Minimal 5 chars
  if (clean.length < 5) return input;

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`;
}
