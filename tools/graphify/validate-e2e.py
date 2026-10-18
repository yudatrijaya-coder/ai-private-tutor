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
        _cache[rel] = open(p, encoding='utf-8', errors='ignore').read() if os.path.isfile(p) else None
    return _cache[rel]

def resolve(from_file, spec):
    d = os.path.dirname(from_file)
    if spec.startswith('@/'):
        base = os.path.join(APP, 'src', spec[2:])
    elif spec.startswith('.'):
        base = os.path.normpath(os.path.join(APP, d, spec))
    else:
        return None
    for ext in ('', '.ts', '.tsx', '/index.ts', '/index.tsx'):
        p = base + ext
        if os.path.isfile(p):
            return os.path.relpath(p, APP)
    return None

def all_specs(s):
    sp = set()
    for pat in (r'''from\s+['"]([^'"]+)['"]''',
                r'''require\(\s*['"]([^'"]+)['"]''',
                r'''import\(\s*['"]([^'"]+)['"]''',
                r'''^\s*from\s+(\S+)\s+import''',
                r'''^\s*import\s+([A-Za-z_][\w.]*)'''):
        for m in re.finditer(pat, s, re.M):
            sp.add(m.group(1))
    return sp

def modname(fb):
    m = os.path.splitext(os.path.basename(fb))[0]
    return os.path.basename(os.path.dirname(fb)) if m == 'index' else m

def check(rels):
    ok = via_reexp = bad = skip = 0
    badlist = []
    for l in links:
        if l.get('relation') not in rels:
            continue
        a, b = by_id.get(l['source']), by_id.get(l['target'])
        if not a or not b:
            skip += 1; continue
        fa, fb = a.get('source_file'), b.get('source_file')
        if not fa or not fb or fa == fb or fb.endswith('package.json'):
            skip += 1; continue
        if not fa.endswith(('.ts', '.tsx', '.js', '.cjs', '.mjs', '.jsx', '.py')):
            skip += 1; continue
        s = src(fa)
        if s is None:
            skip += 1; continue
        mod = modname(fb)
        if len(mod) < 3:
            skip += 1; continue
        specs = all_specs(s)

        # 1) langsung
        if any(re.search(r'\b' + re.escape(mod) + r'\b', sp) for sp in specs):
            ok += 1
            continue
        # 2) transitif via re-export (TS)
        found = False
        for sp in specs:
            rp = resolve(fa, sp)
            if rp == fb:
                found = True; break
            if rp and os.path.isfile(os.path.join(APP, rp)):
                xs = src(rp)
                if xs and re.search(r'''export\s*\{[^}]*\}\s*from\s+['"][^'"]*\b''' + re.escape(mod) + r'''\b''', xs, re.S):
                    found = True; break
        if found:
            ok += 1
            via_reexp += 1
        else:
            bad += 1
            if len(badlist) < 5:
                badlist.append((fa, mod, fb))
    return ok, bad, skip, via_reexp, badlist

print("=" * 96)
print("VALIDASI END-TO-END FINAL")
print("=" * 96)
import_rels = {'imports', 'imports_from', 'dynamic_import', 're_exports'}
ok, bad, skip, rx, bl = check(import_rels)
print(f"\n1. EDGE IMPORT (imports/imports_from/dynamic_import/re_exports)")
print(f"   benar {ok}  (termasuk {rx} via re-export transitif)  salah {bad}  skip {skip}")
print(f"   -> {ok/(ok+bad)*100:.1f}%" if ok + bad else "")
for fa, mod, fb in bl:
    print(f"      MISS {fa}: {mod} -> {fb}")

print()
print("2. NODE: label fungsi vs kode asli")
funcs = [n for n in g['nodes'] if str(n.get('label', '')).endswith('()')
         and n.get('source_file', '').startswith('src/')]
ok2 = bad2 = 0
for n in funcs:
    name = str(n['label'])[:-2]
    s = src(n['source_file'])
    if s is None:
        continue
    if re.search(r'\b' + re.escape(name) + r'\b', s):
        ok2 += 1
    else:
        bad2 += 1
print(f"   {ok2}/{ok2+bad2} fungsi benar ada  ->  {ok2/(ok2+bad2)*100:.2f}%")

print()
print("3. SOURCE_LOCATION valid (dalam rentang file)")
loc_ok = loc_bad = 0
for n in g['nodes']:
    loc, sf = n.get('source_location'), n.get('source_file')
    if not loc or not sf:
        continue
    s = src(sf)
    if s is None:
        continue
    m = re.match(r'L(\d+)', str(loc))
    if not m:
        continue
    nlines = s.count('\n') + 1
    if int(m.group(1)) <= nlines:
        loc_ok += 1
    else:
        loc_bad += 1
print(f"   {loc_ok}/{loc_ok+loc_bad} dalam rentang  ->  {loc_ok/(loc_ok+loc_bad)*100:.2f}%")
