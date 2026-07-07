/**
 * Character Assets — configurable tutor personas for video narration.
 *
 * Maps short character keys (stored in `student.characterPreference`)
 * to display name, emoji, voice style, accent color, and visual props.
 *
 * @module @/agents/media/characters
 */

export interface CharacterConfig {
  name: string;
  emoji: string;
  voiceStyle: string;
  color: string;
  /** Brief description of the character's personality for prompt context */
  description?: string;
}

export const CHARACTER_CONFIGS = {
  mbappe: {
    name: "Mbappe",
    emoji: "⚽",
    voiceStyle: "semangat, sporty",
    color: "#1a5276",
    description:
      "Seperti pemain bola Mbappe — cepat, penuh semangat, suka tantangan. Gaya bicara sporty dengan energi tinggi.",
  },
  lisa: {
    name: "Lisa",
    emoji: "💖",
    voiceStyle: "cemerlang, energetik",
    color: "#e91e63",
    description:
      "Seperti Lisa Blackpink — ceria, energetik, dan keren. Gaya bicara cemerlang dengan anak muda.",
  },
  "kak-budi": {
    name: "Kak Budi",
    emoji: "🦉",
    voiceStyle: "sabar, ramah",
    color: "#f59e0b",
    description:
      "Kakak tutor yang sabar dan ramah. Gaya bicara tenang dengan analogi sederhana.",
  },
  "kak-dewi": {
    name: "Kak Dewi",
    emoji: "🌟",
    voiceStyle: "semangat, kakak",
    color: "#8b5cf6",
    description:
      "Kakak asyik yang penuh semangat dan suka ngasih contoh dari kehidupan sehari-hari.",
  },
  "kak-raka": {
    name: "Kak Raka",
    emoji: "🔥",
    voiceStyle: "energik, gaul",
    color: "#ef4444",
    description:
      "Kakak paling kece dengan energi tinggi — gaul, hype, dan seru abis!",
  },
  ian: {
    name: "Ian",
    emoji: "🌟",
    voiceStyle: "ceria, lembut, k-pop",
    color: "#ff6b9d",
    description:
      "Seperti member Hearts2Hearts — ceria, manis, dan penuh semangat. Gaya bicara ringan dengan sentuhan K-pop yang kekinian.",
  },
} as const satisfies Record<string, CharacterConfig>;

/** Union type of all valid character keys */
export type CharacterKey = keyof typeof CHARACTER_CONFIGS;

/**
 * Get character config by key. Falls back to "kak-budi" when the key
 * doesn't match any known character.
 */
export function getCharacter(key: string | null | undefined): CharacterConfig {
  if (key && key in CHARACTER_CONFIGS) {
    return CHARACTER_CONFIGS[key as CharacterKey];
  }
  return CHARACTER_CONFIGS["kak-budi"];
}
