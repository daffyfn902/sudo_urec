import type { FloorNumber } from '../../data/types'

interface FloorSelectorProps {
  value: FloorNumber | 'all'
  onChange: (value: FloorNumber | 'all') => void
}

const OPTIONS: Array<{ id: FloorNumber | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 1, label: 'Floor 1' },
  { id: 2, label: 'Floor 2' },
]

export function FloorSelector({ value, onChange }: FloorSelectorProps) {
  return (
    <div className="glass-panel inline-flex rounded-full p-1" role="group" aria-label="Floor">
      {OPTIONS.map((option) => {
        const active = value === option.id
        return (
          <button
            key={String(option.id)}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              active ? 'bg-jmu-purple text-white shadow-sm' : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
