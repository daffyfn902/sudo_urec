import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HourlyForecast } from '../../data/types'
import { trafficColor } from '../../utils/traffic'

interface ForecastChartProps {
  data: HourlyForecast[]
  height?: number
  compact?: boolean
  highlightHour?: number
}

export function ForecastChart({
  data,
  height = 160,
  compact = false,
  highlightHour,
}: ForecastChartProps) {
  return (
    <div className={compact ? '' : 'card-surface p-4 sm:p-5'}>
      {!compact && (
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-ink">Hourly forecast</h3>
          <span className="text-[11px] text-ink-subtle">Simulated</span>
        </div>
      )}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#450084" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#450084" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(69,0,132,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9a94a3' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#9a94a3' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              width={36}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid rgba(69,0,132,0.1)',
                boxShadow: '0 8px 24px rgba(69,0,132,0.1)',
                fontSize: 12,
              }}
              formatter={(value) => [`${value}% occupied`, 'Simulated']}
              labelFormatter={(label) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="occupancyPercent"
              stroke="#450084"
              strokeWidth={2.25}
              fill="url(#forecastFill)"
              dot={(props) => {
                const { cx, cy, payload } = props as {
                  cx?: number
                  cy?: number
                  payload?: HourlyForecast
                }
                if (
                  highlightHour == null ||
                  !payload ||
                  payload.hour !== highlightHour ||
                  cx == null ||
                  cy == null
                ) {
                  return <g key={`dot-${payload?.hour ?? cx}`} />
                }
                return (
                  <circle
                    key={`hl-${payload.hour}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={trafficColor(payload.status)}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#450084' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
