import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
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
  /** Short text on the highlighted hour's marker line, e.g. "Now" or "Best" */
  highlightLabel?: string
  title?: string
}

export function ForecastChart({
  data,
  height = 160,
  compact = false,
  highlightHour,
  highlightLabel,
  title = 'Hourly forecast',
}: ForecastChartProps) {
  const highlightX = data.find((d) => d.hour === highlightHour)?.label
  return (
    <div className={compact ? '' : 'card-surface p-4 sm:p-5'}>
      {!compact && (
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="card-title">{title}</h3>
          <span className="text-[11px] text-ink-subtle">% of capacity · simulated</span>
        </div>
      )}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#450084" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#450084" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(32,32,51,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#77758A', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#77758A', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 14,
                border: '1px solid #E4E1EB',
                boxShadow: '0 8px 28px rgba(69,0,132,0.1)',
                fontSize: 12,
                padding: '8px 12px',
              }}
              formatter={(value) => [`${value}%`, 'Occupied']}
              labelFormatter={(label) => String(label)}
            />
            {highlightX && (
              <ReferenceLine
                x={highlightX}
                stroke="#450084"
                strokeOpacity={0.35}
                strokeDasharray="3 3"
                label={
                  highlightLabel
                    ? { value: highlightLabel, position: 'insideTopRight', fontSize: 10, fontWeight: 600, fill: '#450084' }
                    : undefined
                }
              />
            )}
            <Area
              type="monotone"
              dataKey="occupancyPercent"
              stroke="#450084"
              strokeWidth={2}
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
