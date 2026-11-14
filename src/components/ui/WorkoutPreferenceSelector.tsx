import { Dumbbell, Footprints, LayoutGrid, Volleyball } from 'lucide-react'
import type { WorkoutPreference } from '../../data/types'

const OPTIONS: Array<{
  id: WorkoutPreference
  label: string
  icon: typeof Dumbbell
}> = [
  { id: 'any', label: 'Any', icon: LayoutGrid },
  { id: 'weights', label: 'Weights', icon: Dumbbell },
  { id: 'cardio', label: 'Cardio', icon: Footprints },
  { id: 'courts', label: 'Courts', icon: Volleyball },
]

interface WorkoutPreferenceSelectorProps {
  value: WorkoutPreference
  onChange: (value: WorkoutPreference) => void
}

export function WorkoutPreferenceSelector({ value, onChange }: WorkoutPreferenceSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Workout preference">
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.97]',
              active
                ? 'border-jmu-purple bg-jmu-purple text-white shadow-sm'
                : 'border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
