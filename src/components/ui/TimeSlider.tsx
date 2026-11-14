import { RotateCcw } from 'lucide-react'
import { CLOSE_HOUR, formatHour, OPEN_HOUR } from '../../utils/time'
import { TRAFFIC_COLORS } from '../../utils/traffic'

interface TimeSliderProps {
  value: number
  onChange: (hour: number) => void
  onResetNow: () => void
  currentHour: number
}

export function TimeSlider({ value, onChange, onResetNow, currentHour }: TimeSliderProps) {
  const min = OPEN_HOUR
  const max = CLOSE_HOUR - 1
  const isNow = value === currentHour
  const track = `linear-gradient(90deg, ${TRAFFIC_COLORS.low}, ${TRAFFIC_COLORS.moderate}, ${TRAFFIC_COLORS.high})`

  return (
    <div className="glass-panel rounded-[20px] px-4 py-3.5 sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="section-label">Time</p>
          <p className="mt-0.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-ink">
            {formatHour(value)}
            {!isNow && (
              <span className="ml-2 text-[13px] font-medium text-ink-subtle">forecast</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onResetNow}
          className={[
            'pressable inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
            isNow
              ? 'bg-jmu-lavender text-jmu-purple'
              : 'bg-jmu-purple text-white hover:bg-jmu-purple-dark',
          ].join(' ')}
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
          Now
        </button>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Select forecast hour"
        className="time-slider w-full"
        style={{ background: track }}
      />

      <div className="mt-2 flex justify-between px-0.5 text-[11px] font-medium tabular-nums text-ink-subtle">
        <span>{formatHour(min)}</span>
        <span>Noon</span>
        <span>{formatHour(max)}</span>
      </div>

      <style>{`
        .time-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 5px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
        }
        .time-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #450084;
          box-shadow: 0 2px 8px rgba(69, 0, 132, 0.22);
          cursor: grab;
        }
        .time-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #450084;
          box-shadow: 0 2px 8px rgba(69, 0, 132, 0.22);
          cursor: grab;
        }
      `}</style>
    </div>
  )
}
