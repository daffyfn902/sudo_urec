import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Clock3,
  Dumbbell,
  Footprints,
  Layers,
  MapPinned,
  Sparkles,
  Volleyball,
  X,
} from 'lucide-react'
import type { Challenge, ZoneDetails } from '../../data/types'
import { TrafficBadge } from './TrafficBadge'
import { ForecastChart } from './ForecastChart'
import { formatHour } from '../../utils/time'
import { useIsDesktop, usePrefersReducedMotion } from '../../hooks/useMediaQuery'

const ZONE_ICONS: Record<string, typeof Dumbbell> = {
  'free-weights': Dumbbell,
  cardio: Footprints,
  'basketball-courts': Volleyball,
  'upstairs-strength': Dumbbell,
  'indoor-track': Footprints,
  'functional-training': Layers,
}

interface ZoneDetailSheetProps {
  details: ZoneDetails | null
  challenge?: Challenge | null
  challengeCompleted?: boolean
  onClose: () => void
  onFindAlternative?: () => void
  onCompleteChallenge?: () => void
}

export function ZoneDetailSheet({
  details,
  challenge = null,
  challengeCompleted = false,
  onClose,
  onFindAlternative,
  onCompleteChallenge,
}: ZoneDetailSheetProps) {
  const isDesktop = useIsDesktop()
  const reduceMotion = usePrefersReducedMotion()

  return (
    <AnimatePresence>
      {details && (
        <>
          {!isDesktop && (
            <motion.button
              type="button"
              aria-label="Close zone details"
              className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
          )}
          <motion.aside
            key={`${details.zone.id}-${challenge?.id ?? 'zone'}`}
            role="dialog"
            aria-label={
              challenge
                ? `${challenge.title} in ${details.zone.label}`
                : `${details.zone.label} details`
            }
            className={
              isDesktop
                ? 'absolute right-4 top-4 bottom-28 z-40 flex w-[340px] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-float)]'
                : 'fixed inset-x-0 bottom-0 z-50 max-h-[78dvh] overflow-hidden rounded-t-3xl border border-border bg-surface shadow-[var(--shadow-sheet)] safe-bottom'
            }
            initial={
              reduceMotion
                ? false
                : isDesktop
                  ? { opacity: 0, x: 24 }
                  : { opacity: 0, y: '100%' }
            }
            animate={isDesktop ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
            exit={
              reduceMotion
                ? undefined
                : isDesktop
                  ? { opacity: 0, x: 24 }
                  : { opacity: 0, y: '100%' }
            }
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {!isDesktop && (
              <div className="flex justify-center pt-3">
                <div className="h-1 w-10 rounded-full bg-border-strong" />
              </div>
            )}

            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
              <div className="flex items-start gap-3">
                {(() => {
                  const Icon = ZONE_ICONS[details.zone.id] ?? MapPinned
                  return (
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-jmu-lavender text-jmu-purple">
                      <Icon className="h-5 w-5" />
                    </div>
                  )
                })()}
                <div>
                  <h2 className="text-lg font-bold text-ink">{details.zone.label}</h2>
                  <p className="text-xs text-ink-muted">
                    Floor {details.zone.floor} · {details.zone.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-ink-subtle hover:bg-jmu-lavender hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
              {challenge && (
                <div className="rounded-2xl border border-border-strong bg-jmu-lavender/50 px-4 py-3.5">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-jmu-purple">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Explore challenge
                  </p>
                  <h3 className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em] text-ink">
                    {challenge.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                    {challenge.description}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                    <Clock3 className="h-3.5 w-3.5 text-jmu-purple-light" aria-hidden />
                    ~{challenge.durationMinutes} min
                  </p>
                  <ol className="mt-3 space-y-2">
                    {challenge.steps.map((step, index) => (
                      <li key={step} className="flex gap-2.5 text-[13px] leading-snug text-ink-muted">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-jmu-purple"
                          aria-hidden
                        >
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-subtle">
                    Optional guidance only — not professional supervision. Occupancy is simulated.
                  </p>
                  {onCompleteChallenge && (
                    <button
                      type="button"
                      onClick={onCompleteChallenge}
                      disabled={challengeCompleted}
                      className={[
                        'mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition',
                        challengeCompleted
                          ? 'cursor-default bg-traffic-low/15 text-emerald-800'
                          : 'bg-jmu-purple text-white hover:bg-jmu-purple-dark',
                      ].join(' ')}
                    >
                      <Check className="h-4 w-4" aria-hidden />
                      {challengeCompleted ? 'Completed' : 'Mark Complete'}
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <TrafficBadge status={details.occupancy.status} />
                <span className="text-xs text-ink-subtle">
                  {formatHour(details.occupancy.hour)} · simulated
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'People', value: `~${details.occupancy.headcount}` },
                  { label: 'Occupied', value: `${details.occupancy.occupancyPercent}%` },
                  { label: 'Capacity', value: String(details.zone.capacity) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-jmu-lavender/60 px-3 py-3 text-center">
                    <p className="text-lg font-bold tabular-nums text-ink">{stat.value}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-ink">Hourly forecast</h3>
                  <span className="text-[11px] text-ink-subtle">Simulated</span>
                </div>
                <ForecastChart
                  data={details.forecast}
                  height={140}
                  compact
                  highlightHour={details.occupancy.hour}
                />
              </div>

              <div className="rounded-2xl border border-border bg-jmu-mist px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-jmu-purple">
                  Quieter time
                </p>
                <p className="mt-1 text-sm text-ink">
                  Try around <span className="font-semibold">{details.suggestedLabel}</span> for lower simulated traffic in this zone.
                </p>
              </div>

              {onFindAlternative && (
                <button
                  type="button"
                  onClick={onFindAlternative}
                  className="w-full rounded-2xl border border-border-strong bg-surface py-3 text-sm font-semibold text-jmu-purple transition hover:bg-jmu-lavender"
                >
                  Find an alternative area
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
