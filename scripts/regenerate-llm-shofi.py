#!/usr/bin/env python3.12
"""
Regenerate LLM slide & mindmap for 33 SHOFI materials that have empty
metadata->'slide' and/or metadata->'mindmap'.

Uses OpenAI SDK → local 9Router LLM. Writes to metadata->'slide' and
metadata->'mindmap' (NOT slide_sibi/mindmap_sibi = SIBI field, untouched).
"""

import json, re, subprocess, time
import httpx

# Curriculum ID for SHOFI001, SMA_2
CURRICULUM_ID = "98f0274e-4e39-45f5-9c79-3632c5717b27"

# 9Router LLM endpoint
LLM_BASE_URL = "http://localhost:20128/v1/chat/completions"
LLM_API_KEY = "sk-9router"
LLM_MODEL = "hermes"

# The 33 target materials (id | subject | topic | subTopic)
TARGETS = [
    ("076960f9-df94-4748-be81-51fc22e83351", "Bahasa Indonesia", "Drama", "Pementasan Drama"),
    ("000d3a95-2c9c-4bee-af7e-5d2e11e64a2f", "Bahasa Indonesia", "Karya Ilmiah", "Penulisan Karya Ilmiah"),
    ("fbb1b6c2-fe7a-4b12-b7cd-03585c257a63", "Biologi", "Jaringan", "Jaringan Hewan"),
    ("eca882ea-621e-4987-aac7-3f4d7b2b83ba", "Biologi", "Jaringan", "Jaringan Tumbuhan"),
    ("8c7cb264-3070-424a-8ae9-1eac022f3bc8", "Biologi", "Sel", "Organel Sel"),
    ("5eab08f9-405f-41f9-9a17-a5eec0e8c63f", "Biologi", "Sel", "Struktur dan Fungsi Sel"),
    ("812add7c-e719-4f48-b9d2-0e4af1ae593f", "Biologi", "Sistem Gerak", "Mekanisme Gerak"),
    ("16f6ed5a-468e-43d5-b93b-6c54862673e1", "Biologi", "Sistem Gerak", "Tulang dan Otot"),
    ("7fba66b8-037d-434c-9ad8-685faa60f9e3", "Biologi", "Sistem Pencernaan", "Enzim dan Nutrisi"),
    ("15c0fb51-1d6a-4394-9921-23977b1e9d93", "Biologi", "Sistem Pencernaan", "Organ Pencernaan"),
    ("3ad92178-a78b-4142-b7e1-a0c5fb10e1cf", "Biologi", "Sistem Pernapasan", "Mekanisme Pernapasan"),
    ("f94232cf-ad95-4ae0-bd30-dce70c2262d0", "Biologi", "Sistem Pernapasan", "Organ Pernapasan"),
    ("8c591d02-eb04-4313-b058-4443fabed8b6", "Biologi", "Sistem Sirkulasi", "Golongan Darah"),
    ("c8088bad-aad9-4f15-b783-3b6456bee240", "Biologi", "Sistem Sirkulasi", "Jantung dan Pembuluh Darah"),
    ("46953540-36aa-4e5a-b642-f8c8f3ff8160", "Kimia", "Asam Basa", "pH dan Indikator"),
    ("888d2dd1-63bf-4659-a355-d6d7f853a2ca", "Kimia", "Asam Basa", "Teori Asam Basa"),
    ("6d2d1fd3-a86a-45b5-b40f-95968c81b5ee", "Kimia", "Ikatan Kimia", "Ikatan Ion dan Kovalen"),
    ("0708790d-6386-4313-9a97-7f005d5d7f11", "Kimia", "Ikatan Kimia", "Ikatan Logam dan Antarmolekul"),
    ("157877e4-680a-43b5-a208-ba769a125d05", "Kimia", "Larutan", "Konsentrasi Larutan"),
    ("67f25808-6384-4b55-a0ad-5ba3388bc85c", "Kimia", "Larutan", "Larutan Elektrolit"),
    ("3bc6d270-e48a-4b38-88cb-f5b6a5eae760", "Kimia", "Stoikiometri", "Konsep Mol"),
    ("eea5f3cd-dc6e-40b8-b553-771702358e1c", "Kimia", "Stoikiometri", "Rumus Kimia dan Persamaan"),
    ("7ed4b189-7568-42f6-9285-93e63a671149", "Kimia", "Struktur Atom", "Konfigurasi Elektron"),
    ("89939890-ee97-470e-b3ba-f9e72d5f185b", "Kimia", "Struktur Atom", "Model Atom"),
    ("c23f2075-d31a-4f11-8ed1-2a3939df9feb", "Kimia", "Termokimia", "Entalpi dan Perubahan"),
    ("6b6c9052-1289-4906-8842-549bc803113f", "Kimia", "Termokimia", "Hukum Hess"),
    ("dfa55700-d157-4fe8-ad55-cc88c45b9156", "Matematika Penalaran", "Logika Matematika", "Penarikan Kesimpulan"),
    ("06d8a6d3-dd05-4c89-a6f4-aeda383c5a07", "Matematika Penalaran", "Logika Matematika", "Pernyataan dan Negasi"),
    ("8ef9fd92-5966-4285-82ea-718c2411bfff", "Matematika Tingkat Lanjut", "Matriks", "Invers Matriks"),
    ("a4d8c4c9-9122-4cee-a4f9-a6f9093707fb", "Matematika Tingkat Lanjut", "Matriks", "Operasi Matriks"),
    ("aaf8d6cb-7377-429a-b0b6-2b7e4d8f5f6f", "Matematika Tingkat Lanjut", "Vektor", "Perkalian Titik dan Silang"),
    ("724ed75b-7d0e-41bb-b25e-9e4124c27204", "Matematika Tingkat Lanjut", "Vektor", "Vektor di R2 dan R3"),
    ("c210d45a-b30b-4626-884f-94ac81c39b7a", "Sejarah", "Pergerakan Nasional", "Budi Utomo dan Sumpah Pemuda"),
]


def get_has_field(material_id, field):
    """Check if metadata->'field' is not null for a material."""
    sql = f"SELECT (metadata->>'{field}') IS NOT NULL FROM \"Material\" WHERE id = '{material_id}';"
    r = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql],
        capture_output=True, text=True,
    )
    return r.stdout.strip() == "t"


def call_llm(system_prompt, user_prompt):
    """Call 9Router LLM via raw HTTP. Parses hybrid JSON+SSE response."""
    attempt = 0
    while True:
        attempt += 1
        try:
            with httpx.Client(timeout=120.0) as client:
                resp = client.post(
                    LLM_BASE_URL,
                    headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": LLM_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.1,
                        "max_tokens": 4000,
                        "stream": False,
                    },
                )
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("retry-after", 60))
                    print(f"      ⚠️ Rate limited (429). Waiting {retry_after+5}s...")
                    time.sleep(retry_after + 5)
                    continue
                resp.raise_for_status()
                
                content_parts = []
                for line in resp.text.split("\n"):
                    line = line.strip()
                    if not line: continue
                    if line.startswith("data: "):
                        if line == "data: [DONE]": continue
                        try:
                            chunk = json.loads(line[6:])
                            choices = chunk.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                c = delta.get("content")
                                if c: content_parts.append(c)
                        except: pass
                    else:
                        try:
                            chunk = json.loads(line)
                            choices = chunk.get("choices", [])
                            if choices:
                                c = choices[0].get("message", {}).get("content")
                                if c: content_parts.append(c)
                        except: pass
                
                content = "".join(content_parts)
                if not content:
                    raise ValueError("Empty content from LLM")
                return content.strip()
        except Exception as e:
            print(f"      ⚠️ Attempt {attempt} failed: {e}")
            time.sleep(5)


def strip_code_fences(text):
    """Remove ```markdown, ```json, ``` etc. fences."""
    return re.sub(r'```[a-z]*\n?|```', '', text).strip()


def parse_outline_to_mindmap(text, main_label):
    """Convert indented dash-outline → JSON mindmap array."""
    lines = text.strip().split("\n")
    root = {"id": "0", "label": main_label, "children": []}
    current_parents = {0: root}
    node_counter = 1

    for line in lines:
        if not line.strip():
            continue
        stripped = line.rstrip("\n")
        leading_chars = stripped.lstrip(" ")
        indent_level = len(stripped) - len(leading_chars)
        # Map indent depth → hierarchy level
        if indent_level >= 6:
            level = 3
        elif indent_level >= 4:
            level = 2
        elif indent_level >= 2:
            level = 1
        else:
            level = 0
        label = leading_chars.lstrip("-*\t ").strip()
        if not label:
            continue
        if level > 0 and level not in current_parents:
            level = 0
        if level not in current_parents:
            current_parents[level] = root
        parent = current_parents[level]
        new_node = {"id": str(node_counter), "label": label, "children": []}
        node_counter += 1
        if "children" not in parent:
            parent["children"] = []
        parent["children"].append(new_node)
        current_parents[level + 1] = new_node

    # Fallback: if no children parsed, try flat list
    if len(root["children"]) == 0:
        for line in lines:
            label = line.strip().lstrip("-*\t ").strip()
            if label and len(label) > 3:
                root["children"].append({"id": str(node_counter), "label": label, "children": []})
                node_counter += 1

    return [root]


def update_field(material_id, field, value):
    """Update metadata->'field' for a material by ID using psql."""
    val_str = json.dumps(value).replace("'", "''")
    sql = f"""UPDATE "Material"
              SET metadata = jsonb_set(COALESCE(metadata, '{{}}'::jsonb), '{{{
    field}}}', '{val_str}'::jsonb, true),
                  "updatedAt" = NOW()
              WHERE id = '{material_id}';"""
    r = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(f"      ❌ DB update failed for {field}: {r.stderr}")
        return False
    print(f"    ✅ {field} saved")
    return True


def main():
    print(f"🎯 Total target materials: {len(TARGETS)}")
    print(f"📋 Curriculum: {CURRICULUM_ID}")
    print("─" * 60)

    for i, (mat_id, subject, topic, subtopic) in enumerate(TARGETS, 1):
        label = f"{subject} → {topic} → {subtopic}"
        print(f"\n[{i}/{len(TARGETS)}] {label}")
        print(f"    ID: {mat_id}")

        # Skip if both slide and mindmap already exist
        has_slide = get_has_field(mat_id, "slide")
        has_mindmap = get_has_field(mat_id, "mindmap")
        if has_slide and has_mindmap:
            print("    ⏭️ Slide + mindmap already exist, skipping")
            continue

        # ─── Generate Slide ───────────────────────────────────────
        if has_slide:
            print("  ⏭️ Slide already exists, skipping")
        else:
            print("  🔄 Generating Slide (LLM)...")
            try:
                sp_slide = (
                    "You are an expert SMA/MA teacher creating educational slides in Indonesian. "
                    "Generate 3-5 markdown slides. Use headings, bullet points, clear explanations, "
                    "definitions, and examples relevant to SMA grade 11. Return ONLY slide markdown."
                )
                up_slide = (
                    f"Buat 3-5 slide markdown untuk materi \"{topic} - {subtopic}\" "
                    f"mata pelajaran {subject} SMA kelas 11. Gunakan bahasa Indonesia. "
                    f"Sertakan definisi, penjelasan, dan contoh."
                )
                slide_md = call_llm(sp_slide, up_slide)
                if slide_md:
                    slide_md = strip_code_fences(slide_md)
                    update_field(mat_id, "slide", slide_md)
                else:
                    print("    ⚠️ Slide returned empty, skipping")
            except Exception as e:
                print(f"    ❌ Slide generation failed: {e}")
            time.sleep(10)

        # ─── Generate Mindmap ─────────────────────────────────────
        if has_mindmap:
            print("  ⏭️ Mindmap already exists, skipping")
        else:
            print("  🔄 Generating Mindmap (LLM)...")
            try:
                sp_mm = (
                    "You create hierarchical mindmap outlines using indented dashes. "
                    "Use 2 spaces per indent level. Start each line with a single dash. "
                    "ONLY return the outline, no explanations."
                )
                up_mm = (
                    f"Buat mindmap outline untuk materi \"{topic} - {subtopic}\" "
                    f"{subject} SMA kelas 11. Gunakan bahasa Indonesia."
                )
                mm_txt = call_llm(sp_mm, up_mm)
                if mm_txt:
                    mm_txt = strip_code_fences(mm_txt)
                    mm_data = parse_outline_to_mindmap(mm_txt, subtopic)
                    update_field(mat_id, "mindmap", mm_data)
                else:
                    print("    ⚠️ Mindmap returned empty, skipping")
            except Exception as e:
                print(f"    ❌ Mindmap generation failed: {e}")
            time.sleep(10)

        print(f"  💤 Cooldown 10s before next material...")
        time.sleep(10)

    print("\n" + "=" * 60)
    print("✅ DONE — All 33 materials processed.")
    print("=" * 60)


if __name__ == "__main__":
    main()
