CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department_id VARCHAR(50),
  work_date DATE NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'LATE', 'ABSENT', 'LEAVE')),
  note TEXT,
  synced_to_payroll_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_attendance_employee_work_date UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_work_date
  ON attendance_records (work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_department
  ON attendance_records (department_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_employee
  ON attendance_records (employee_id);
