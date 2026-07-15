#!/usr/bin/env python3
"""
AI Private Tutor — Video Generator Pipeline
=============================================
Gratis, CPU-only, bulk-ready.

Stack: edge-tts (narasi) + Pillow (compositing) + ffmpeg (video)
"""

import asyncio, json, os, re, subprocess, sys, textwrap
from pathlib import Path

PROJECT = Path.home() / "ai-private-tutor"
CHARACTERS = PROJECT / "public/characters"
OUTPUT_VIDEOS = PROJECT / "public/videos"

# ── Konfigurasi TTS ──
TTS_VOICE_MAP = {
    "sd": "id-ID-GadisNeural",    # suara cewek ceria buat SD
    "smp": "id-ID-ArdiNeural",    # suara cowok buat SMP
    "sma": "id-ID-ArdiNeural",    # suara cowok buat SMA
}

# Karakter per student
CHARACTER_MAP = {
    "Syifa": CHARACTERS / "syifa-kawaii.jpg",
    "Raihan": CHARACTERS / "raihan-mbappe.jpg",
    "SHOFI": CHARACTERS / "shofi-lisa.jpg",
}

# ── Narasi template ──
def build_narasi(subject: str, topics: list) -> str:
    """Buat teks narasi dari data mindmap"""
    topic_lines = "\n".join(f"- {t}" for t in topics)
    return f"""Halo! Yuk kita jelajahi {subject} bersama-sama!

{subject} punya beberapa topik seru, yaitu:
{topic_lines}

Klik topik yang kamu suka untuk belajar lebih detail.
Selamat belajar! 🎉"""


# ── Narasi Motivasi ──
MOTIVASI_QUOTES = [
    "Hai! Jangan pernah menyerah ya! Setiap orang punya kecepatan belajarnya masing-masing. Yang penting kamu sudah berusaha! 💪",
    "Belajar itu seperti naik sepeda. Mungkin goyang-goyang di awal, tapi setelah bisa, kamu akan melaju kencang! 🚲",
    "Kesalahan itu bukan kegagalan, tapi batu loncatan untuk jadi lebih baik. Yuk cobain lagi! 🌟",
    "Kamu hebat! Setiap hari kamu belajar hal baru, itu artinya kamu sudah jadi versi terbaik dari dirimu. 🏆",
    "Ingat! Ilmu itu seperti cahaya. Semakin banyak kamu belajar, semakin terang masa depanmu. 🔦",
    "Jangan bandingkan dirimu dengan orang lain. Bandingkan dirimu hari ini dengan dirimu kemarin. Kamu pasti lebih baik! 📈",
    "Sukses itu bukan soal seberapa cepat kamu sampai, tapi seberapa kuat kamu bertahan. Ayo terus semangat! 🔥",
]


async def generate_motivasi_video(
    student_name: str,
    voice_key: str = "smp",
    quote_idx: int | None = None,
):
    """Generate 1 motivational video"""
    char_path = CHARACTER_MAP.get(student_name)
    if not char_path or not char_path.exists():
        print(f"  ❌ Karakter untuk {student_name} tidak ditemukan")
        return None

    voice = TTS_VOICE_MAP.get(voice_key, "id-ID-ArdiNeural")
    import random
    if quote_idx is None:
        quote_idx = random.randint(0, len(MOTIVASI_QUOTES) - 1)
    narasi = MOTIVASI_QUOTES[quote_idx]

    safe_name = f"motivasi_{student_name.lower()}_{quote_idx}"
    audio_path = Path(f"/tmp/vid_{safe_name}.mp3")
    output_path = OUTPUT_VIDEOS / "motivasi" / f"{safe_name}.mp4"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"\n💪 Generating motivasi for {student_name}...")
    await generate_audio(narasi, voice, audio_path)

    title = f"💪 Semangat {student_name}!"
    success = compose_video(
        audio_path=audio_path,
        output_path=output_path,
        char_path=char_path,
        bg_color="#2d1b69",
        title=title,
        subtitle=narasi,
    )
    if success:
        audio_path.unlink(missing_ok=True)
        return output_path
    return None

# ── Edge-TTS ──
async def generate_audio(text: str, voice: str, output_path: Path):
    """Generate audio file from text using edge-tts"""
    from edge_tts import Communicate
    communicate = Communicate(text, voice)
    await communicate.save(str(output_path))
    print(f"  🎵 Audio saved: {output_path}")

# ── FFmpeg compositing ──
def compose_video(
    audio_path: Path,
    output_path: Path,
    char_path: Path,
    bg_color: str = "#1a1a2e",
    title: str = "",
    subtitle: str = "",
):
    """
    Buat video sederhana:
    - Background gradient
    - Karakter di pojok kiri
    - Teks judul + subtitle
    - Audio sync
    """
    # Durasi dari audio
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
        capture_output=True, text=True
    )
    duration = float(probe.stdout.strip() or 3)

    # Resolusi 720p
    W, H = 1280, 720

    # Build ffmpeg filter complex
    filters = []

    # 1. Background color
    filters.append(f"color=c={bg_color}:s={W}x{H}:d={duration}[bg]")

    # 2. Character image — scale & place at left
    char_w, char_h = 280, 420
    filters.append(
        f"movie={char_path}:loop=1,scale={char_w}:{char_h},"
        f"format=rgba,colorchannelmixer=aa=0.85[char]"
    )

    # 3. Overlay character on bg
    filters.append(f"[bg][char]overlay=40:{H-char_h-40}[base]")

    # 4. Title text
    if title:
        title_esc = title.replace("'", "'\\\\''")
        filters.append(
            f"[base]drawtext="
            f"text='{title_esc}':"
            f"fontcolor=white:fontsize=36:"
            f"x=380:y=80:"
            f"fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
            f"[withtitle]"
        )

    # 5. Subtitle — wrap & draw
    if subtitle:
        subtitle_esc = subtitle.replace("'", "'\\\\''")
        # Wrap text to fit
        wrapped = textwrap.fill(subtitle, width=50)
        lines = wrapped.split('\n')
        y_start = 140
        line_h = 30
        # Build multiple drawtext for each line
        line_filters = []
        base_label = "withtitle" if title else "base"
        for i, line in enumerate(lines):
            line_esc = line.replace("'", "'\\\\''")
            if i == 0:
                line_filters.append(
                    f"[{base_label}]drawtext="
                    f"text='{line_esc}':"
                    f"fontcolor=white:fontsize=22:"
                    f"x=380:y={y_start + i*line_h}:"
                    f"fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
                    f"[l{i}]"
                )
            else:
                line_filters.append(
                    f"[l{i-1}]drawtext="
                    f"text='{line_esc}':"
                    f"fontcolor=white:fontsize=22:"
                    f"x=380:y={y_start + i*line_h}:"
                    f"fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
                    f"[l{i}]"
                )
        filters.extend(line_filters)
        last_label = f"l{len(lines)-1}" if lines else base_label
    else:
        last_label = "withtitle" if title else "base"

    # Full filter chain
    filter_chain = "; ".join(filters)

    # Build command
    cmd = [
        "ffmpeg", "-y",
        "-i", str(audio_path),
        "-filter_complex", filter_chain,
        "-map", f"[{last_label}]",
        "-map", "0:a",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "28",
        "-c:a", "aac",
        "-b:a", "64k",
        "-shortest",
        "-movflags", "+faststart",
        str(output_path)
    ]

    print(f"  🎬 Generating video...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        print(f"  ❌ FFmpeg error: {result.stderr[:500]}")
        return False
    print(f"  ✅ Video: {output_path}")
    return True

# ── MAIN ──
async def generate_mindmap_video(
    student_name: str,
    subject: str,
    topics: list,
    voice_key: str = "smp",
):
    """Generate 1 mindmap explainer video"""
    char_path = CHARACTER_MAP.get(student_name)
    if not char_path or not char_path.exists():
        print(f"  ❌ Karakter untuk {student_name} tidak ditemukan")
        return None

    voice = TTS_VOICE_MAP.get(voice_key, "id-ID-ArdiNeural")
    narasi = build_narasi(subject, topics)

    # Output paths
    safe_name = subject.replace(" ", "_").lower()
    audio_path = Path(f"/tmp/vid_{safe_name}.mp3")
    output_path = OUTPUT_VIDEOS / "mindmap" / f"{safe_name}.mp4"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Generate audio
    print(f"\n🎙️  Generating audio for {subject}...")
    await generate_audio(narasi, voice, audio_path)

    # 2. Compose video
    title = f"🗺️ Peta Besar {subject}"
    subtitle = f"{student_name} — Yuk jelajahi semua topik!"

    success = compose_video(
        audio_path=audio_path,
        output_path=output_path,
        char_path=char_path,
        title=title,
        subtitle=narasi[:200],
    )

    if success:
        audio_path.unlink(missing_ok=True)
        return output_path
    return None


# ── CLI ──
if __name__ == "__main__":
    # Sample: generate 1 video mindmap explainer
    async def main():
        # Sample mindmap explainer
        print("=" * 50)
        print("🧠 GENERATE MINDMAP EXPLAINER SAMPLE")
        print("=" * 50)
        result1 = await generate_mindmap_video(
            student_name="Raihan",
            subject="Fisika",
            topics=["Besaran & Pengukuran", "Gerak Lurus", "Gaya & Hukum Newton"],
            voice_key="smp",
        )
        if result1:
            size_mb = result1.stat().st_size / 1_000_000
            print(f"📺 Mindmap video: {result1.name} ({size_mb:.1f} MB)")

        # Sample motivasi
        print("\n" + "=" * 50)
        print("💪 GENERATE MOTIVASI SAMPLE")
        print("=" * 50)
        result2 = await generate_motivasi_video(
            student_name="Raihan",
            voice_key="smp",
            quote_idx=0,
        )
        if result2:
            size_mb = result2.stat().st_size / 1_000_000
            print(f"📺 Motivasi video: {result2.name} ({size_mb:.1f} MB)")

        print("\n✅ Done!")

    asyncio.run(main())
