import type { TrafficStatus } from '../../data/types'
import { trafficBgClass, trafficDotClass, trafficLabel } from '../../utils/traffic'

interface TrafficBadgeProps {
  status: TrafficStatus
  size?: 'sm' | 'md'
  className?: string
}

export function TrafficBadge({ status, size = 'md', className = '' }: TrafficBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        trafficBgClass(status),
        className,
      ].join(' ')}
    >
      <span className={['rounded-full', size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2', trafficDotClass(status)].join(' ')} />
      {trafficLabel(status)}
    </span>
  )
}
