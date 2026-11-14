import { RotateCcw } from 'lucide-react'
import { CLOSE_HOUR, formatHour, OPEN_HOUR } from '../../utils/time'

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

  return (
    <div className="glass-panel rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            Forecast time
          </p>
          <p className="text-lg font-bold text-ink">{formatHour(value)}</p>
        </div>
        <button
          type="button"
          onClick={onResetNow}
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
            isNow
              ? 'bg-jmu-lavender text-jmu-purple'
              : 'bg-jmu-purple text-white hover:bg-jmu-purple-dark',
          ].join(' ')}
        >
          <RotateCcw className="h-3 w-3" />
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
      />

      <div className="mt-1 flex justify-between text-[10px] font-medium text-ink-subtle">
        <span>{formatHour(min)}</span>
        <span>{formatHour(12)}</span>
        <span>{formatHour(max)}</span>
      </div>

      <style>{`
        .time-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, #34c759 0%, #ffcc00 55%, #ff3b30 100%);
          outline: none;
        }
        .time-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #450084;
          box-shadow: 0 2px 8px rgba(69, 0, 132, 0.25);
          cursor: pointer;
        }
        .time-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #450084;
          box-shadow: 0 2px 8px rgba(69, 0, 132, 0.25);
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
