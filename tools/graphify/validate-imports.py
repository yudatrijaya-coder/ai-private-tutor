import json, os, re
from collections import Counter

APP = '/home/ubuntu/ai-private-tutor'
g = json.load(open(f'{APP}/graphify-out/graph.json'))
by_id = {n['id']: n for n in g['nodes']}
links = g['links']
_cache = {}

def src(rel):
    if rel not in _cache:
        p = os.path.join(APP, rel)
        _cache[rel] = open(p, encoding='utf-8', errors='ignore').read() if os.path.exists(p) else None
    return _cache[rel]

def modname(fb):
    m = os.path.splitext(os.path.basename(fb))[0]
    return os.path.basename(os.path.dirname(fb)) if m == 'index' else m

def is_code_import(a, b):
    """True bila edge adalah import file-kode ke file-kode."""
    fa = a.get('source_file') if a else None
    fb = b.get('source_file') if b else None
    if not fa or not fb:
        return False
    if fb.endswith('package.json'):
        return False          # dependency, bukan import kode
    return fa.endswith(('.ts', '.tsx', '.js', '.cjs', '.mjs', '.jsx', '.py'))

def validate(rel_name):
    ok = bad = skip = 0
    badlist = []
    for l in links:
        if l.get('relation') != rel_name:
            continue
        a, b = by_id.get(l['source']), by_id.get(l['target'])
        if not b:
            skip += 1; continue
        if not is_code_import(a, b):
            skip += 1; continue
        fa, fb = a['source_file'], b['source_file']
        mod = modname(fb)
        if len(mod) < 3 or fa == fb:
            skip += 1; continue
        s = src(fa)
        if s is None:
            skip += 1; continue
        pat = (r'''from\s+['"][^'"]*\b''' + re.escape(mod) + r'''\b'''
               r'''|require\(\s*['"][^'"]*\b''' + re.escape(mod) + r'''\b'''
               r'''|import\(\s*['"][^'"]*\b''' + re.escape(mod) + r'''\b''')
        if re.search(pat, s):
            ok += 1
        else:
            bad += 1
            if len(badlist) < 6:
                badlist.append((fa, mod, fb))
    pct = ok / (ok + bad) * 100 if (ok + bad) else 0
    print(f"  {rel_name:16s} benar {ok:>5d}  salah {bad:>4d}  skip {skip:>4d}   {pct:>5.1f}%")
    for fa, mod, fb in badlist:
        print(f"       MISS {fa.split('/')[-1]:22s} -> {mod:16s} ({fb})")
    return ok, bad

print("=" * 94)
print("VALIDASI FINAL — edge import, diklasifikasi benar")
print("  Dikecualikan: edge ke package.json (=dependency, bukan import kode)")
print("=" * 94)
tu = [validate(r) for r in ('imports', 'imports_from', 'dynamic_import')]
print("-" * 94)
tok = sum(x[0] for x in tu); tbad = sum(x[1] for x in tu)
print(f"  TOTAL import edge: benar {tok}, salah {tbad}  ->  {tok/(tok+tbad)*100:.1f}%")
