SELECT
  department_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'PRESENT') AS present,
  COUNT(*) FILTER (WHERE status = 'LATE') AS late,
  COUNT(*) FILTER (WHERE status = 'ABSENT') AS absent,
  COUNT(*) FILTER (WHERE status = 'LEAVE') AS leave,
  ROUND(
    (
      COUNT(*) FILTER (WHERE status IN ('PRESENT', 'LATE'))::NUMERIC
      / NULLIF(COUNT(*), 0)
    ) * 100,
    1
  ) AS attendance_rate
FROM attendance_records
WHERE work_date BETWEEN $1 AND $2
  AND ($3::VARCHAR IS NULL OR department_id = $3)
GROUP BY department_id
ORDER BY department_id;
