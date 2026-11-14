import { CalendarDays, Clock3, Trash2 } from 'lucide-react'
import type { SavedWorkoutPlan } from '../../data/types'
import { TrafficBadge } from './TrafficBadge'
import { formatDisplayDate } from '../../utils/time'

const PREFERENCE_LABELS: Record<string, string> = {
  any: 'Any zone',
  weights: 'Weights',
  cardio: 'Cardio',
  courts: 'Courts',
}

interface SavedPlanCardProps {
  plan: SavedWorkoutPlan
  onRemove: (id: string) => void
}

export function SavedPlanCard({ plan, onRemove }: SavedPlanCardProps) {
  return (
    <article className="card-surface flex items-start gap-3 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-jmu-lavender text-jmu-purple">
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-ink">{formatDisplayDate(plan.date)}</h3>
          <TrafficBadge status={plan.expectedCrowdLevel} size="sm" />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <Clock3 className="h-3.5 w-3.5" />
          {plan.timeLabel}
        </p>
        <p className="mt-1 text-sm text-ink">
          {PREFERENCE_LABELS[plan.preference] ?? plan.preference}
          {plan.recommendedZoneLabel ? ` · ${plan.recommendedZoneLabel}` : ''}
        </p>
        <p className="mt-1 text-xs text-ink-subtle">
          ~{plan.expectedOccupancyPercent}% expected
          {plan.scenarioLabel ? ` · ${plan.scenarioLabel}` : ''}
          {' · '}simulated
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(plan.id)}
        className="rounded-xl p-2 text-ink-subtle transition-colors hover:bg-red-50 hover:text-red-600"
        aria-label="Remove saved plan"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  )
}
