import type { ReactNode } from 'react'
import { Clock3 } from 'lucide-react'
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
      <div className="px-5 pb-1 pt-5">
        <p className="section-label text-jmu-purple">Recommended</p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <p className="flex items-center gap-2 text-[1.55rem] font-semibold tracking-[-0.03em] text-ink">
            <Clock3 className="h-5 w-5 text-jmu-purple-light" />
            {label}
          </p>
          <TrafficBadge status={expectedStatus} />
        </div>
      </div>
      <div className="space-y-3.5 px-5 pb-5 pt-3">
        <p className="text-[14px] leading-relaxed text-ink-muted">{reason}</p>
        <p className="text-[13px] text-ink">
          Expected{' '}
          <span className="font-semibold tabular-nums">{expectedOccupancyPercent}%</span>
          <span className="text-ink-subtle"> · simulated</span>
        </p>
        {action}
      </div>
    </div>
  )
}
