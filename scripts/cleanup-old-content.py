#!/usr/bin/env python3.12
"""
Step 6: Cleanup old content (Materials & Quizzes) for subjects not in new curriculum
"""

import subprocess

CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27'
VALID_SUBJECTS = (
    'Bahasa Indonesia', 'Bahasa Inggris', 'Biologi', 'Ekonomi', 'Fisika', 
    'Geografi', 'Informatika', 'Kimia', 'Matematika', 'PJOK', 
    'Pendidikan Pancasila', 'Sejarah', 'Sosiologi'
)

def run_psql(sql):
    return subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True, text=True)

def cleanup():
    print(f"Cleaning up old content for Curriculum: {CURRICULUM_ID}...")
    
    # 1. Identify Material IDs to delete
    subjects_str = ", ".join([f"'{s}'" for s in VALID_SUBJECTS])
    sql_find = f"SELECT id FROM \"Material\" WHERE \"curriculumId\" = '{CURRICULUM_ID}' AND subject NOT IN ({subjects_str});"
    r = run_psql(f"SELECT id FROM \"Material\" WHERE \"curriculumId\" = '{CURRICULUM_ID}' AND subject NOT IN ({subjects_str});")
    
    material_ids = [line.strip() for line in r.stdout.split('\n') if line.strip() and '-' in line]
    
    if not material_ids:
        print("  ✅ No old materials found to delete.")
        return

    print(f"  Found {len(material_ids)} old materials to delete.")
    
    # 2. Delete related records first to avoid FK errors
    ids_str = ", ".join([f"'{id}'" for id in material_ids])
    
    # Delete Attempts linked to Quizzes of these Materials
    print("  Deleting related Attempts...")
    sql_del_attempts = f"DELETE FROM \"Attempt\" WHERE \"quizId\" IN (SELECT id FROM \"Quiz\" WHERE \"materialId\" IN ({ids_str}));"
    run_psql(sql_del_attempts)
    
    # Delete Quizzes linked to these Materials
    print("  Deleting related Quizzes...")
    sql_del_quizzes = f"DELETE FROM \"Quiz\" WHERE \"materialId\" IN ({ids_str});"
    run_psql(sql_del_quizzes)
    
    # 3. Finally delete the Materials
    print("  Deleting Materials...")
    sql_del_materials = f"DELETE FROM \"Material\" WHERE id IN ({ids_str});"
    r_del = run_psql(sql_del_materials)
    
    if r_del.returncode == 0:
        print(f"  ✅ Successfully cleaned up {len(material_ids)} old materials and their related data.")
    else:
        print(f"  ❌ Cleanup failed: {r_del.stderr}")

if __name__ == "__main__":
    cleanup()
