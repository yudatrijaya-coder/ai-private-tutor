#!/usr/bin/env python3
"""Download buku Kurikulum Merdeka dari SIBI"""
import urllib.request, urllib.error, json, os, sys, time

BASE = 'https://api.buku.cloudapp.web.id/api/catalogue/getPenggerakTextBooks?limit=500'

# Buku yg relevan per student
WANTED = {
    'SD5': {
        'title_contains': [
            'SD/MI Kelas V', 'SD/MI Kelas 5',
        ],
        'subjects': ['ipas', 'bahasa_indonesia', 'pendidikan_pancasila', 'pjok', 'seni_rupa', 'seni_musik', 'bahasa_inggris', 'seni_tari', 'seni_teater'],
        'only_bs': True,  # Buku Siswa (BS), bukan BG
    },
    'SMP7': {
        'title_contains': ['SMP/MTs Kelas VII', 'SMP/MTs Kelas 7'],
        'subjects': ['ipa', 'informatika', 'bahasa_indonesia', 'bahasa_inggris', 'ips', 'pjok', 'pendidikan_pancasila'],
        'only_bs': True,
    },
    'SMA11': {
        'title_contains': ['SMA/MA Kelas XI', 'SMA/MA/SMK/MAK Kelas XI', 'untuk SMA/MA Kelas XI'],
        'subjects': ['matematika', 'bahasa_indonesia', 'informatika', 'bahasa_mandarin', 'pjok', 'pendidikan_pancasila',
                     'ekonomi', 'sosiologi', 'geografi', 'antropologi', 'bahasa_inggris'],
        'only_bs': True,
    },
}

OUT = os.path.expanduser('~/ai-private-tutor/moodle-files/sibi-books')
os.makedirs(OUT, exist_ok=True)

# Load cookies
import http.cookiejar
cj = http.cookiejar.MozillaCookieJar('/tmp/sibi_cookies.txt')
cj.load()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.addheaders = [('User-Agent', 'Mozilla/5.0')]

# Fetch catalogue
resp = opener.open(BASE)
data = json.loads(resp.read())
results = data.get('results', [])
print(f"Total buku di katalog: {len(results)}")

for student, config in WANTED.items():
    print(f"\n=== {student} ===")
    count = 0
    for book in results:
        title = book.get('title', '')
        subject = book.get('subject', '')
        attachment = book.get('attachment', '')
        is_bs = 'BS' in title or 'Siswa' in title
        
        if not attachment:
            continue
        if config.get('only_bs') and not is_bs:
            continue
        
        # Check title match
        title_ok = any(t.lower() in title.lower() for t in config['title_contains'])
        if not title_ok:
            continue
        
        # Check subject match
        if config['subjects']:
            subj_ok = any(s.lower() == subject.lower() for s in config['subjects'] if subject)
            if not subj_ok:
                continue
        
        # Download
        fname = os.path.basename(attachment.split('?')[0])
        if not fname.endswith('.pdf'):
            fname += '.pdf'
        fpath = os.path.join(OUT, fname)
        
        if os.path.exists(fpath) and os.path.getsize(fpath) > 10000:
            print(f"  ⏭️ {title[:50]}... (already exists)")
            continue
        
        try:
            print(f"  ⬇️ {title[:50]}...", end=' ', flush=True)
            resp = opener.open(attachment)
            with open(fpath, 'wb') as f:
                f.write(resp.read())
            sz = os.path.getsize(fpath)
            print(f"{sz//1024}KB")
            count += 1
            time.sleep(1)  # rate limit
        except Exception as e:
            print(f"❌ {e}")
    
    print(f"  Downloaded: {count} books")

print(f"\n✅ Selesai! Buku tersimpan di {OUT}")
