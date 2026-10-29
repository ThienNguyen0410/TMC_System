import { Tag } from 'antd'
import type { AttendanceStatus } from '../../types/attendance'
import { attendanceStatusMeta } from '../../utils/attendance'

interface AttendanceStatusTagProps {
  status: AttendanceStatus
}

export function AttendanceStatusTag({ status }: AttendanceStatusTagProps) {
  const meta = attendanceStatusMeta[status]
  return (
    <Tag color={meta.tagColor} className={`status-tag status-tag--${status}`}>
      {meta.label}
    </Tag>
  )
}
