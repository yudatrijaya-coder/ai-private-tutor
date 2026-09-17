#!/usr/bin/env python3.12
"""
Build a manifest for the 42 prosem sessions reported MISSING by
`scripts/prosem-coverage.ts` (audit-reports/prosem-coverage.json).

Why this exists
---------------
The coverage audit answers "is this prosem session covered by a Material row?".
For the sessions it answers MISSING we need three more facts before content can
be generated:

  1. which curriculum + student the row belongs to (the audit carries only the
     short student code, not the UUIDs),
  2. what `topic` the new Material should carry, so the lesson joins the right
     chapter instead of inventing a top-level topic,
  3. which SIBI text grounds the session.

Point 3 is the honest one. Some sessions describe material the class-VII or
class-XI book does not contain; those rows are marked `source_kind: "none"`
instead of being quietly attributed to an unrelated chapter.

Chapter granularity differs per book, which is why the unit of work here is a
*bab group*, not a chapter:

  IPA (VII)          115 chunks of 2-5k, every chunk titled "Bab V ..."
  Informatika (VII)  119 chunks, only the last carries the full bab text
  Bahasa Indonesia   130 chunks per bab
  Matematika TL (XI) one chapter per bab (63k-94k)
  IPS (VII)          ONE chapter titled "Lainnya" holding the whole 357k book

Selecting a single chunk therefore yields 2k of text for one book and 357k for
another. The script groups chunks into chapters by cleaned title, picks the
chapter, then cuts a keyword-aligned window out of it.

Output: audit-reports/sibi-gap-manifest.json  (read-only; writes no DB)
"""

import json
import math
import re
import subprocess
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
AUDIT = BASE / "audit-reports" / "prosem-coverage.json"
OUT = BASE / "audit-reports" / "sibi-gap-manifest.json"

EXCERPT_BUDGET = 6000

# prosem subject -> (sibi matched file stem, curriculum subject)
# SMP stores the specialist prosem subjects under the integrated IPA/IPS rows.
SMP_SUBJECT_MAP = {
    "Biologi": ("IPA", "IPA"),
    "Fisika": ("IPA", "IPA"),
    "Kimia": ("IPA", "IPA"),
    "Sejarah": ("IPS", "IPS"),
    "Geografi": ("IPS", "IPS"),
    "Ekonomi": ("IPS", "IPS"),
    "Sosiologi": ("IPS", "IPS"),
    "Informatika": ("Informatika", "Informatika"),
    "Bahasa Indonesia": ("Bahasa Indonesia", "Bahasa Indonesia"),
}
SMA_SUBJECT_MAP = {
    "Biologi": ("Biologi", "Biologi"),
    "Bahasa Indonesia": ("Bahasa Indonesia", "Bahasa Indonesia"),
    "Matematika Tingkat Lanjut": ("Matematika Tingkat Lanjut", "Matematika Tingkat Lanjut"),
    "Fisika": ("Fisika", "Fisika"),
    "Kimia": ("Kimia", "Kimia"),
    "Sejarah": ("Sejarah", "Sejarah"),
}

STOPWORDS = {
    "dan", "atau", "yang", "untuk", "pada", "dengan", "dari", "di", "ke", "the",
    "a", "an", "serta", "dalam", "adalah", "ini", "itu", "sebagai", "secara",
    "oleh", "agar", "bisa", "akan", "tidak", "juga", "para", "suatu",
    "berbagai", "macam", "jenis", "cara", "hal", "lain", "nya",
}

# ---------------------------------------------------------------- concept hints
# Some sessions legitimately share no word with the chapter that teaches them, so
# no amount of token scoring will route them: "Aturan Sinus" is taught inside
# "Fungsi Trigonometri", "Pengenalan perangkat lunak" inside "Perkakas Teknologi
# Informasi dan Komunikasi", "Hubungan antar tulang" inside "Mobilitas pada
# Manusia", "Besaran baku dan besaran tak baku" inside "Hakikat Ilmu Sains dan
# Metode Ilmiah". Free ranking on the live books produced measurable nonsense
# (Polinomial sessions routed into "Fungsi dan Pemodelannya" because the label
# also contains "Fungsi"; "Tata Nama Ganda" routed into "Bumi dan Tata Surya"
# because both contain "tata"). Each entry below is checkable by eye against the
# book's table of contents.
#
# (session regex, words that must occur in the chapter title)
HINT_CHAPTERS = [
    (r"sinus|cosinus|trigonometri|sudut|radian", ["trigonometri"]),
    (r"polinomial|suku banyak|teorema sisa|teorema faktor|pembagian sintetik|akar-akar",
     ["polinomial"]),
    (r"rasional|irasional|nilai mutlak|tangga|piecewise|pemodelan|asimtot",
     ["pemodelan"]),
    (r"matriks|determinan", ["matriks"]),
    (r"vektor|skalar", ["vektor"]),
    (r"dilatasi|refleksi|rotasi|translasi|transformasi", ["transformasi"]),
    (r"tulang|otot|sendi|lokomosi|lokomotor|sinergis|antagonis|osteon|mobilitas|miopati|skoliosis|rakitis|osteoporosis",
     ["mobilitas"]),
    (r"perangkat lunak|perangkat keras|antarmuka|antar muka|surel|surat elektronik|presentasi|folder|berkas|pencarian inormasi|pencarian informasi|perkakas|aplikasi perkantoran|pengolah kata|pengolah angka",
     ["perkakas"]),
    (r"besaran|pengukuran|satuan baku|satuan tidak baku|massa jenis",
     ["hakikat ilmu sains"]),
    (r"klasifikasi|klasiikasi|takson|tata nama ganda|nama ilmiah|kunci determinasi|determinasi|lima kerajaan|monera|protista|ungi|jamur|binomial",
     ["karakteristik dan klasiikasi"]),
    (r"ekosistem|ekologi|biotik|abiotik|rantai makanan|jaring-jaring makanan|pencemaran|pelestarian|populasi|komunitas|simbiosis",
     ["ekologi"]),
    (r"tata surya|bumi|gerhana|planet|rotasi bumi|revolusi bumi|bulan|matahari|lempeng|gunung berapi|gempa",
     ["bumi dan tata surya"]),
    (r"zat|wujud|perubahan inis|perubahan fisik|suhu|kalor|pemuaian|penguapan|kondensasi|membeku|menguap",
     ["zat dan perubahannya"]),
    (r"gerak|gaya|hukum newton|kecepatan|percepatan|pesawat sederhana|tekanan|energi kinetik",
     ["gerak dan gaya"]),
    (r"peta|atlas|letak astronomis|iklim|cuaca|interaksi sosial|sosialisasi|lembaga sosial|kebutuhan|kelangkaan|praaksara|hindu buddha|islam|kolonial|proklamasi",
     ["lainnya"]),
]

# Chapters that exist in the PDF but carry no teaching content: cover, preface,
# table of contents (title is dotted leaders), bibliography, index, answer key,
# publisher imprint.
CHROME_TITLE = re.compile(
    r"pendahuluan|kementerian|\.{4,}|daftar isi|glosarium|indeks|kunci jawaban|"
    r"^bab\s*[ivxlcdm\d]*\s*$|profil|prakata|ucapan terima kasih|"
    r"sma/ma/smk|kelas\s*(?:[ivxlcdm]+|\d+)\s*$|isbn|hak cipta|cetakan|"
    r"repositori|perpusnas",
    re.IGNORECASE,
)

BAB_PREFIX = re.compile(r"^\s*bab\s*[ivxlcdm\d]+\s*[|:\-—]?\s*", re.IGNORECASE)


def norm_text(text: str) -> str:
    """Lowercased, ligature-folded haystack for token containment tests."""
    return unicodedata.normalize("NFKD", (text or "").lower()).replace("f", "")


def tokens(text: str) -> set[str]:
    """Significant lowercase words (>=4 chars, no suffix noise).

    `f` is stripped from every token because the SIBI PDFs lost their `fi`
    ligature in extraction: the books read "Klasiikasi", "identiikasi",
    "spesiikasi" where the prosem writes "Klasifikasi", "identifikasi",
    "spesifikasi". Dropping `f` from both sides makes those compare equal
    ("klasifikasi" -> "klasiikasi") without loosening anything else.
    """
    words = re.findall(r"[a-z]{4,}", norm_text(text))
    out = set()
    for w in words:
        if w in STOPWORDS:
            continue
        for suf in ("annya", "nya", "kan", "an", "i"):
            if len(w) > len(suf) + 3 and w.endswith(suf):
                w = w[: -len(suf)]
                break
        if len(w) >= 4:
            out.add(w)
    return out


def clean_title(title: str) -> str:
    """Chapter title as a usable Material.topic."""
    t = re.sub(r"\.{4,}.*$", "", title or "")  # drop TOC dot leaders
    t = BAB_PREFIX.sub("", t).strip(" |:—-")
    return re.sub(r"\s{2,}", " ", t).strip()


PARA_SPLIT = re.compile(r"\n{2,}|(?<=\.)\s*\n(?=\s*[A-Z0-9])")

# Paragraphs that are page furniture, not teaching text: the figure/table list
# that opens every Indonesian textbook, dot leaders, bare page numbers, source
# credits. They are dense in subject nouns ("Gambar 1.5 Beberapa alat
# laboratorium IPA ... 9") so without this filter they outrank real prose and
# the excerpt comes back as a table of illustrations. Seen on rows 5 and 23 of
# the first verified manifest.
CHROME_PARA = re.compile(
    r"^\s*(?:x|\d+)\s*$"
    r"|^\s*(?:Gambar|Tabel|Bagan|Diagram)\s*\d" 
    r"|\.{6,}"
    r"|^\s*Sumber\s*:"
    r"|^\s*(?:No|Nomor)\.?\s*$",
    re.IGNORECASE,
)


class Corpus:
    """One SIBI book, indexed by chapter (bab) and by paragraph.

    IDF is computed over paragraphs rather than chapters: the IPS book is a
    single 357k chapter, so a chapter-level index would give every word the same
    (negative) weight and destroy the ranking.
    """

    def __init__(self, path: Path):
        data = json.loads(path.read_text())
        self.path = path
        self.matches = data.get("matches", [])
        self.curriculum_subject = data.get("curriculum_subject")
        self.paras: list[tuple[int, int, str]] = []  # (chapter_index, seq, text)
        self.bab: dict[str, list[int]] = defaultdict(list)  # title -> chapter idxs
        self.chapters = data.get("chapters", [])
        for c in self.chapters:
            title = clean_title(c.get("title", ""))
            if not CHROME_TITLE.search(title) and title:
                self.bab[title].append(c["index"])
            for seq, p in enumerate(PARA_SPLIT.split(c.get("text", "") or "")):
                if p.strip():
                    self.paras.append((c["index"], seq, p))

        n = max(1, len(self.paras))
        df: Counter[str] = Counter()
        for _, _, p in self.paras:
            for t in tokens(p):
                df[t] += 1
        self.idf = {t: math.log(n / (1 + k)) for t, k in df.items()}

    def score(self, toks: set[str], text: str) -> float:
        """IDF-weighted share of `toks` present in `text`.

        Plain presence/absence, no term frequency, so a long chapter cannot win
        by repetition. A word that occurs in most paragraphs of the book is
        worth almost nothing; one that occurs in three dominates. This is what
        keeps the VII prosem's book-wide topic label ("Pemahaman IPA dan
        Ketrampilan Proses") from dragging every lesson into the wrong chapter.
        """
        if not toks:
            return 0.0
        hay = norm_text(text)
        got = sum(self.idf.get(t, 1.0) for t in toks if t in hay)
        tot = sum(self.idf.get(t, 1.0) for t in toks)
        return got / tot if tot else 0.0

    def bab_text(self, title: str) -> str:
        return "\n\n".join(p for ci, _, p in self.paras if ci in self.bab[title])

    def bab_title_score(self, toks: set[str], title: str) -> float:
        return self.score(toks, title)

    def best_bab_by_body(self, toks: set[str]) -> tuple[str, float]:
        best, bs = "", 0.0
        for title in self.bab:
            s = self.score(toks, self.bab_text(title))
            if s > bs:
                best, bs = title, s
        return best, bs

    def window(self, title: str, toks: set[str], budget: int = EXCERPT_BUDGET) -> tuple[str, list[int]]:
        """Keyword-aligned excerpt from a chapter.

        Splitting on chapter boundaries alone is not enough: the IPS chapter is
        the entire book, and the MTL chapters run 63k-94k, so an arbitrary
        prefix would hand the model the table of contents. Rank the chapter's
        paragraphs by how much of the session they contain, take the best ones
        until the budget is spent, then restore document order so the excerpt
        still reads front to back.
        """
        idxs = self.bab.get(title, [])
        paras = []
        for ci, seq, p in self.paras:
            if ci not in idxs:
                continue
            if CHROME_PARA.search(p.strip()[:120]):
                continue
            # The list of illustrations that opens every Indonesian textbook.
            # Extracted as one paragraph per page-side strip, it packs dozens of
            # figure captions — each naming a subject — into a single blob, so it
            # outranks real prose on any keyword search. Three or more figure
            # references in one paragraph is page furniture, not teaching text.
            if len(re.findall(r"\b(?:Gambar|Tabel|Bagan|Diagram)\b", p)) >= 3:
                continue
            # Table of contents and front matter, which the IPS extraction keeps
            # inside the same blob as the body: lines ending in "A. Keragaman
            # Sosial Budaya di Masyarakat — 166" are contents entries, and
            # "Prakata"/"Glosarium"/"Indeks" paragraphs are publisher matter.
            if len(re.findall(r"—\s*\d+\s*$", p, re.MULTILINE)) >= 3:
                continue
            # The page marker ("v", "viii", "147") sits at the head of the
            # paragraph, so this cannot be anchored at ^. "indeks" is left out
            # on purpose — "indeks keanekaragaman" is real ecology material.
            if re.search(r"\b(?:prakata|daftar isi|glosarium|daftar pustaka|"
                         r"kata pengantar|pro\w* pelaku perbukuan)\b",
                         p[:240], re.IGNORECASE):
                continue
            paras.append((seq, p))
        if not paras:
            # Every candidate was page furniture; better an empty excerpt (and a
            # "weak"/"none" verdict) than a list of figure captions handed to the
            # model as source material.
            return "", list(idxs)
        ranked = sorted(paras, key=lambda sp: self.score(toks, sp[1]), reverse=True)
        chosen, total = [], 0
        for seq, p in ranked:
            if total >= budget:
                break
            chosen.append((seq, p))
            total += len(p)
        chosen.sort()
        return "\n\n".join(p for _, p in chosen), [ci for ci in idxs]


def psql(sql: str) -> str:
    r = subprocess.run(
        ["psql", "-h", "localhost", "-U", "tutor", "-d", "ai_private_tutor",
         "-t", "-A", "-F", "|", "-c", sql],
        capture_output=True, text=True,
        env={"PGPASSWORD": "tutor123", "PATH": "/usr/bin:/bin"},
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()


def main() -> None:
    audit = json.loads(AUDIT.read_text())
    missing = [r for r in audit["rows"] if r["verdict"] == "MISSING"]

    students = {}
    for line in psql(
        'SELECT s."studentId", s.id, c.id, c.version, c."gradeLevel" '
        'FROM "Student" s JOIN "Curriculum" c ON c."studentId"=s.id '
        'WHERE c.version = (SELECT max(c2.version) FROM "Curriculum" c2 WHERE c2."studentId"=s.id);'
    ).splitlines():
        code, suuid, cuid, ver, grade = line.split("|")
        students[code] = {"student_uuid": suuid, "curriculum_id": cuid,
                          "version": int(ver), "grade": grade}

    existing: dict[str, list[dict]] = {}
    for code, info in students.items():
        rows = psql('SELECT subject, topic, coalesce("subTopic", \'\') FROM "Material" '
                    f'WHERE "curriculumId"=\'{info["curriculum_id"]}\';')
        existing[info["curriculum_id"]] = [
            dict(zip(("subject", "topic", "subTopic"), ln.split("|")))
            for ln in rows.splitlines() if ln.strip()
        ]

    corpora: dict[str, Corpus | None] = {}
    manifest = []

    for i, r in enumerate(missing, 1):
        code = r["student"]
        info = students[code]
        grade = info["grade"]
        smap = SMP_SUBJECT_MAP if grade == "SMP_1" else SMA_SUBJECT_MAP
        sibi_stem, curr_subject = smap.get(r["subject"], (r["subject"], r["subject"]))

        mp = BASE / "data" / "sibi" / "matched" / grade / f"{sibi_stem}.json"
        key = str(mp)
        if key not in corpora:
            corpora[key] = Corpus(mp) if mp.exists() else None
        corpus = corpora[key]

        topic_tokens = tokens(r["topic"])
        sub_tokens = tokens(r["subtopic"])
        all_tokens = topic_tokens | sub_tokens
        # Hint patterns are matched against the RAW label, not the ligature-folded
        # one: folding strips every `f`, so /folder/ would have to be written
        # /older/ to hit "Folder dan file". The prosem labels are hand-written and
        # spell correctly; only the PDF-extracted chapter titles lost their `fi`
        # ligature, and `norm_text` is applied to those on the other side.
        session_text = f'{r["topic"]} {r["subtopic"]}'.lower()

        bab_title, source_kind, matched_topic = "", "", ""

        if corpus:
            # 1) Concept hint. First because it keys on an unambiguous concept
            # word, where the other strategies key on accidental word overlap.
            for rx, must in HINT_CHAPTERS:
                if not re.search(rx, session_text):
                    continue
                cands = [t for t in corpus.bab
                         if any(w in norm_text(t) for w in must)]
                if cands:
                    # Prefer the bab whose *content* is largest — the real body
                    # chapter — over a short split-off fragment.
                    bab_title = max(cands, key=lambda t, c=corpus: len(c.bab_text(t)))
                    source_kind = "hint"
                    break

            # 2) The pipeline's own match, used verbatim. Re-ranking it was a
            # bug: for "Polinomial dan Fungsi Polinomial" the match correctly
            # said Polinomial, but free ranking pulled in "Fungsi dan
            # Pemodelannya" because the session label also contains "Fungsi".
            if not bab_title:
                best = 0.0
                idxs: list[int] = []
                for m in corpus.matches:
                    ov = tokens(m.get("subTopic", "")) & sub_tokens
                    mr = len(ov) / max(1, len(sub_tokens))
                    if mr > best:
                        best = mr
                        idxs = [x for x in m.get("chapter_indices", []) if x < len(corpus.chapters)]
                        matched_topic = m.get("topic", "")
                if best >= 0.5 and idxs:
                    titles = [clean_title(corpus.chapters[x].get("title", "")) for x in idxs
                              if not CHROME_TITLE.search(clean_title(corpus.chapters[x].get("title", "")))]
                    if titles:
                        bab_title = Counter(titles).most_common(1)[0][0]
                        source_kind = "matched"

            # 3) Body-word hit: some chapter spells the session out. Last resort
            # before declaring the row ungrounded.
            if not bab_title:
                cand, bs = corpus.best_bab_by_body(sub_tokens)
                if bs >= 0.9:
                    bab_title, source_kind = cand, "body"

        if not bab_title:
            source_kind = "none"

        # topic: reuse the student's existing chapter when the session belongs
        # there, else the pipeline's grouping, else the book chapter name. The
        # prosem label is only a last resort — for grade VII it is a book-wide
        # boilerplate ("Pemahaman IPA dan Ketrampilan Proses") that would create
        # one meaningless chapter holding every lesson.
        best_topic, best_s = "", 0.0
        for m in existing[info["curriculum_id"]]:
            if m["subject"] != curr_subject:
                continue
            s = corpus.score(all_tokens, f'{m["topic"]} {m["subTopic"]}') if corpus else 0.0
            if s > best_s:
                best_s, best_topic = s, m["topic"]
        if best_s >= 0.6:
            topic, topic_src = best_topic, "existing"
        elif matched_topic:
            topic, topic_src = matched_topic, "match"
        elif bab_title and bab_title.lower() != "lainnya":
            # "Lainnya" is the extraction's undifferentiated bucket, not a
            # chapter a student should see. When it is all we have, the prosem
            # label is the better topic.
            topic, topic_src = bab_title, "chapter"
        else:
            topic, topic_src = r["subtopic"], "subtopic"

        excerpt, src_chapters = ("", [])
        source_fit, distinctive, d_hits = 0.0, "", 0
        if corpus and bab_title:
            excerpt, src_chapters = corpus.window(bab_title, all_tokens)
            # Verify the excerpt, not just the chapter label. A chapter can be
            # named right and still not teach the lesson: "Jaringan Pada Hewan
            # dan Tumbuhan" routed to "Karakteristik dan Klasifikasi Makhluk
            # Hidup", whose only mention of jaringan is the aside "kingdom
            # Protista (organisme yang memiliki jaringan sederhana)". Scoring
            # the chosen text catches that; scoring the label did not. Rows that
            # fail are downgraded to "weak" so they surface for review instead of
            # being generated as if textbook-grounded.
            source_fit = corpus.score(sub_tokens, excerpt)
            # The ratio alone can be fooled by generic words. "Jaringan Pada
            # Hewan dan Tumbuhan" scored 1.0 against the classification chapter
            # because "hewan" and "tumbuhan" are everywhere and "jaringan" turned
            # up once, in the aside "kingdom Protista (organisme yang memiliki
            # jaringan sederhana)" — which is not a lesson on tissue. So the
            # single most distinctive word of the session (highest IDF: rarest in
            # this book) must appear at least twice, i.e. the text must actually
            # be about it rather than mention it in passing.
            distinctive, d_idf = "", -1e9
            hay = norm_text(excerpt)
            for t in sub_tokens:
                w = corpus.idf.get(t, 1.0)
                if w > d_idf:
                    distinctive, d_idf = t, w
            d_hits = hay.count(distinctive) if distinctive else 0
            if source_kind in ("hint", "matched", "body") and (source_fit < 0.6 or d_hits < 2):
                source_kind = "weak"
            if not excerpt.strip():
                source_kind = "none" if source_kind != "weak" else "weak"

        weeks = [int(w) for w in re.findall(r"\d+", r["weeks"])]
        manifest.append({
            "n": i,
            "student": code,
            "student_uuid": info["student_uuid"],
            "curriculum_id": info["curriculum_id"],
            "grade_level": grade,
            "semester": r["semester"],
            "prosem_subject": r["subject"],
            "subject": curr_subject,
            "prosem_topic": r["topic"],
            "topic": topic,
            "topic_source": topic_src,
            "subTopic": r["subtopic"],
            "weeks": weeks,
            "weekOrder": min(weeks) if weeks else 999,
            "sibi_file": str(mp.relative_to(BASE)) if mp.exists() else None,
            "source_kind": source_kind,
            "source_fit": round(source_fit, 3),
            "source_distinctive": distinctive,
            "source_distinctive_hits": d_hits,
            "source_bab": bab_title,
            "source_chapters": src_chapters,
            "source_chars": len(excerpt),
            "excerpt": excerpt,
        })

    OUT.write_text(json.dumps({"count": len(manifest), "items": manifest}, indent=1))

    print(f"manifest: {len(manifest)} items -> {OUT.relative_to(BASE)}")
    print("source_kind:", dict(Counter(m["source_kind"] for m in manifest)))
    print("topic_source:", dict(Counter(m["topic_source"] for m in manifest)))
    weak = [m for m in manifest if m["source_kind"] in ("weak", "none")]
    print(f"\nneeds review ({len(weak)}):")
    for m in weak:
        print(f"  #{m['n']:2} {m['student']} {m['subject'][:20]:20} "
              f"fit={m['source_fit']:.3f} bab={m['source_bab'][:34]:34} | {m['subTopic'][:52]}")
    for m in manifest:
        print(f"  {m['n']:2} {m['student']:9} {m['subject'][:22]:22} w{m['weekOrder']:<3} "
              f"{m['source_kind']:7} {m['source_chars']:>5}c | {m['topic'][:32]:32} "
              f"| {m['subTopic'][:44]:44} | bab={m['source_bab'][:40]}")


if __name__ == "__main__":
    main()
