import type { DailyTrendPoint } from '../../types/attendance'

interface AttendanceTrendChartProps {
  data: DailyTrendPoint[]
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  const maxTotal = Math.max(...data.map((point) => point.total), 1)

  return (
    <div className="trend-chart">
      <div className="trend-chart__plot" role="img" aria-label="Attendance trend for recent days">
        {data.map((point) => {
          const height = point.total === 0 ? 0 : Math.max(8, Math.round((point.total / maxTotal) * 100))

          return (
            <div className="trend-chart__column" key={point.date}>
              <div className="trend-chart__track">
                <div
                  className={`trend-chart__bar${point.total === 0 ? ' trend-chart__bar--empty' : ''}`}
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${point.present} present, ${point.late} late, ${point.absent} absent, ${point.incomplete} incomplete`}
                >
                  {point.present > 0 && (
                    <span
                      className="trend-chart__segment trend-chart__segment--present"
                      style={{ flexGrow: point.present }}
                    />
                  )}
                  {point.late > 0 && (
                    <span
                      className="trend-chart__segment trend-chart__segment--late"
                      style={{ flexGrow: point.late }}
                    />
                  )}
                  {point.absent > 0 && (
                    <span
                      className="trend-chart__segment trend-chart__segment--absent"
                      style={{ flexGrow: point.absent }}
                    />
                  )}
                  {point.incomplete > 0 && (
                    <span
                      className="trend-chart__segment trend-chart__segment--incomplete"
                      style={{ flexGrow: point.incomplete }}
                    />
                  )}
                </div>
              </div>
              <span className="trend-chart__label">{point.label}</span>
              <span className="trend-chart__value">{point.total}</span>
            </div>
          )
        })}
      </div>
      <div className="trend-chart__legend">
        <span>
          <i className="trend-chart__dot trend-chart__dot--present" />
          Present
        </span>
        <span>
          <i className="trend-chart__dot trend-chart__dot--late" />
          Late
        </span>
        <span>
          <i className="trend-chart__dot trend-chart__dot--absent" />
          Absent
        </span>
        <span>
          <i className="trend-chart__dot trend-chart__dot--incomplete" />
          Incomplete
        </span>
      </div>
    </div>
  )
}
