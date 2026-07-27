#!/usr/bin/env python3
"""
SenangBelajar — Generic Video Scene
====================================
Renders educational content from JSON data file.
Called by video_pipeline.py with SCENE_DATA env var pointing to JSON.

Usage:
  SCENE_DATA=/path/to/scene.json /home/ubuntu/manim-env/bin/python scripts/generic_scene.py -q 720p30
"""

import os, sys, json, re
from manim import *

# ── Read scene data from env ──
DATA_PATH = os.environ.get("SCENE_DATA", "")
scene_data = {}
if DATA_PATH and os.path.exists(DATA_PATH):
    with open(DATA_PATH, "r") as f:
        scene_data = json.load(f)
else:
    # Fallback: check next to script
    fallback = os.path.join(os.path.dirname(__file__), "scene_data.json")
    if os.path.exists(fallback):
        with open(fallback) as f:
            scene_data = json.load(f)

SUBJECT = scene_data.get("subject", "Belajar")
TOPIC = scene_data.get("topic", "Topik")
SLIDES = scene_data.get("slides", [])  # list of {"heading": "...", "bullets": [...], "body": "..."}

# ── Branding ──
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
LOGO_FILE = os.path.join(ASSETS_DIR, "logo_asli.jpg")
BG_IMAGE = os.path.join(ASSETS_DIR, "bg_gradient.png")

SENANG_BLUE = "#1a73e8"
SENANG_DARK = "#0d47a1"
SENANG_ACCENT = "#ffd54f"


class GenericLesson(Scene):
    def construct(self):
        self.camera.background_color = BLACK
        self.add(self._gradient_bg())
        self.add(self._logo())
        self.add(self._watermark())

        if not SLIDES:
            title = Text("Konten tidak tersedia", font_size=36, color=YELLOW)
            self.play(Write(title))
            self.wait(2)
            return

        for idx, slide in enumerate(SLIDES):
            self.render_one_slide(idx, slide)
            self.wait(0.5)

    def _gradient_bg(self):
        if os.path.exists(BG_IMAGE):
            img = ImageMobject(BG_IMAGE)
            img.scale_to_fit_height(8)
            img.scale_to_fit_width(14)
            return img
        return Rectangle(width=14, height=8, fill_color="#0a1628", fill_opacity=1,
                         stroke_width=0)

    def _logo(self):
        if os.path.exists(LOGO_FILE):
            logo = ImageMobject(LOGO_FILE)
            logo.scale_to_fit_height(0.65)
            logo.set_opacity(0.35)
            logo.to_corner(DL, buff=0.25)
            return logo
        return Text("SB", font_size=24, opacity=0.3).to_corner(DL, buff=0.3)

    def _watermark(self):
        wm = Text("senangbelajar.web.id", font_size=22,
                  color=WHITE, opacity=0.45, font="Lato")
        wm.to_corner(DR, buff=0.3)
        return wm

    def _subject_header(self, subj, top):
        s = Text(subj, font_size=20, opacity=0.8, color=SENANG_BLUE, weight=BOLD)
        s.to_corner(UL, buff=0.3)
        t = Text(top, font_size=15, opacity=0.55, color=GREY_B)
        t.next_to(s, RIGHT, buff=0.4)
        t.align_to(s, DOWN)
        return VGroup(s, t)

    def _styled_text(self, text, font_size=28, color=WHITE, weight=NORMAL):
        """Render a line of text, handling bold markers."""
        if "**" in text:
            parts = text.split("**")
            mobs = []
            for pi, p in enumerate(parts):
                if p:
                    mobs.append(Text(p, font_size=font_size,
                                     color=color,
                                     weight=BOLD if pi % 2 == 1 else weight))
            if mobs:
                g = VGroup(*mobs).arrange(RIGHT, buff=0.08, aligned_edge=DOWN)
                return g
        return Text(text, font_size=font_size, color=color, weight=weight)

    def render_one_slide(self, idx, slide):
        """Render a single slide (heading + bullets + body)."""
        elements = VGroup()
        y_pos = 3.0
        max_lines = 7

        # Subject header
        header = self._subject_header(SUBJECT, TOPIC)
        elements.add(header)

        # Heading
        heading = slide.get("heading", "")
        if heading:
            h = self._styled_text(heading, font_size=36, color=SENANG_BLUE, weight=BOLD)
            h.move_to(UP * 3.2)
            elements.add(h)
            y_pos = 2.2

        # Bullets
        bullets = slide.get("bullets", [])
        for bi, b in enumerate(bullets[:max_lines - 1]):
            dot = Text("•", font_size=24, color=SENANG_ACCENT)
            txt = self._styled_text(b, font_size=24, color=WHITE)
            row = VGroup(dot, txt).arrange(RIGHT, buff=0.15, aligned_edge=DOWN)
            row.move_to(UP * y_pos).align_to(LEFT * 4.5, LEFT)
            elements.add(row)
            y_pos -= 0.75

        # Body text (if no bullets)
        body = slide.get("body", "")
        if not bullets and body:
            b = self._styled_text(body, font_size=26, color=WHITE)
            b.move_to(UP * y_pos)
            elements.add(b)

        self.play(FadeIn(elements, shift=UP * 0.3), run_time=0.6)
        self.wait(3.0 + 0.5 * len(bullets))
        self.play(FadeOut(elements, shift=DOWN * 0.3), run_time=0.4)
