import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import type { TrafficStatus } from '../../data/types'
import { TrafficBadge } from './TrafficBadge'
import { busyColor } from '../../utils/traffic'
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
  const spring = useSpring(value, { stiffness: 140, damping: 22 })
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
  const accent = busyColor(occupancyPercent)

  return (
    <div className={['card-surface', compact ? 'p-4' : 'p-5 sm:p-6'].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">{hourLabel ? `Now · ${hourLabel}` : 'Now'}</p>
          <h2
            className={[
              'mt-1 font-semibold tracking-[-0.03em] text-ink',
              compact ? 'text-[1.4rem]' : 'text-[1.65rem] sm:text-[1.85rem]',
            ].join(' ')}
          >
            {status === 'low' ? 'Low' : status === 'moderate' ? 'Moderate' : 'High'} traffic
          </h2>
        </div>
        <TrafficBadge status={status} percent={occupancyPercent} />
      </div>

      <div className={['mt-5 flex items-end gap-5', compact ? 'mt-4' : ''].join(' ')}>
        <div>
          <p
            className={[
              'font-semibold tabular-nums tracking-[-0.04em] text-jmu-purple',
              compact ? 'text-[2.1rem]' : 'text-[2.6rem] sm:text-[3rem]',
            ].join(' ')}
          >
            <AnimatedNumber value={occupancyPercent} />
            <span className="text-[1.05rem] font-semibold text-jmu-purple-light">%</span>
          </p>
          <p className="mt-0.5 text-[13px] text-ink-muted">of capacity</p>
        </div>
        <div className="mb-1.5 h-9 w-px bg-border" />
        <div>
          <p
            className={[
              'font-semibold tabular-nums tracking-[-0.03em] text-ink',
              compact ? 'text-xl' : 'text-[1.55rem]',
            ].join(' ')}
          >
            ~<AnimatedNumber value={headcount} />
          </p>
          <p className="mt-0.5 text-[13px] text-ink-muted">people inside</p>
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-jmu-lavender-mid">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: accent }}
          initial={false}
          animate={{ width: `${occupancyPercent}%` }}
          transition={{ type: 'spring', stiffness: 110, damping: 22 }}
        />
      </div>
      <p className="mt-3 text-[11px] text-ink-subtle">Simulated demo data</p>
    </div>
  )
}
