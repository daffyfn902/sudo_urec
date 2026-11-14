import type { TrafficStatus } from '../../data/types'
import { busyColor, trafficBgClass, trafficDotClass, trafficLabel } from '../../utils/traffic'

interface TrafficBadgeProps {
  status: TrafficStatus
  size?: 'sm' | 'md'
  className?: string
  /** When given, the dot uses the map's continuous colour for this occupancy, so it matches the time slider */
  percent?: number
}

export function TrafficBadge({ status, size = 'md', className = '', percent }: TrafficBadgeProps) {
  const exact = percent == null ? undefined : busyColor(percent)
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        trafficBgClass(status),
        className,
      ].join(' ')}
      style={exact ? { backgroundColor: `${exact}26` } : undefined}
    >
      <span
        className={['rounded-full', size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2', exact ? '' : trafficDotClass(status)].join(' ')}
        style={exact ? { backgroundColor: exact } : undefined}
      />
      {trafficLabel(status)}
    </span>
  )
}
