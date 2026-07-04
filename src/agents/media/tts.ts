/**
 * TTS Engine — placeholder for Edge TTS integration.
 *
 * Phase 4 will replace these stubs with real text-to-speech calls using
 * Microsoft Edge TTS (via `edge-tts` Python package cross-called from
 * Node, or a native JS wrapper) to generate `.mp3` narration files.
 *
 * @module @/agents/media/tts
 */

/**
 * Generate a narration audio buffer for the given script and character.
 *
 * @param script - The full narration text to speak.
 * @param characterKey - Character key ("mbappe", "lisa", etc.)
 * @returns An audio Buffer (MP3), or null when TTS is not yet wired.
 */
export async function generateNarration(
  script: string,
  characterKey: string,
): Promise<Buffer | null> {
  console.log(
    `[TTS][${characterKey}] Would generate: ${script.slice(0, 100)}...`,
  );
  return null;
}

/**
 * Estimate the speech duration in seconds for a given text.
 * Rough heuristic: ~4 words per second for Indonesian.
 */
export function estimateSpeechDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / 4);
}

/**
 * Get available voice name for a character key.
 * Phase 4 will map these to real Edge TTS voice IDs.
 */
export function getVoiceName(characterKey: string): string {
  const voiceMap: Record<string, string> = {
    mbappe: "id-ID-ArdiNeural",
    lisa: "id-ID-GadisNeural",
    "kak-budi": "id-ID-ArdiNeural",
    "kak-dewi": "id-ID-GadisNeural",
    "kak-raka": "id-ID-ArdiNeural",
  };
  return voiceMap[characterKey] ?? "id-ID-ArdiNeural";
}
