#!/usr/bin/env python3
"""
AI Private Tutor — Video Generator Pipeline v2
================================================
Theme-based: football (Raihan), kpop (SHOFI, Syifa)
Per video: 2 random characters from theme pool

Stack: Edge-TTS + HTML/CSS animation + Chromium headless + ffmpeg
CPU-only, no GPU needed.
"""

import asyncio, json, os, random, subprocess, sys
from pathlib import Path

PROJECT = Path.home() / "ai-private-tutor"
CHARACTERS = PROJECT / "public/characters"
OUTPUT_VIDEOS = PROJECT / "public/videos"

# ── Theme Pools (full-body action shots, no-bg) ──
THEME_POOLS = {
    # Football theme: action full body
    "football": [
        CHARACTERS / "football-mbappe-action-nobg.png",
        CHARACTERS / "football-ronaldo-action-nobg.png",
        CHARACTERS / "football-messi-action-nobg.png",
    ],
    # K-Pop theme: full body fashion/performance
    "kpop": [
        CHARACTERS / "kpop-lisa-action-nobg.png",
        CHARACTERS / "kpop-jennie-action-nobg.png",
        CHARACTERS / "kpop-jisoo-action-nobg.png",
    ],
}

# Student → theme mapping
STUDENT_THEME = {
    "Raihan": "football",
    "SHOFI": "kpop",
    "Syifa": "kpop",
}

# Voice mapping per grade
TTS_VOICE_MAP = {
    "sd": "id-ID-GadisNeural",
    "smp": "id-ID-ArdiNeural",
    "sma": "id-ID-ArdiNeural",
}

# Theme colors
THEME_COLORS = {
    "football": ("#0f0c29", "#302b63", "#24243e", "#ff6b6b", "#48dbfb", "#ffd93d"),
    "kpop": ("#1a0a1e", "#301b3e", "#4a2a5e", "#ff6bcb", "#b34bf8", "#ffd93d"),
}

# ── Motivasi Quotes ──
MOTIVASI_QUOTES = [
    "Jangan pernah menyerah! Setiap orang punya kecepatannya masing-masing. Yang penting kamu sudah berusaha! 💪",
    "Belajar itu seperti naik sepeda. Mungkin goyang di awal, tapi setelah bisa kamu akan melaju kencang! 🚲",
    "Kesalahan bukan kegagalan, tapi batu loncatan untuk jadi lebih baik. Yuk cobain lagi! 🌟",
    "Kamu hebat! Setiap hari belajar hal baru, kamu sudah jadi versi terbaik dirimu. 🏆",
    "Ilmu itu seperti cahaya. Semakin banyak belajar, semakin terang masa depanmu. 🔦",
    "Jangan bandingkan dirimu dengan orang lain. Bandingkan dirimu hari ini dengan kemarin. Kamu pasti lebih baik! 📈",
    "Sukses bukan soal seberapa cepat kamu sampai, tapi seberapa kuat kamu bertahan. Ayo terus semangat! 🔥",
    "Percaya sama prosesnya! Semua usaha kamu hari ini adalah investasi buat masa depan. 🌱",
    "Kamu bisa! Gak ada yang namanya terlalu sulit kalau kamu mau coba. 🚀",
    "Istirahat dulu boleh, tapi jangan berhenti ya! Semangat terus! ⭐",
]


def pick_2_characters(theme: str) -> list[Path]:
    """Pick 2 random no-bg images from theme pool"""
    pool = THEME_POOLS.get(theme, [])
    available = [p for p in pool if p.exists()]
    if len(available) < 2:
        return available * 2  # duplicate if only 1
    return random.sample(available, 2)


def build_html_scene(
    char_paths: list[Path],
    title: str,
    subtitle: str,
    theme: str = "football",
    video_type: str = "mindmap",
) -> str:
    """Generate animated HTML with 2 random characters side by side"""
    colors = THEME_COLORS.get(theme, THEME_COLORS["football"])
    c1, c2, c3, c4, c5, c6 = colors

    # Character images as file:// URLs
    if len(char_paths) < 2:
        char_paths = char_paths * 2
    img0 = char_paths[0].resolve()
    img1 = char_paths[1].resolve()

    # Type label
    label = "🧠 Mindmap Explainer" if video_type == "mindmap" else "💪 Motivasi"

    return f"""<!DOCTYPE html>
<html><head><style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:'Segoe UI',sans-serif; width:1280px; height:720px; overflow:hidden; }}

.bg {{
  position:absolute; inset:0;
  background: linear-gradient(135deg, {c1}, {c2}, {c3});
  background-size: 400% 400%;
  animation: bgShift 10s ease infinite;
}}
@keyframes bgShift {{ 0%{{background-position:0% 50%}} 50%{{background-position:100% 50%}} 100%{{background-position:0% 50%}} }}

.particles {{ position:absolute; inset:0; overflow:hidden; }}
.particle {{
  position:absolute; border-radius:50%; opacity:0.12;
  animation: float linear infinite;
}}
.p1 {{ width:100px;height:100px;background:{c4};left:5%;top:60%;animation-duration:14s; }}
.p2 {{ width:140px;height:140px;background:{c5};left:85%;top:30%;animation-duration:18s; }}
.p3 {{ width:70px;height:70px;background:{c6};left:45%;top:70%;animation-duration:12s; }}
.p4 {{ width:120px;height:120px;background:{c4};left:15%;top:5%;animation-duration:20s; }}
.p5 {{ width:50px;height:50px;background:{c5};left:75%;top:80%;animation-duration:16s; }}
@keyframes float {{
  0% {{ transform:translateY(0) rotate(0deg) scale(1);opacity:0.12; }}
  50% {{ transform:translateY(-150px) rotate(180deg) scale(1.3);opacity:0.3; }}
  100% {{ transform:translateY(-300px) rotate(360deg) scale(1);opacity:0.12; }}
}}

.scene-title {{
  position:absolute; top:25px; left:50%; transform:translateX(-50%);
  font-size:14px; color:rgba(255,255,255,0.25);
  letter-spacing:3px; text-transform:uppercase;
}}

/* ── 2 Characters in corners ── */
.characters {{
  position:absolute; bottom:20px; left:0; right:0;
  height: 360px;
  pointer-events: none;
}}

.char-item {{
  position:absolute; bottom:0;
  display:flex; align-items:flex-end;
  filter: drop-shadow(0 10px 40px rgba(0,0,0,0.5));
}}

.char-item img {{
  height: 100%;
  max-height: 320px;
  width: auto;
  object-fit: contain;
}}

.char-left {{
  left: 20px;
  animation: charAnim1 6s ease-in-out infinite;
  transform-origin: bottom center;
}}
.char-right {{
  right: 20px;
  animation: charAnim2 5s ease-in-out infinite;
  transform-origin: bottom center;
}}

@keyframes charAnim1 {{
  0% {{ transform: translateY(0) rotate(-1deg); }}
  50% {{ transform: translateY(-8px) rotate(1deg); }}
  100% {{ transform: translateY(0) rotate(-1deg); }}
}}
@keyframes charAnim2 {{
  0% {{ transform: translateY(0) scale(1); }}
  50% {{ transform: translateY(-10px) scale(1.02); }}
  100% {{ transform: translateY(0) scale(1); }}
}}

/* Glow rings at corners */
.glowl,.glowr {{
  position:absolute; bottom:40px; width:220px; height:220px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(255,107,107,0.15) 0%, transparent 70%);
  animation: glowPulse 4s ease-in-out infinite;
}}
.glowl {{
  left: -20px;
}}
.glowr {{
  right: -20px;
  background:radial-gradient(circle, rgba(72,219,251,0.15) 0%, transparent 70%);
  animation-delay: -2s;
}}
@keyframes glowPulse {{
  0% {{ transform:scale(1);opacity:0.3; }}
  50% {{ transform:scale(1.3);opacity:0.7; }}
  100% {{ transform:scale(1);opacity:0.3; }}
}}

/* Title — centered with max space */
.title-wrapper {{
  position:absolute; left:80px; right:80px; top:70px;
  text-align:center;
  z-index: 3;
}}
.title-line {{
  overflow:hidden; white-space:nowrap;
  font-size:40px; font-weight:800; color:#fff;
  text-shadow: 0 2px 30px rgba(255,107,107,0.3);
  width:0; margin:0 auto;
  animation: typewrite 2.5s steps(35) 0.5s forwards;
}}
.tl2 {{ font-size:30px; animation-delay:3.5s; color:{c6}; }}
.sub-text {{
  font-size:20px; font-weight:400; animation-delay:6s;
  color:rgba(255,255,255,0.8); white-space:normal; width:90%; margin:0 auto; overflow:visible;
  opacity:0; animation:fadeUp 1s ease 6s forwards;
}}
@keyframes typewrite {{ to {{ width:100%; }} }}
@keyframes fadeUp {{ from{{opacity:0;transform:translateY(15px)}} to{{opacity:1;transform:translateY(0)}} }}

.cursor {{ display:inline-block; width:3px; height:40px; background:{c4}; margin-left:4px; animation:blink 0.8s step-end infinite; vertical-align:text-bottom; }}

@keyframes blink {{ 50% {{ opacity:0; }} }}
</style></head><body>
<div class="bg"></div>
<div class="particles">
  <div class="particle p1"></div>
  <div class="particle p2"></div>
  <div class="particle p3"></div>
  <div class="particle p4"></div>
  <div class="particle p5"></div>
</div>
<div class="scene-title">{label}</div>

<div class="glowl" style="left:80px;"></div>
<div class="glowr"></div>

<div class="characters">
  <div class="char-item char-left">
    <img src="file://{img0}" alt="character 1" />
  </div>
  <div class="char-item char-right">
    <img src="file://{img1}" alt="character 2" />
  </div>
</div>

<div class="title-wrapper">
  <div class="title-line">{title}<span class="cursor"></span></div>
  {subtitle}
</div>
</body></html>"""


# ── Edge-TTS ──
async def generate_audio(text: str, voice: str, output_path: Path):
    from edge_tts import Communicate
    communicate = Communicate(text, voice)
    await communicate.save(str(output_path))
    duration = get_audio_duration(output_path)
    print(f"  🎵 Audio: {output_path.name} ({duration:.1f}s)")
    return duration


def get_audio_duration(audio_path: Path) -> float:
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
        capture_output=True, text=True
    )
    try:
        return float(probe.stdout.strip() or 3)
    except ValueError:
        return 3


# ── Render HTML → Video via Chromium ──
def render_html_to_video(html_path: Path, output_path: Path, duration: float):
    """Render animated HTML to MP4 using Playwright + ffmpeg"""
    print(f"  🎬 Rendering video ({duration:.0f}s)...")

    cmd = ["node",
           str(PROJECT / "scripts" / "render-video.mjs"),
           str(html_path), str(output_path), str(duration)]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        print(f"  ❌ Render error: {result.stderr[:300]}")
        return False
    print(f"  ✅ Video: {output_path.name}")
    return True


# ── Generate 1 Mindmap Explainer Video ──
async def generate_mindmap_video(
    student_name: str,
    subject: str,
    topics: list,
    voice_key: str = "smp",
) -> Path | None:
    theme = STUDENT_THEME.get(student_name, "football")
    char_paths = pick_2_characters(theme)

    if len(char_paths) < 2 or not all(p.exists() for p in char_paths):
        print(f"  ❌ Karakter theme {theme} tidak cukup untuk {student_name}")
        return None

    # Narasi
    topic_lines = "\n".join(f"• {t}" for t in topics)
    narasi = f"Halo! Yuk kita jelajahi {subject} bersama-sama!\n\n{subject} punya beberapa topik seru, yaitu:\n{topic_lines}\n\nKlik topik yang kamu suka untuk belajar lebih detail. Selamat belajar!"

    voice = TTS_VOICE_MAP.get(voice_key, "id-ID-ArdiNeural")
    theme_emoji = "⚽" if theme == "football" else "🎤"

    safe_name = f"{student_name.lower()}_{subject.lower().replace(' ', '_')}"
    audio_path = Path(f"/tmp/vid_{safe_name}.mp3")
    output_path = OUTPUT_VIDEOS / "mindmap" / f"{safe_name}.mp4"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    html_path = Path(f"/tmp/vid_{safe_name}.html")

    # 1. Audio
    print(f"\n🧠 {subject} — {student_name}")
    duration = await generate_audio(narasi, voice, audio_path)

    # 2. Build HTML scene
    title_line = f"🗺️ Yuk Belajar {subject}!"
    sub_line = f"<div class='sub-text'>{theme_emoji} {', '.join(t for t in topics[:3])}</div>"
    html = build_html_scene(
        char_paths, title_line, sub_line, theme, "mindmap"
    )
    html_path.write_text(html)

    # 3. Render
    success = render_html_to_video(html_path, output_path, duration + 2)

    # Cleanup
    audio_path.unlink(missing_ok=True)
    html_path.unlink(missing_ok=True)

    if success:
        return output_path
    return None


# ── Generate 1 Motivasi Video ──
async def generate_motivasi_video(
    student_name: str,
    voice_key: str = "smp",
    quote_idx: int | None = None,
) -> Path | None:
    theme = STUDENT_THEME.get(student_name, "football")
    char_paths = pick_2_characters(theme)

    if len(char_paths) < 2 or not all(p.exists() for p in char_paths):
        print(f"  ❌ Karakter theme {theme} tidak cukup untuk {student_name}")
        return None

    if quote_idx is None:
        quote_idx = random.randint(0, len(MOTIVASI_QUOTES) - 1)

    narasi = MOTIVASI_QUOTES[quote_idx]
    voice = TTS_VOICE_MAP.get(voice_key, "id-ID-ArdiNeural")
    theme_emoji = "⚽" if theme == "football" else "🎤"

    safe_name = f"motivasi_{student_name.lower()}_{quote_idx}"
    audio_path = Path(f"/tmp/vid_{safe_name}.mp3")
    html_path = Path(f"/tmp/vid_{safe_name}.html")
    output_path = OUTPUT_VIDEOS / "motivasi" / f"{safe_name}.mp4"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Audio
    print(f"\n💪 Motivasi #{quote_idx + 1} — {student_name}")
    duration = await generate_audio(narasi, voice, audio_path)

    # 2. HTML
    title_line = f"💪 Semangat {student_name}!"
    sub_line = f"<div class='sub-text'>{narasi}</div>"
    html = build_html_scene(
        char_paths, title_line, sub_line, theme, "motivasi"
    )
    html_path.write_text(html)

    # 3. Render
    success = render_html_to_video(html_path, output_path, duration + 2)

    audio_path.unlink(missing_ok=True)
    html_path.unlink(missing_ok=True)

    if success:
        return output_path
    return None


# ── Main ──
async def main():
    random.seed()  # True randomness each run

    print("=" * 60)
    print("🧠 GENERATE SAMPLE: RAIHAN (Football Theme)")
    print("=" * 60)
    r1 = await generate_mindmap_video(
        "Raihan", "Fisika",
        ["Besaran & Pengukuran", "Gerak Lurus", "Gaya & Hukum Newton"],
        "smp"
    )
    if r1:
        print(f"  📺 {r1.name} — {r1.stat().st_size / 1_000_000:.1f} MB")

    r2 = await generate_motivasi_video("Raihan", "smp", 0)
    if r2:
        print(f"  📺 {r2.name} — {r2.stat().st_size / 1_000_000:.1f} MB")

    print("\n" + "=" * 60)
    print("🎤 GENERATE SAMPLE: SHOFI (K-Pop Theme)")
    print("=" * 60)
    s1 = await generate_mindmap_video(
        "SHOFI", "Biologi",
        ["Sel & Jaringan", "Sistem Pencernaan", "Evolusi"],
        "sma"
    )
    if s1:
        print(f"  📺 {s1.name} — {s1.stat().st_size / 1_000_000:.1f} MB")

    s2 = await generate_motivasi_video("SHOFI", "sma", 1)
    if s2:
        print(f"  📺 {s2.name} — {s2.stat().st_size / 1_000_000:.1f} MB")

    print("\n✅ Done!")

if __name__ == "__main__":
    asyncio.run(main())
