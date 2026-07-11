/**
 * Per-icon CSS animation mapping for mindmap nodes.
 * Each icon gets a unique personality — rocket flies, flask shakes, leaf sways.
 * All pure CSS keyframes, no JS animation runtime.
 */

/** Animation config per icon */
interface AnimConfig {
  /** CSS animation shorthand (duration timing count) */
  track: string;
  /** Name of the @keyframes rule */
  kf: string;
  /** Keyframes CSS to inject */
  css: string;
}

const animationMap: Record<string, AnimConfig> = {
  Rocket: {
    track: "animRocket 2.5s ease-in-out infinite",
    kf: "animRocket",
    css: `@keyframes animRocket { 0%,100%{transform:translateY(0)rotate(-5deg)} 50%{transform:translateY(-8px)rotate(5deg)} }`,
  },
  Flask: {
    track: "animFlask 2s ease-in-out infinite",
    kf: "animFlask",
    css: `@keyframes animFlask { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-6deg)} 75%{transform:rotate(4deg)} }`,
  },
  Atom: {
    track: "animAtom 6s linear infinite",
    kf: "animAtom",
    css: `@keyframes animAtom { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`,
  },
  Leaf: {
    track: "animLeaf 3s ease-in-out infinite",
    kf: "animLeaf",
    css: `@keyframes animLeaf { 0%,100%{transform:rotate(0)translateX(0)} 50%{transform:rotate(3deg)translateX(3px)} }`,
  },
  Flame: {
    track: "animFlame 0.8s ease-in-out infinite",
    kf: "animFlame",
    css: `@keyframes animFlame { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`,
  },
  Fire: {
    track: "animFlame 0.8s ease-in-out infinite",
    kf: "animFlame",
    css: `@keyframes animFlame { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`,
  },
  Music: {
    track: "animMusic 1.5s ease-in-out infinite",
    kf: "animMusic",
    css: `@keyframes animMusic { 0%,100%{transform:translateY(0)} 25%{transform:translateY(-4px)} 75%{transform:translateY(2px)} }`,
  },
  Headphones: {
    track: "animMusic 1.5s ease-in-out infinite",
    kf: "animMusic",
    css: `@keyframes animMusic { 0%,100%{transform:translateY(0)} 25%{transform:translateY(-4px)} 75%{transform:translateY(2px)} }`,
  },
  Trophy: {
    track: "animTrophy 2s ease-in-out infinite",
    kf: "animTrophy",
    css: `@keyframes animTrophy { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.25)} }`,
  },
  Award: {
    track: "animTrophy 2s ease-in-out infinite",
    kf: "animTrophy",
    css: `@keyframes animTrophy { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.25)} }`,
  },
  Sun: {
    track: "animSun 3s ease-in-out infinite",
    kf: "animSun",
    css: `@keyframes animSun { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }`,
  },
  Star: {
    track: "animStar 1.5s ease-in-out infinite",
    kf: "animStar",
    css: `@keyframes animStar { 0%,100%{transform:scale(1)rotate(0)} 50%{transform:scale(1.12)rotate(10deg)} }`,
  },
  Sparkles: {
    track: "animStar 1.5s ease-in-out infinite",
    kf: "animStar",
    css: `@keyframes animStar { 0%,100%{transform:scale(1)rotate(0)} 50%{transform:scale(1.12)rotate(10deg)} }`,
  },
  Heart: {
    track: "animHeart 1.2s ease-in-out infinite",
    kf: "animHeart",
    css: `@keyframes animHeart { 0%,100%{transform:scale(1)} 15%{transform:scale(1.12)} 30%{transform:scale(1)} 45%{transform:scale(1.06)} }`,
  },
  Globe: {
    track: "animGlobe 8s linear infinite",
    kf: "animGlobe",
    css: `@keyframes animGlobe { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }`,
  },
  Compass: {
    track: "animGlobe 8s linear infinite",
    kf: "animGlobe",
    css: `@keyframes animGlobe { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }`,
  },
  Moon: {
    track: "animMoon 4s ease-in-out infinite",
    kf: "animMoon",
    css: `@keyframes animMoon { 0%,100%{opacity:0.7} 50%{opacity:1;filter:brightness(1.15)} }`,
  },
  Mountain: {
    track: "animFloat 3s ease-in-out infinite",
    kf: "animFloat",
    css: `@keyframes animFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`,
  },
  Cloud: {
    track: "animCloud 5s ease-in-out infinite",
    kf: "animCloud",
    css: `@keyframes animCloud { 0%,100%{transform:translateX(0)} 50%{transform:translateX(6px)} }`,
  },
  Rainbow: {
    track: "animRainbow 3s linear infinite",
    kf: "animRainbow",
    css: `@keyframes animRainbow { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }`,
  },
  Book: {
    track: "animBook 4s ease-in-out infinite",
    kf: "animBook",
    css: `@keyframes animBook { 0%,100%{transform:rotateY(0)} 50%{transform:rotateY(10deg)} }`,
  },
  BookOpen: {
    track: "animBook 4s ease-in-out infinite",
    kf: "animBook",
    css: `@keyframes animBook { 0%,100%{transform:rotateY(0)} 50%{transform:rotateY(10deg)} }`,
  },
  Pen: {
    track: "animPen 2s ease-in-out infinite",
    kf: "animPen",
    css: `@keyframes animPen { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(8deg)} }`,
  },
  PenTool: {
    track: "animPen 2s ease-in-out infinite",
    kf: "animPen",
    css: `@keyframes animPen { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(8deg)} }`,
  },
  Pencil: {
    track: "animPen 2s ease-in-out infinite",
    kf: "animPen",
    css: `@keyframes animPen { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(8deg)} }`,
  },
  Brush: {
    track: "animPen 2s ease-in-out infinite",
    kf: "animPen",
    css: `@keyframes animPen { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(8deg)} }`,
  },
  Dumbbell: {
    track: "animDumbbell 1.5s ease-in-out infinite",
    kf: "animDumbbell",
    css: `@keyframes animDumbbell { 0%,100%{transform:translateY(0)} 25%{transform:translateY(-3px)} 75%{transform:translateY(1px)} }`,
  },
  Bolt: {
    track: "animBolt 0.5s ease-in-out infinite",
    kf: "animBolt",
    css: `@keyframes animBolt { 0%,100%{opacity:1} 50%{opacity:0.4} }`,
  },
  Zap: {
    track: "animBolt 0.5s ease-in-out infinite",
    kf: "animBolt",
    css: `@keyframes animBolt { 0%,100%{opacity:1} 50%{opacity:0.4} }`,
  },
  Gamepad: {
    track: "animGamepad 3s ease-in-out infinite",
    kf: "animGamepad",
    css: `@keyframes animGamepad { 0%,100%{transform:translateY(0)} 20%{transform:translateY(-3px)} 40%{transform:translateY(0)} 60%{transform:translateX(2px)} }`,
  },
  Puzzle: {
    track: "animPuzzle 3s ease-in-out infinite",
    kf: "animPuzzle",
    css: `@keyframes animPuzzle { 0%,100%{transform:rotate(0)} 33%{transform:rotate(-5deg)} 66%{transform:rotate(5deg)} }`,
  },
  Lightbulb: {
    track: "animBulb 2s ease-in-out infinite",
    kf: "animBulb",
    css: `@keyframes animBulb { 0%,100%{opacity:0.6} 50%{opacity:1;filter:drop-shadow(0 0 4px gold)} }`,
  },
  Brain: {
    track: "animBrain 3s ease-in-out infinite",
    kf: "animBrain",
    css: `@keyframes animBrain { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }`,
  },
  Microscope: {
    track: "animFloat 3s ease-in-out infinite",
    kf: "animFloat",
    css: `@keyframes animFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`,
  },
  Crown: {
    track: "animTrophy 2s ease-in-out infinite",
    kf: "animTrophy",
    css: `@keyframes animTrophy { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.25)} }`,
  },
  Diamond: {
    track: "animSparkle 2s ease-in-out infinite",
    kf: "animSparkle",
    css: `@keyframes animSparkle { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.3)} }`,
  },
  Gem: {
    track: "animSparkle 2s ease-in-out infinite",
    kf: "animSparkle",
    css: `@keyframes animSparkle { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.3)} }`,
  },
  Flag: {
    track: "animFlag 2s ease-in-out infinite",
    kf: "animFlag",
    css: `@keyframes animFlag { 0%,100%{transform:skewX(0)} 50%{transform:skewX(4deg)} }`,
  },
};

/** Default float animation for any icon not in the map */
const DEFAULT_ANIM = {
  track: "animFloat 3s ease-in-out infinite",
  kf: "animFloat",
  css: `@keyframes animFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`,
};

export function getAnimForIcon(iconName?: string): AnimConfig {
  if (iconName && animationMap[iconName]) return animationMap[iconName];
  return DEFAULT_ANIM;
}

/** Collect all unique @keyframes CSS rules for icons used */
export function collectKeyframes(iconNames: string[]): string {
  const seen = new Set<string>();
  return iconNames
    .map((name) => {
      const anim = animationMap[name] || DEFAULT_ANIM;
      if (seen.has(anim.kf)) return "";
      seen.add(anim.kf);
      return anim.css;
    })
    .filter(Boolean)
    .join("\n");
}
