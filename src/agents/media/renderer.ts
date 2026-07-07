/**
 * FFmpeg Render — simplified, writes FFmpeg script to file instead of shell escaping.
 *
 * Per design spec: slideshow + character label in corner + TTS + background.
 */
import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";

const VIDEOS_DIR = join(process.cwd(), "public", "videos");
function ensureDir(p: string) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

const SUBJECT_COLORS: Record<string, string> = {
  IPA: "0x064e3b", Matematika: "0x312e81", "Bahasa Indonesia": "0x78350f",
  Inggris: "0x831843", IPS: "0x164e63",
};

function getColor(t: string) {
  for (const [k, c] of Object.entries(SUBJECT_COLORS))
    if (t.toLowerCase().includes(k.toLowerCase())) return c;
  return "0x1e1b4b";
}

const CHARACTERS: Record<string, string> = {
  ian: "Ian", lisa: "Lisa", mbappe: "Mbappe",
  "kak-budi": "Kak Budi", "kak-dewi": "Kak Dewi", "kak-raka": "Kak Raka",
};

export async function renderVideo(
  materialId: string, audioUrl: string, script: string, title: string,
  _slides?: string[], characterKey?: string,
): Promise<string | null> {
  ensureDir(VIDEOS_DIR);
  const hash = materialId.replace(/-/g, "").slice(0, 12);
  const outPath = join(VIDEOS_DIR, `video_${hash}.mp4`);
  const audioPath = join(process.cwd(), "public", audioUrl.replace(/^\//, ""));
  if (existsSync(outPath)) return `/videos/video_${hash}.mp4`;
  if (!existsSync(audioPath)) { console.error(`[Render] Audio missing`); return null; }

  const color = getColor(title);
  const charName = CHARACTERS[characterKey || ""] || "Kak Budi";
  const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

  try {
    const duration = Math.ceil(parseFloat(
      execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`).toString().trim()
    )) + 3;

    // Extract clean text chunks from script
    const sentences = script
      .replace(/\[VISUAL:[^\]]*\]/g, "")
      .replace(/^[A-Za-z]+:\s*/gm, "")
      .replace(/["""]/g, "")
      .match(/[^.!?]+[.!?]+/g) || [script];

    const chunks: string[] = [];
    let cur = "";
    for (const s of sentences) {
      const t = s.replace(/\s+/g, " ").trim();
      if (!t) continue;
      if ((cur + " " + t).length > 140) { chunks.push(cur.trim()); cur = t; }
      else cur += (cur ? " " : "") + t;
    }
    if (cur) chunks.push(cur.trim());
    const slides = chunks.slice(0, 5);
    const secPerSlide = slides.length > 0 ? duration / slides.length : duration;

    // Write FFmpeg filter script to a file (avoids shell escaping hell)
    const filterLines: string[] = [];
    let concat = "";

    for (let i = 0; i < slides.length; i++) {
      const text = slides[i].replace(/'/g, "").replace(/[^a-zA-Z0-9\s.,!?]/g, "").trim();
      const s = Math.round(i * secPerSlide * 30);
      const e = Math.round((i + 1) * secPerSlide * 30);

      filterLines.push(
        `[0:v]trim=start_frame=${s}:end_frame=${e},setpts=PTS-STARTPTS,` +
        `drawtext=text='${text}':fontcolor=white:fontsize=28:line_spacing=8:box=1:boxcolor=black@0.5:boxborderw=20:` +
        `x=(w-text_w)/2:y=(h-text_h)/2-40:fontfile=${font},` +
        `drawtext=text='${charName}':fontcolor=white:fontsize=22:x=w-tw-20:y=h-th-15:fontfile=${font}[s${i}]`
      );
      concat += `[s${i}]`;
    }

    filterLines.push(`${concat}concat=n=${slides.length}:v=1:a=0[outv]`);

    const filterFile = join(VIDEOS_DIR, `filter_${hash}.txt`);
    writeFileSync(filterFile, filterLines.join(";\n"));

    const cmd = [
      `ffmpeg -y -loglevel error`,
      `-f lavfi -i "color=c=${color}:s=1280x720:rate=30:d=${duration}"`,
      `-i "${audioPath}"`,
      `-filter_complex_script "${filterFile}"`,
      `-map "[outv]" -map 1:a`,
      `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -shortest "${outPath}"`,
    ].join(" ");

    console.log(`[Render] Generating (${slides.length} slides, ${duration}s)...`);
    execSync(cmd, { timeout: 300_000, maxBuffer: 1024 * 1024 * 10 });

    try { unlinkSync(filterFile); } catch {}

    const size = existsSync(outPath) ? `${(readFileSync(outPath).length / 1024 / 1024).toFixed(1)}MB` : "?";
    console.log(`[Render] Done: video_${hash}.mp4 (${size})`);
    return `/videos/video_${hash}.mp4`;
  } catch (err) {
    console.error("[Render] Failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
