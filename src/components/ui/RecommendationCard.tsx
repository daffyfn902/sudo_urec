import type { ReactNode } from 'react'
import { Clock3, Sparkles } from 'lucide-react'
import type { TrafficStatus } from '../../data/types'
import { TrafficBadge } from './TrafficBadge'

interface RecommendationCardProps {
  label: string
  reason: string
  expectedStatus: TrafficStatus
  expectedOccupancyPercent: number
  action?: ReactNode
}

export function RecommendationCard({
  label,
  reason,
  expectedStatus,
  expectedOccupancyPercent,
  action,
}: RecommendationCardProps) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="border-b border-border bg-jmu-lavender/70 px-5 py-4">
        <div className="flex items-center gap-2 text-jmu-purple">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Recommended window</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Clock3 className="h-5 w-5 text-jmu-purple-light" />
            {label}
          </p>
          <TrafficBadge status={expectedStatus} />
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm leading-relaxed text-ink-muted">{reason}</p>
        <p className="text-sm text-ink">
          Expected crowd:{' '}
          <span className="font-semibold tabular-nums">{expectedOccupancyPercent}%</span>
          <span className="text-ink-subtle"> · simulated</span>
        </p>
        {action}
      </div>
    </div>
  )
}
