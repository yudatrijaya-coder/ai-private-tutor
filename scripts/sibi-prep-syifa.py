#!/usr/bin/env python3
import os
import sys

def check_sd_pdfs():
    sibi_dir = os.path.expanduser('~/ai-private-tutor/moodle-files/sibi-books')
    print("Mengecek SIBI PDFs untuk level SD...")
    
    if not os.path.exists(sibi_dir):
        print(f"Directory {sibi_dir} tidak ditemukan.")
        return False
        
    files = os.listdir(sibi_dir)
    sd_files = [f for f in files if 'SD' in f.upper() or 'MI' in f.upper()]
    
    if sd_files:
        print("Ditemukan file PDF SIBI untuk SD:")
        for f in sd_files:
            print(f" - {f}")
        return True
    else:
        print("TIDAK DITEMUKAN file PDF SIBI untuk level SD di direktori.")
        print(f"Isi direktori saat ini ({len(files)} file):")
        for f in files:
            print(f" - {f}")
        return False

if __name__ == "__main__":
    check_sd_pdfs()
