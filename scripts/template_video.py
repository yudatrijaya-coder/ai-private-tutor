#!/usr/bin/env -S /home/ubuntu/manim-env/bin/python
"""
SenangBelajar — Manim Video Template
=====================================
Template Manim untuk video pembelajaran AI Private Tutor.

Fitur:
  - 720p30 (HD ready)
  - Gradient background + SenangBelajar branding (logo asli)
  - Real per-scene timing from voiceover durations
  - Per-scene TTS voiceover (edge-tts id-ID-ArdiNeural)
  - SRT subtitle from real audio durations
  - Background music (ambient, loop)
  - Modular scene building blocks

Usage:
  /home/ubuntu/manim-env/bin/python template_video.py [--preview]
"""
import os, sys, json, subprocess, argparse, math
from manim import *

# ═══════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
BG_IMAGE = os.path.join(ASSETS_DIR, "bg_gradient.png")
LOGO_FILE = os.path.join(ASSETS_DIR, "logo_asli.jpg")  # real logo from user

SENANG_BLUE = "#1a73e8"
SENANG_DARK = "#0d47a1"
SENANG_ACCENT = "#ffd54f"
SENANG_WHITE = "#ffffff"

# Module-level state for narration (used by TTS pipeline)
NARRATION = []  # list of (label, str)
# Per-scene target animation durations (seconds)
SCENE_DURATIONS = []  # list of float


# ═══════════════════════════════════════════════════════════════════
# Branding helpers
# ═══════════════════════════════════════════════════════════════════
def gradient_bg():
    return ImageMobject(BG_IMAGE)


def watermark():
    wm = Text("senangbelajar.web.id", font_size=22, color=WHITE, opacity=0.45, font="Lato")
    wm.to_corner(DR, buff=0.3)
    return wm


def logo_sign():
    """SenangBelajar logo asli (persistent, bottom-left)."""
    img = ImageMobject(LOGO_FILE)
    img.scale_to_fit_height(0.65)
    img.set_opacity(0.35)
    img.to_corner(DL, buff=0.25)
    return img


def subject_header(subject="FISIKA", subtopic="Gerak Lurus: Jarak & Perpindahan"):
    """Persistent subject (top-left) and subtopic (top-right) labels."""
    subj = Text(subject, font_size=22, color=SENANG_BLUE, weight=BOLD, font="Lato", opacity=0.8)
    subj.to_corner(UL, buff=0.4)
    topic = Text(subtopic, font_size=16, color=GREY_B, font="Lato", opacity=0.55)
    topic.to_corner(UR, buff=0.4)
    return VGroup(subj, topic)


def scene_branding(scene, subject="FISIKA", subtopic="Gerak Lurus: Jarak & Perpindahan"):
    """Add all persistent branding to scene."""
    scene.add(gradient_bg(), watermark(), logo_sign(), subject_header(subject, subtopic))


def fn_timer(scene, base_duration: float, index: int):
    """Adjust scene wait time so total duration matches target.
    Call ONCE near the end of each scene.
    Index: the scene number (0-based) matching NARRATION order.
    """
    if index < len(SCENE_DURATIONS) and SCENE_DURATIONS[index] > base_duration:
        extra = SCENE_DURATIONS[index] - base_duration
        if extra > 0.5:
            scene.wait(extra)


# ═══════════════════════════════════════════════════════════════════
# Scene building blocks
# ═══════════════════════════════════════════════════════════════════
def branded_title(scene, title_text, subtitle_text=None):
    card = Rectangle(width=14, height=2.5, fill_color=SENANG_DARK,
                     fill_opacity=0.8, stroke_color=SENANG_BLUE, stroke_width=2)
    title = Text(title_text, font_size=48, color=SENANG_WHITE, weight=BOLD)
    group = VGroup(card, title)
    if subtitle_text:
        sub = Text(subtitle_text, font_size=28, color=SENANG_ACCENT)
        sub.next_to(title, DOWN, buff=0.3)
        group.add(sub)
    group.move_to(ORIGIN)
    scene.play(FadeIn(group, scale=0.85), run_time=1.0)
    scene.wait(1.5)
    scene.play(FadeOut(group, scale=1.15), run_time=0.8)
    return 3.3  # base seconds consumed


def branded_outro(scene, message=None):
    if not message:
        message = "Paham? Yuk lanjut belajar! 💪"
    card = Rectangle(width=12, height=2.0, fill_color=SENANG_DARK,
                     fill_opacity=0.85, stroke_color=SENANG_ACCENT, stroke_width=2)
    text = Text(message, font_size=36, color=SENANG_WHITE, weight=BOLD)
    group = VGroup(card, text).move_to(ORIGIN)
    scene.play(FadeIn(group, scale=0.85), run_time=0.8)
    scene.wait(2.5)
    scene.play(FadeOut(group, scale=1.1), run_time=0.6)
    return 3.9


def branded_table(scene, headers, rows, title_text=None):
    if title_text:
        t = Text(title_text, font_size=34, color=SENANG_BLUE, weight=BOLD)
        t.to_edge(UP)
        scene.play(Write(t), run_time=0.8)
    else:
        t = None
    data = [headers] + rows
    table = Table(
        data,
        include_outer_lines=True,
        line_config={"stroke_color": BLUE_D, "stroke_width": 2},
        element_to_mobject=lambda c: Text(c, font_size=22, color=WHITE),
    ).scale(0.7)
    table.next_to(t, DOWN, buff=0.4) if t else table.move_to(ORIGIN)
    scene.play(FadeIn(table, shift=UP), run_time=0.8)
    scene.wait(2.0)
    return VGroup(t, table) if t else table


# ═══════════════════════════════════════════════════════════════════
# The Scene — Gerak Lurus: Jarak & Perpindahan
# ═══════════════════════════════════════════════════════════════════
class GerakLurusJarakV2(Scene):
    def construct(self):
        global NARRATION, SCENE_DURATIONS
        NARRATION = []

        self.camera.background_color = BLACK
        scene_branding(self)

        # ═══ SCENE 0: Title (target durasi ~10.9s) ═══════════════
        NARRATION.append(("title",
            "Halo! Hari ini kita belajar tentang Gerak Lurus. "
            "Apa itu jarak? Apa itu perpindahan? Yuk kita pelajari bersama!"))
        self.next_section("TITLE")
        branded_title(self, "Gerak Lurus", "Jarak & Perpindahan")
        fn_timer(self, 3.3, 0)

        # ═══ SCENE 1: Animasi Jalan (target ~11.1s) ═══════════════
        NARRATION.append(("intro_jalan",
            "Bayangkan kamu berjalan dari rumah ke sekolah. "
            "Jalan yang kamu lewati bisa lurus, bisa berbelok. "
            "Nah, panjang total jalan yang kamu tempuh itu disebut jarak."))
        self.next_section("ANIMASI_JALAN")

        start = Dot(LEFT*4+DOWN, color=GREEN, radius=0.12)
        end = Dot(RIGHT*4+DOWN, color=RED, radius=0.12)
        s_lab = Text("Awal", font_size=22, color=GREEN).next_to(start, UP)
        e_lab = Text("Akhir", font_size=22, color=RED).next_to(end, UP)
        p1 = Line(LEFT*4, ORIGIN, color=WHITE, stroke_width=5).shift(DOWN)
        p2 = Line(ORIGIN, RIGHT*4, color=WHITE, stroke_width=5).shift(DOWN)

        self.play(Create(p1), Create(p2))
        self.play(FadeIn(start), FadeIn(end), Write(s_lab), Write(e_lab))

        dot = Dot(color=SENANG_ACCENT, radius=0.12)
        self.play(MoveAlongPath(dot, p1, rate_func=linear), run_time=2.5)
        self.play(MoveAlongPath(dot, p2, rate_func=linear), run_time=3.0)
        self.play(FadeOut(dot))
        fn_timer(self, 5.5 + 1.5 + 1.0, 1)  # ~6.5s base, adjust

        # ═══ SCENE 2: Jarak (target ~13.2s) ═══════════════════════
        NARRATION.append(("jarak",
            "Jarak adalah panjang seluruh lintasan yang ditempuh. "
            "Contoh: Budi berjalan 3 meter ke timur, lalu 4 meter ke barat. "
            "Jarak totalnya adalah 3 ditambah 4, sama dengan 7 meter."))
        self.next_section("JARAK")

        j_title = Text("JARAK", font_size=44, color=GREEN, weight=BOLD).to_edge(UP)
        self.play(Write(j_title))
        j_fmt = MathTex(r"3\text{ m}+4\text{ m}=7\text{ m}", font_size=44, color=GREEN)
        j_fmt.next_to(j_title, DOWN, buff=0.5)
        self.play(Write(j_fmt))
        self.play(p1.animate.set_stroke(GREEN, width=10),
                  p2.animate.set_stroke(GREEN, width=10))
        self.wait(1.0)
        self.play(FadeOut(j_title), FadeOut(j_fmt),
                  FadeOut(p1), FadeOut(p2),
                  FadeOut(start), FadeOut(end), FadeOut(s_lab), FadeOut(e_lab))
        fn_timer(self, 5.0, 2)  # ~5s base

        # ═══ SCENE 3: Perpindahan (target ~13.6s) ══════════════════
        NARRATION.append(("perpindahan",
            "Sekarang, perpindahan adalah perubahan posisi dari titik awal ke titik akhir. "
            "Budi mulai di sini, dan berakhir di sini. "
            "Perpindahannya hanya 1 meter ke barat. Perpindahan punya arah."))
        self.next_section("PERPINDAHAN")

        ps = Dot(LEFT*3, color=GREEN, radius=0.1)
        pe = Dot(RIGHT, color=RED, radius=0.1)
        psl = Text("Awal", font_size=20, color=GREEN).next_to(ps, DOWN)
        pel = Text("Akhir", font_size=20, color=RED).next_to(pe, DOWN)

        p_title = Text("PERPINDAHAN", font_size=44, color=RED, weight=BOLD).to_edge(UP)
        self.play(Write(p_title))
        self.play(FadeIn(ps), FadeIn(pe), Write(psl), Write(pel))

        arr = Arrow(LEFT*3, RIGHT, color=RED, stroke_width=8, buff=0.1)
        albl = MathTex(r"\Delta x=1\text{ m (ke barat)}", font_size=38, color=RED)
        albl.next_to(arr, UP, buff=0.3)
        self.play(Create(arr), run_time=1)
        self.play(Write(albl))
        self.wait(1.5)
        self.play(FadeOut(p_title), FadeOut(arr), FadeOut(albl),
                  FadeOut(ps), FadeOut(pe), FadeOut(psl), FadeOut(pel))
        fn_timer(self, 5.0, 3)

        # ═══ SCENE 4: Contoh Soal (target ~15.7s) ══════════════════
        NARRATION.append(("soal",
            "Coba lihat contoh ini: Seorang anak berlari dari titik A ke B sejauh 5 meter, "
            "lalu kembali lagi ke A. Jarak tempuhnya 5 ditambah 5 sama dengan 10 meter. "
            "Tapi perpindahannya? Nol, karena kembali ke titik awal."))
        self.next_section("CONTOH_SOAL")

        branded_title(self, "Contoh Soal")

        soal = Text("Anak berlari dari A ke B (5 m),\nlalu kembali ke A",
                    font_size=32, color=WHITE).move_to(UP*2.5)
        self.play(FadeIn(soal, shift=LEFT))

        da = Dot(LEFT*3, color=GREEN, radius=0.12)
        db = Dot(RIGHT*2, color=RED, radius=0.12)
        la = Text("A", font_size=28, color=GREEN).next_to(da, DOWN)
        lb = Text("B", font_size=28, color=RED).next_to(db, DOWN)
        line = Line(LEFT*3, RIGHT*2, color=WHITE, stroke_width=5)
        self.play(Create(line), FadeIn(da), FadeIn(db), Write(la), Write(lb))

        runner = Dot(color=SENANG_ACCENT, radius=0.14)
        self.play(MoveAlongPath(runner, Line(LEFT*3, RIGHT*2), rate_func=linear), run_time=1.5)
        self.play(MoveAlongPath(runner, Line(RIGHT*2, LEFT*3), rate_func=linear), run_time=1.5)
        self.play(FadeOut(runner))

        ans_card = Rectangle(width=10, height=2.5, fill_color=SENANG_DARK,
                             fill_opacity=0.8, stroke_color=SENANG_ACCENT).move_to(DOWN*1.5)
        ja = MathTex(r"\text{Jarak}=5+5=10\text{ m}", font_size=34, color=GREEN)
        pa = MathTex(r"\text{Perpindahan}=0\text{ m}", font_size=34, color=RED)
        ans = VGroup(ja, pa).arrange(DOWN, buff=0.3).move_to(ans_card.get_center())

        self.play(FadeIn(ans_card))
        self.play(Write(ja))
        self.wait(0.5)
        self.play(Write(pa))
        self.wait(1.5)
        self.play(FadeOut(soal), FadeOut(ans_card), FadeOut(ja), FadeOut(pa),
                  FadeOut(da), FadeOut(db), FadeOut(la), FadeOut(lb), FadeOut(line))
        fn_timer(self, 11.0, 4)

        # ═══ SCENE 5: Tabel (target ~13.6s) ═══════════════════════
        NARRATION.append(("tabel",
            "Ini dia perbedaan jarak dan perpindahan dalam tabel. "
            "Jarak itu skalar, selalu positif. Perpindahan itu vektor, "
            "bisa positif, negatif, atau nol. Paham?"))
        self.next_section("TABEL")

        tbl = branded_table(self,
            ["Aspek", "Jarak", "Perpindahan"],
            [["Definisi", "Panjang lintasan total", "Selisih posisi akhir-awal"],
             ["Jenis besaran", "Skalar", "Vektor"],
             ["Nilai", "Selalu positif", "Bisa +, -, atau 0"],
             ["Arah", "Tidak peduli arah", "Peduli arah"]],
            "Perbedaan Jarak dan Perpindahan")

        # ── Outro ────────────────────────────────────────────────
        self.next_section("CLOSING")
        self.play(FadeOut(tbl))
        branded_outro(self, "Paham kan bedanya Jarak dan Perpindahan?\nYuk lanjut belajar! 💪")
        self.wait(1)


# ═══════════════════════════════════════════════════════════════════
# TTS + Merge + SRT pipeline
# ═══════════════════════════════════════════════════════════════════
def generate_tts_individual(segments, output_dir):
    """Generate TTS per segment. Returns list of (path, duration_sec)."""
    os.makedirs(output_dir, exist_ok=True)
    results = []
    for i, (label, text) in enumerate(segments):
        if not text.strip():
            continue
        ap = os.path.join(output_dir, f"seg_{i:03d}_{label}.mp3")
        try:
            subprocess.run(
                ["edge-tts", "--voice", "id-ID-ArdiNeural",
                 "--text", text.strip(), "--write-media", ap],
                check=True, capture_output=True, timeout=60
            )
            # get duration
            r = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "csv=p=0", ap],
                capture_output=True, text=True, timeout=10
            )
            dur = float(r.stdout.strip())
            results.append((ap, dur))
        except Exception as e:
            print(f"  ⚠️ TTS {label} failed: {e}")
    return results


def generate_tts_internal(segments, output_dir):
    """Alias — used by pipeline caller."""
    return generate_tts_individual(segments, output_dir)


def make_srt(segments_with_dur, output_path):
    """Generate SRT from (path, dur, text) tuples."""
    lines = []
    nar_texts = {label: text for label, text in [
        ("title", "Halo! Hari ini kita belajar tentang Gerak Lurus. "
                  "Apa itu jarak? Apa itu perpindahan? Yuk kita pelajari bersama!"),
        ("intro_jalan", "Bayangkan kamu berjalan dari rumah ke sekolah. "
                        "Jalan yang kamu lewati bisa lurus, bisa berbelok. "
                        "Nah, panjang total jalan yang kamu tempuh itu disebut jarak."),
        ("jarak", "Jarak adalah panjang seluruh lintasan yang ditempuh. "
                  "Contoh: Budi berjalan 3 meter ke timur, lalu 4 meter ke barat. "
                  "Jarak totalnya adalah 3 ditambah 4, sama dengan 7 meter."),
        ("perpindahan", "Sekarang, perpindahan adalah perubahan posisi dari titik awal ke titik akhir. "
                        "Budi mulai di sini, dan berakhir di sini. "
                        "Perpindahannya hanya 1 meter ke barat. Perpindahan punya arah."),
        ("soal", "Coba lihat contoh ini: Seorang anak berlari dari titik A ke B sejauh 5 meter, "
                 "lalu kembali lagi ke A. Jarak tempuhnya 5 ditambah 5 sama dengan 10 meter. "
                 "Tapi perpindahannya? Nol, karena kembali ke titik awal."),
        ("tabel", "Ini dia perbedaan jarak dan perpindahan dalam tabel. "
                  "Jarak itu skalar, selalu positif. Perpindahan itu vektor, "
                  "bisa positif, negatif, atau nol. Paham?"),
    ]}

    def ts(sec):
        h, r = divmod(int(sec * 1000), 3600000)
        m, r = divmod(r, 60000)
        s, ms = divmod(r, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    cum = 0.0
    for i, (path, dur, text) in enumerate(segments_with_dur):
        label = os.path.basename(path).rsplit("_", 1)[1].replace(".mp3", "") if "_" in os.path.basename(path) else f"seg{i}"
        nar_text = nar_texts.get(label, text or "")
        if not nar_text:
            # try to match by finding label in path
            for key in nar_texts:
                if key in os.path.basename(path):
                    nar_text = nar_texts[key]
                    break
        start, end = cum, cum + dur
        cum = end
        lines.append(f"{i+1}")
        lines.append(f"{ts(start)} --> {ts(end)}")
        lines.append(nar_text)
        lines.append("")

    with open(output_path, "w") as f:
        f.write("\n".join(lines))
    return output_path


def make_bgm(output_dir, duration_sec):
    """Generate musical ambient BGM (piano chord pad) with given duration."""
    bgm_path = os.path.join(output_dir, "_bgm_ambient.mp3")
    # Piano chord C major (C4+E4+G4) with gentle attack+release, looped
    # Using tremolo + sine to simulate soft piano pad
    chord_dur = min(4.0, duration_sec)
    subprocess.run(
        ["ffmpeg", "-y",
         "-f", "lavfi", "-i",
         f"sine=frequency=261.63:duration={chord_dur}:samples_per_frame=1024,volume=0.15",   # C4
         "-f", "lavfi", "-i",
         f"sine=frequency=329.63:duration={chord_dur}:samples_per_frame=1024,volume=0.10",   # E4
         "-f", "lavfi", "-i",
         f"sine=frequency=392:duration={chord_dur}:samples_per_frame=1024,volume=0.07",      # G4
         "-f", "lavfi", "-i",
         f"sine=frequency=196:duration={chord_dur}:samples_per_frame=1024,volume=0.12",      # G3 (bass)
         "-f", "lavfi", "-i", "anoisesrc=d=30:c=pink:a=0.015",
         "-filter_complex",
         "[0][1][2][3]amix=inputs=4:duration=first,"
         "afade=t=in:d=0.5,afade=t=out:st=2.5:d=1.5,"
         "aloop=loop=-1:size=192000[chord];"
         "[4]atrim=end={dur},volume=0.015[noise];"
         "[chord][noise]amix=inputs=2:duration=first:weights=1 0.08"
         .format(dur=duration_sec),
         "-t", str(duration_sec), bgm_path],
        check=True, capture_output=True, timeout=60
    )
    return bgm_path


def merge_final(video_path, audio_list, bgm_path, output_path):
    """Merge video + narration audio + BGM into final video."""
    if not audio_list:
        print("  ⚠️ No audio, copying video only")
        os.system(f"cp '{video_path}' '{output_path}'")
        return output_path

    concat_audio = os.path.join(os.path.dirname(output_path), "_narasi.mp3")
    if len(audio_list) == 1:
        concat_audio = audio_list[0][0]
    else:
        lst = os.path.join(os.path.dirname(output_path), "_audio_list.txt")
        with open(lst, "w") as f:
            for ap, _ in audio_list:
                f.write(f"file '{os.path.abspath(ap)}'\n")
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", lst, "-c", "copy", concat_audio],
            check=True, capture_output=True, timeout=60
        )

    # Get total narration duration
    total_nar_dur = sum(d for _, d in audio_list)

    # Pad video + merge BGM
    # Get video duration
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", video_path],
        capture_output=True, text=True, timeout=10
    )
    video_dur = float(r.stdout.strip())
    pad = max(0, total_nar_dur - video_dur)

    if bgm_path and os.path.exists(bgm_path):
        filter_chain = (
            f"[0:v]tpad=stop_mode=clone:stop_duration={pad:.1f}[v];"
            f"[2:a]volume=0.8,aloop=loop=-1:size=1323000,atrim=end={total_nar_dur:.1f}[bgm];"
            f"[1:a][bgm]amix=inputs=2:duration=first:weights=1 0.6[a]"
        )
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-i", concat_audio, "-i", bgm_path,
             "-filter_complex", filter_chain,
             "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-preset", "fast",
             "-c:a", "aac", "-b:a", "128k",
             "-shortest", output_path],
            check=True, capture_output=True, timeout=300
        )
    else:
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-i", concat_audio,
             "-filter_complex", f"[0:v]tpad=stop_mode=clone:stop_duration={pad:.1f}[v]",
             "-map", "[v]", "-map", "1:a:0",
             "-c:v", "libx264", "-preset", "fast",
             "-c:a", "aac", "-b:a", "128k",
             "-shortest", output_path],
            check=True, capture_output=True, timeout=300
        )
    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SenangBelajar Manim Video")
    parser.add_argument("--preview", action="store_true", help="480p preview")
    parser.add_argument("--scene", default="GerakLurusJarakV2", help="Scene class")
    args = parser.parse_args()

    render_args = ["-pql"] if args.preview else ["-q", "m"]
    quality = "480p15" if args.preview else "720p30"
    script_name = os.path.splitext(os.path.basename(__file__))[0]
    output_dir = os.path.join(os.path.dirname(__file__),
                              "media/videos", script_name, quality)
    os.makedirs(output_dir, exist_ok=True)

    print(f"🎬 Step 1: Generate TTS from {len(NARRATION)} segments...")
    # Generate TTS first so we know durations BEFORE rendering
    audio_dir = os.path.join(output_dir, "audio_segments")
    audio_files = generate_tts_individual([
        ("title", "Halo! Hari ini kita belajar tentang Gerak Lurus. "
                   "Apa itu jarak? Apa itu perpindahan? Yuk kita pelajari bersama!"),
        ("intro_jalan", "Bayangkan kamu berjalan dari rumah ke sekolah. "
                        "Jalan yang kamu lewati bisa lurus, bisa berbelok. "
                        "Nah, panjang total jalan yang kamu tempuh itu disebut jarak."),
        ("jarak", "Jarak adalah panjang seluruh lintasan yang ditempuh. "
                  "Contoh: Budi berjalan 3 meter ke timur, lalu 4 meter ke barat. "
                  "Jarak totalnya adalah 3 ditambah 4, sama dengan 7 meter."),
        ("perpindahan", "Sekarang, perpindahan adalah perubahan posisi dari titik awal ke titik akhir. "
                        "Budi mulai di sini, dan berakhir di sini. "
                        "Perpindahannya hanya 1 meter ke barat. Perpindahan punya arah."),
        ("soal", "Coba lihat contoh ini: Seorang anak berlari dari titik A ke B sejauh 5 meter, "
                 "lalu kembali lagi ke A. Jarak tempuhnya 5 ditambah 5 sama dengan 10 meter. "
                 "Tapi perpindahannya? Nol, karena kembali ke titik awal."),
        ("tabel", "Ini dia perbedaan jarak dan perpindahan dalam tabel. "
                  "Jarak itu skalar, selalu positif. Perpindahan itu vektor, "
                  "bisa positif, negatif, atau nol. Paham?"),
    ], audio_dir)

    # Set SCENE_DURATIONS for per-scene timing (module level)
    sc = [d for _, d in audio_files]
    SCENE_DURATIONS[:] = sc  # modify in-place, no global needed
    total_nar_dur = sum(SCENE_DURATIONS)
    print(f"   TTS durations: {[f'{d:.1f}' for _,d in audio_files]}s total={total_nar_dur:.1f}s")

    # Generate BGM
    print(f"🎵 Step 2: Generate BGM ({total_nar_dur:.0f}s)...")
    bgm_path = make_bgm(output_dir, total_nar_dur)

    # Render video
    print(f"🎬 Step 3: Render {args.scene} ({quality})...")
    result = subprocess.run(
        ["/home/ubuntu/manim-env/bin/manim"] + render_args +
         [__file__, args.scene],
        capture_output=True, text=True,
        cwd=os.path.dirname(__file__), timeout=600,
    )
    if result.returncode != 0:
        print("❌ Render fail:", result.stderr[-800:])
        sys.exit(1)

    vidpath = os.path.join(output_dir, f"{args.scene}.mp4")
    if not os.path.exists(vidpath):
        print(f"❌ Not found: {vidpath}")
        sys.exit(1)
    print(f"   ✅ Video: {os.path.getsize(vidpath)//1024} KB")

    # Generate SRT
    print("📝 Step 4: Generate SRT...")
    srt_path = os.path.join(output_dir, f"{args.scene}.srt")
    # rebuild SRT from audio timestamps
    nar_with_text = []
    for i, (label, text) in enumerate([
        ("title", "Halo! Hari ini kita belajar tentang Gerak Lurus. "
                  "Apa itu jarak? Apa itu perpindahan? Yuk kita pelajari bersama!"),
        ("intro_jalan", "Bayangkan kamu berjalan dari rumah ke sekolah. "
                        "Jalan yang kamu lewati bisa lurus, bisa berbelok. "
                        "Nah, panjang total jalan yang kamu tempuh itu disebut jarak."),
        ("jarak", "Jarak adalah panjang seluruh lintasan yang ditempuh. "
                  "Contoh: Budi berjalan 3 meter ke timur, lalu 4 meter ke barat. "
                  "Jarak totalnya adalah 3 ditambah 4, sama dengan 7 meter."),
        ("perpindahan", "Sekarang, perpindahan adalah perubahan posisi dari titik awal ke titik akhir. "
                        "Budi mulai di sini, dan berakhir di sini. "
                        "Perpindahannya hanya 1 meter ke barat. Perpindahan punya arah."),
        ("soal", "Coba lihat contoh ini: Seorang anak berlari dari titik A ke B sejauh 5 meter, "
                 "lalu kembali lagi ke A. Jarak tempuhnya 5 ditambah 5 sama dengan 10 meter. "
                 "Tapi perpindahannya? Nol, karena kembali ke titik awal."),
        ("tabel", "Ini dia perbedaan jarak dan perpindahan dalam tabel. "
                  "Jarak itu skalar, selalu positif. Perpindahan itu vektor, "
                  "bisa positif, negatif, atau nol. Paham?"),
    ]):
        if i < len(audio_files):
            nar_with_text.append((audio_files[i][0], audio_files[i][1], text))

    make_srt([(p, d, t) for p, d, t in nar_with_text], srt_path)
    print(f"   ✅ SRT: {os.path.getsize(srt_path)//1024} KB ({srt_path})")

    # Merge final
    print("🎨 Step 5: Merge audio + BGM...")
    final = vidpath.replace(".mp4", "_final.mp4")
    merge_final(vidpath, audio_files, bgm_path, final)
    print(f"   ✅ Final: {os.path.getsize(final)//1024} KB ({final})")

    # Embed SRT into video
    final_with_sub = final.replace(".mp4", "_sub.mp4")
    subprocess.run(
        ["ffmpeg", "-y", "-i", final,
         "-i", srt_path,
         "-c:v", "copy", "-c:a", "copy",
         "-c:s", "mov_text",
         "-metadata:s:s:0", "language=ind",
         final_with_sub],
        capture_output=True, timeout=120
    )
    if os.path.exists(final_with_sub):
        print(f"   ✅ With subtitles: {os.path.getsize(final_with_sub)//1024} KB")
        final = final_with_sub

    print(f"\n✨ Done! Final: {final}")
