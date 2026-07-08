-- Generate curricula for Syifa & Shofi
DO $$
DECLARE
  syifa_id text;
  shofi_id text;
  cur_id text;
  rec record;
BEGIN
  -- Get student IDs
  SELECT id INTO syifa_id FROM "Student" WHERE "studentId" = 'SYIF62818';
  SELECT id INTO shofi_id FROM "Student" WHERE "studentId" = 'SHOFI001';
  
  -- Syifa (SD_5)
  IF NOT EXISTS (SELECT 1 FROM "Curriculum" WHERE "studentId" = syifa_id) THEN
    cur_id := gen_random_uuid()::text;
    INSERT INTO "Curriculum" (id, "studentId", "gradeLevel", version, metadata, "createdAt", "updatedAt")
    VALUES (cur_id, syifa_id, 'SD_5', 1, '{}', NOW(), NOW());
    
    -- We'll add materials via the seed approach
    RAISE NOTICE 'Curriculum created for Syifa: %', cur_id;
  END IF;
  
  -- Shofi (SMA_2)
  IF NOT EXISTS (SELECT 1 FROM "Curriculum" WHERE "studentId" = shofi_id) THEN
    cur_id := gen_random_uuid()::text;
    INSERT INTO "Curriculum" (id, "studentId", "gradeLevel", version, metadata, "createdAt", "updatedAt")
    VALUES (cur_id, shofi_id, 'SMA_2', 1, '{}', NOW(), NOW());
    RAISE NOTICE 'Curriculum created for Shofi: %', cur_id;
  END IF;
END $$;
