#!/bin/bash
# Propagate slide + quiz fixes from template students to their copies.
# Usage: bash scripts/propagate-template-fixes.sh [GRADE]
set -e
cd /home/ubuntu/ai-private-tutor || exit 1

GRADE_FILTER=${1:-all}

# Map grade -> template studentId (human-readable) and template UUID
run_for_grade() {
  local GRADE=$1
  local TEMPLATE_STUDENT_ID=$2
  local TEMPLATE_NAME=$3

  echo "=== [$(date -Is)] Propagating $GRADE from $TEMPLATE_NAME ($TEMPLATE_STUDENT_ID) ==="

  psql_cmd() {
    sudo -u postgres psql -d ai_private_tutor -c "$1"
  }

  # Template UUID and curriculum
  local TEMPLATE_UUID
  TEMPLATE_UUID=$(psql_cmd "SELECT id FROM \"Student\" WHERE \"studentId\" = '$TEMPLATE_STUDENT_ID';" | grep -E '^ [a-f0-9-]+ ' | head -1 | tr -d ' ')
  local TEMPLATE_CURR
  TEMPLATE_CURR=$(psql_cmd "SELECT id FROM \"Curriculum\" WHERE \"studentId\" = '$TEMPLATE_UUID';" | grep -E '^ [a-f0-9-]+ ' | head -1 | tr -d ' ')

  if [ -z "$TEMPLATE_UUID" ] || [ -z "$TEMPLATE_CURR" ]; then
    echo "Template not found for $GRADE"
    return 1
  fi

  # Find copy students (isTemplate=false, same grade)
  local COPY_STUDENTS
  COPY_STUDENTS=$(psql_cmd "SELECT \"studentId\" FROM \"Student\" WHERE \"isTemplate\" = false AND \"gradeLevel\" = '$GRADE';" | grep -E '^ [A-Z]' | awk '{print $1}')

  if [ -z "$COPY_STUDENTS" ]; then
    echo "No copy students for $GRADE"
    return 0
  fi

  for STUDENT_ID in $COPY_STUDENTS; do
    echo "  -> syncing to $STUDENT_ID"

    local STUDENT_UUID
    STUDENT_UUID=$(psql_cmd "SELECT id FROM \"Student\" WHERE \"studentId\" = '$STUDENT_ID';" | grep -E '^ [a-f0-9-]+ ' | head -1 | tr -d ' ')
    local STUDENT_CURR
    STUDENT_CURR=$(psql_cmd "SELECT id FROM \"Curriculum\" WHERE \"studentId\" = '$STUDENT_UUID';" | grep -E '^ [a-f0-9-]+ ' | head -1 | tr -d ' ')

    if [ -z "$STUDENT_CURR" ]; then
      echo "    WARNING: no curriculum for $STUDENT_ID"
      continue
    fi

    # Sync slides
    psql_cmd "
      UPDATE \"Material\" a
      SET metadata = jsonb_set(
          COALESCE(a.metadata, '{}'::jsonb),
          '{slide}',
          to_jsonb(s.metadata->>'slide'),
          true
        ),
        \"updatedAt\" = NOW()
      FROM \"Material\" s
      WHERE a.\"curriculumId\" = '$STUDENT_CURR'
        AND s.\"curriculumId\" = '$TEMPLATE_CURR'
        AND a.subject = s.subject
        AND a.topic = s.topic
        AND a.\"subTopic\" IS NOT DISTINCT FROM s.\"subTopic\";
    " > /dev/null

    # Sync quizzes (match by subject/topic/subTopic)
    psql_cmd "
      UPDATE \"Quiz\" a
      SET questions = s.questions,
          \"updatedAt\" = NOW()
      FROM \"Quiz\" s
      JOIN \"Material\" ms ON s.\"materialId\" = ms.id
      JOIN \"Material\" ma ON ma.subject = ms.subject AND ma.topic = ms.topic AND ma.\"subTopic\" IS NOT DISTINCT FROM ms.\"subTopic\"
      WHERE a.\"materialId\" = ma.id
        AND s.\"studentId\" = '$TEMPLATE_UUID'
        AND a.\"studentId\" = '$STUDENT_UUID';
    " > /dev/null

    # Verify
    local v
    v=$(psql_cmd "
      SELECT COUNT(*) FILTER (WHERE a.metadata->>'slide' = s.metadata->>'slide') || '/' || COUNT(*)
      FROM \"Material\" a
      JOIN \"Material\" s ON a.subject = s.subject AND a.topic = s.topic AND a.\"subTopic\" IS NOT DISTINCT FROM s.\"subTopic\"
      WHERE a.\"curriculumId\" = '$STUDENT_CURR'
        AND s.\"curriculumId\" = '$TEMPLATE_CURR';
    " | awk 'NR==3{print $1}')
    echo "       slides synced: $v"
  done
}

if [ "$GRADE_FILTER" = "all" ] || [ "$GRADE_FILTER" = "SD_5" ]; then
  run_for_grade SD_5 SYIFA001 Syifa
fi
if [ "$GRADE_FILTER" = "all" ] || [ "$GRADE_FILTER" = "SMP_1" ]; then
  run_for_grade SMP_1 RAIHAN001 Raihan
fi
if [ "$GRADE_FILTER" = "all" ] || [ "$GRADE_FILTER" = "SMA_2" ]; then
  run_for_grade SMA_2 SHOFI001 SHOFI
fi

echo "=== [$(date -Is)] Propagation complete ==="
