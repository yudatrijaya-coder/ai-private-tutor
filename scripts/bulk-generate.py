#!/usr/bin/env python3
"""
Bulk Video Generator — Generate all 29 mindmap + 21 motivasi videos

Usage: python3 scripts/bulk-generate.py [student_name]
  - With argument: only generate for that student
  - Without argument: generate for all students
"""

import asyncio, sys, random
sys.path.insert(0, '/home/ubuntu/ai-private-tutor/scripts')
from video_generator import generate_mindmap_video, generate_motivasi_video, STUDENT_THEME, THEME_POOLS

from pathlib import Path
PROJECT = Path.home() / "ai-private-tutor"

# ── Subject data for all students ──
SUBJECTS = {
    "Raihan": {
        "voice": "smp",
        "subjects": {
            "Fisika": ["Besaran & Pengukuran", "Gerak Lurus", "Gaya & Hukum Newton"],
            "Kimia": ["Zat & Wujudnya", "Reaksi Kimia Sederhana", "Unsur & Senyawa"],
            "Biologi": ["Sel & Jaringan", "Sistem Organ", "Keanekaragaman Hayati"],
            "Matematika": ["Bilangan & Operasi", "Aljabar", "Geometri"],
            "Bahasa Indonesia": ["Teks Deskripsi", "Teks Narasi", "Puisi"],
            "Bahasa Inggris": ["Greetings", "Daily Activities", "Descriptions"],
            "IPS": ["Ruang & Interaksi", "Kegiatan Ekonomi", "Perubahan Sosial"],
            "Informatika": ["Berpikir Komputasional", "Algoritma", "Dasar Pemrograman"],
            "Pendidikan Pancasila": ["Nilai Pancasila", "Hak & Kewajiban", "Demokrasi"],
            "Geografi": ["Peta & Pemetaan", "Atmosfer", "Hidrosfer"],
        }
    },
    "SHOFI": {
        "voice": "sma",
        "subjects": {
            "Fisika": ["Kinematika", "Dinamika", "Usaha & Energi"],
            "Kimia": ["Kesetimbangan Kimia", "Larutan Elektrolit & Ion", "Reaksi Redoks & Elektrokimia"],
            "Biologi": ["Sel & Jaringan", "Sistem Pencernaan", "Evolusi"],
            "Matematika": ["Fungsi & Limit", "Turunan", "Integral"],
            "Bahasa Indonesia": ["Teks Argumentasi", "Teks Eksposisi", "Karya Ilmiah"],
            "Bahasa Inggris": ["Arguments", "News Items", "Narrative"],
            "Ekonomi": ["Permintaan & Penawaran", "Pasar", "Kebijakan Moneter"],
            "Sosiologi": ["Interaksi Sosial", "Stratifikasi", "Perubahan Sosial"],
            "Informatika": ["Berpikir Komputasional", "Struktur Data", "Jaringan"],
            "Matematika Penalaran": ["Logika", "Induksi", "Kombinatorika"],
            "Pendidikan Pancasila": ["Hak Asasi", "Konstitusi", "NKRI"],
            "PJOK": ["Kebugaran", "Teknik Dasar", "Pola Hidup Sehat"],
            "Bahasa Mandarin": ["Hanzi Dasar", "Tata Bahasa", "Percakapan"],
            "Matematika Tingkat Lanjut": ["Fungsi & Limit", "Turunan", "Integral"],
            "Bahasa Inggris Tingkat Lanjut": ["Academic Writing", "Critical Reading", "Presentation Skills"],
        }
    },
    "Syifa": {
        "voice": "sd",
        "subjects": {
            "Matematika": ["Bilangan Cacah", "Operasi Hitung", "Bangun Datar"],
            "Bahasa Indonesia": ["Membaca", "Menulis", "Bercerita"],
            "IPAS": ["Makhluk Hidup", "Benda & Sifatnya", "Energi"],
            "Pendidikan Pancasila": ["Sila Pancasila", "Lambang Negara", "Gotong Royong"],
            "Bahasa Inggris": ["Alphabet", "Numbers", "Colors"],
            "PJOK": ["Gerak Dasar", "Permainan", "Olahraga"],
        }
    }
}

async def generate_all(student_name: str | None = None):
    students = [student_name] if student_name else list(SUBJECTS.keys())
    
    for s_name in students:
        if s_name not in SUBJECTS:
            print(f"\n❌ Student '{s_name}' not found in data")
            continue
        
        info = SUBJECTS[s_name]
        print(f"\n{'='*60}")
        print(f"🎯 {s_name} ({info['voice']}) — Theme: {STUDENT_THEME.get(s_name, '?')}")
        pool = THEME_POOLS.get(STUDENT_THEME.get(s_name, ""), [])
        print(f"   Pool: {', '.join(p.name for p in pool)}")
        print(f"{'='*60}")
        
        # Generate mindmap videos
        for subject, topics in info["subjects"].items():
            # Truncate to max 3 topics for display
            display_topics = topics[:3]
            
            # Seed with subject name for consistency
            random.seed(subject + s_name)
            
            path = await generate_mindmap_video(
                s_name, subject, display_topics,
                info["voice"]
            )
            if path:
                size = path.stat().st_size / 1_000_000
                print(f"  ✅ {path.name} ({size:.1f}MB)")
            # Reset seed after each
            random.seed()
        
        # Generate 7 motivasi videos
        print(f"\n   💪 Motivasi videos...")
        for i in range(7):
            random.seed(f"motivasi_{s_name}_{i}")
            path = await generate_motivasi_video(s_name, info["voice"], i)
            if path:
                size = path.stat().st_size / 1_000_000
                print(f"  ✅ {path.name} ({size:.1f}MB)")
            random.seed()
    
    print(f"\n{'='*60}")
    print("✅ BULK GENERATION COMPLETE!")
    print(f"{'='*60}")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(generate_all(target))
