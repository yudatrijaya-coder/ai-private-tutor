#!/usr/bin/env python3.12
"""Add SHOFI001's SMA_2 PAI materials from the official Moodle/Kemenag XI book.
Idempotent. Stores only source-grounded material and creates no quizzes itself.
"""
import json, re, subprocess, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'data/sibi/raw_content/SMA_2/Pendidikan Agama Islam.json'
SUBJECT = 'Pendidikan Agama Islam'
SID = 'e30b6559-1d33-4aa5-a39a-22102f29894d'
CID = '98f0274e-4e39-45f5-9c79-3632c5717b27'
SOURCE = 'https://moodle.kumbang.sch.id/course/view.php?id=4584'


def sql(s: str) -> str:
    return s.replace("'", "''")


def main() -> None:
    data = json.loads(RAW.read_text())
    expected_titles = [
        'QS Āli ‘Imrān/3: 190-191 dan Hadis tentang Pentingnya Berpikir Kritis',
        'Bukti Beriman: Memenuhi Janji, Mensyukuri Nikmat, Memelihara Lisan, dan Menutup Aib Orang Lain',
        'Manfaat Menghindari Penyakit Sosial: Perundungan, Perkelahian, dan Perjudian',
        'Ketentuan Khotbah, Tablig, dan Dakwah',
        'Tokoh Ulama dalam Perkembangan Islam di Indonesia',
        'Semangat Mendalami Ilmu Pengetahuan dan Teknologi',
        'Menguatkan Iman dengan Menjaga Kehormatan, Ikhlas, Malu, dan Zuhud',
        'Katakan Tidak untuk Minuman Keras dan Narkoba',
        'Hidup Berkah dengan Ekonomi Islam',
        'Peradaban Islam pada Masa Modern',
    ]
    chapters = [c for c in data['chapters'] if re.fullmatch(r'BAB\s+\d+', c['title'].strip())]
    if len(chapters) != len(expected_titles):
        raise SystemExit(f'Expected 10 numbered PAI chapters, found {len(chapters)}')
    for index, (ch, title) in enumerate(zip(chapters, expected_titles), 1):
        source_text = ch['text'].strip()
        metadata = json.dumps({
            'sourceType': 'moodle', 'sourceUrl': SOURCE,
            'sourceFile': 'Kls XI_compressed.pdf',
            'sourceCourseId': 4584, 'sourcePages': f"{ch['start_page']}-{ch['end_page']}",
            'sourceSubject': SUBJECT,
        }, ensure_ascii=False)
        q = f'''INSERT INTO "Material" (id, "curriculumId", topic, "subTopic", subject, "gradeLevel", "weekOrder", priority, status, "rawContent", "sourceUrls", metadata, "createdAt", "updatedAt")
SELECT '{uuid.uuid4()}', '{CID}', '{sql(title)}', '{sql(title)}', '{SUBJECT}', 'SMA_2', {index}, 8, 'RAW', '{sql(source_text)}', '["{SOURCE}"]'::jsonb, '{sql(metadata)}'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Material" WHERE "curriculumId"='{CID}' AND subject='{SUBJECT}' AND topic='{sql(title)}' AND "subTopic"='{sql(title)}');'''
        res = subprocess.run(['psql','-U','tutor','-d','ai_private_tutor','-h','localhost','-c',q], capture_output=True, text=True, env={'PGPASSWORD':'tutor123'})
        if res.returncode:
            raise SystemExit(res.stderr)
        print(f'{index:02d}: {title}: {res.stdout.strip()}')

if __name__ == '__main__':
    main()
