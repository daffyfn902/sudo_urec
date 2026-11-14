import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import type { TrafficStatus } from '../../data/types'
import { TrafficBadge } from './TrafficBadge'
import { trafficColor } from '../../utils/traffic'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'

interface OccupancyCardProps {
  status: TrafficStatus
  occupancyPercent: number
  headcount: number
  hourLabel?: string
  compact?: boolean
}

function AnimatedNumber({ value }: { value: number }) {
  const reduceMotion = usePrefersReducedMotion()
  const spring = useSpring(value, { stiffness: 120, damping: 20 })
  const display = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  if (reduceMotion) {
    return <span>{value}</span>
  }

  return <motion.span>{display}</motion.span>
}

export function OccupancyCard({
  status,
  occupancyPercent,
  headcount,
  hourLabel,
  compact = false,
}: OccupancyCardProps) {
  const accent = trafficColor(status)

  return (
    <div
      className={[
        'card-surface relative overflow-hidden',
        compact ? 'p-4' : 'p-5 sm:p-6',
      ].join(' ')}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
            {hourLabel ? `Simulated · ${hourLabel}` : 'Simulated occupancy'}
          </p>
          <h2 className={['mt-1 font-bold tracking-tight text-ink', compact ? 'text-2xl' : 'text-3xl sm:text-4xl'].join(' ')}>
            {status === 'low' ? 'Low' : status === 'moderate' ? 'Moderate' : 'High'} traffic
          </h2>
        </div>
        <TrafficBadge status={status} />
      </div>

      <div className={['relative mt-5 flex items-end gap-6', compact ? 'mt-4' : ''].join(' ')}>
        <div>
          <p className={['font-bold tabular-nums text-jmu-purple', compact ? 'text-3xl' : 'text-4xl sm:text-5xl'].join(' ')}>
            <AnimatedNumber value={occupancyPercent} />
            <span className="text-xl text-jmu-purple-light">%</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">of capacity</p>
        </div>
        <div className="mb-1 h-10 w-px bg-border-strong" />
        <div>
          <p className={['font-semibold tabular-nums text-ink', compact ? 'text-xl' : 'text-2xl'].join(' ')}>
            ~<AnimatedNumber value={headcount} />
          </p>
          <p className="mt-1 text-sm text-ink-muted">people inside</p>
        </div>
      </div>

      <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-jmu-lavender-mid">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: accent }}
          initial={false}
          animate={{ width: `${occupancyPercent}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
      <p className="mt-3 text-[11px] text-ink-subtle">Demo data — not live UREC headcounts</p>
    </div>
  )
}
