import { motion } from 'framer-motion'
import { Check, Clock3, MapPinned, RefreshCw, Sparkles } from 'lucide-react'
import { ZONE_BY_ID } from '../../data/zones'
import type { RankedChallenge } from '../../data/types'
import { TrafficBadge } from '../ui/TrafficBadge'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  stretch: 'Stretch',
}

interface ChallengeCardProps {
  ranked: RankedChallenge
  completed?: boolean
  justCompleted?: boolean
  onPreviewMap: () => void
  onComplete: () => void
  onTryAnother: () => void
}

export function ChallengeCard({
  ranked,
  completed = false,
  justCompleted = false,
  onPreviewMap,
  onComplete,
  onTryAnother,
}: ChallengeCardProps) {
  const { challenge, crowdStatus, crowdOccupancyPercent } = ranked
  const zone = ZONE_BY_ID[challenge.zoneId]
  const reduceMotion = usePrefersReducedMotion()

  return (
    <motion.article
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="card-surface overflow-hidden"
      aria-labelledby={`challenge-${challenge.id}-title`}
    >
      <div className="border-b border-border bg-jmu-lavender/35 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="section-label text-jmu-purple">Your challenge</span>
          {challenge.beginnerFriendly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-jmu-purple">
              <Sparkles className="h-3 w-3" aria-hidden />
              Beginner-friendly
            </span>
          )}
        </div>
        <h2
          id={`challenge-${challenge.id}-title`}
          className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-ink"
        >
          {challenge.title}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
          {challenge.description}
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-jmu-lavender/70 px-2.5 py-1 text-[12px] font-semibold text-ink">
            <Clock3 className="h-3.5 w-3.5 text-jmu-purple-light" aria-hidden />
            ~{challenge.durationMinutes} min
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-muted">
            {DIFFICULTY_LABEL[challenge.difficulty] ?? challenge.difficulty}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-muted">
            <MapPinned className="h-3.5 w-3.5" aria-hidden />
            {zone?.label ?? challenge.zoneId}
            {zone ? ` · Fl. ${zone.floor}` : ''}
          </span>
          <TrafficBadge status={crowdStatus} size="sm" />
        </div>

        <p className="text-[13px] text-ink">
          Predicted crowd{' '}
          <span className="font-semibold tabular-nums">{crowdOccupancyPercent}%</span>
          <span className="text-ink-subtle"> · simulated</span>
        </p>

        <ol className="space-y-2.5">
          {challenge.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-[14px] leading-relaxed text-ink">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jmu-lavender text-[12px] font-semibold text-jmu-purple"
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="text-ink-muted">{step}</span>
            </li>
          ))}
        </ol>

        <p className="text-[12px] leading-relaxed text-ink-subtle">
          Go at your own pace. This is not professional coaching — skip or modify anything that
          does not feel right.
        </p>

        {justCompleted && (
          <motion.div
            role="status"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-[14px] border border-traffic-low/25 bg-traffic-low/10 px-3.5 py-3 text-[13px] font-medium text-emerald-800"
          >
            <Check className="h-4 w-4 shrink-0" aria-hidden />
            Nice work — challenge marked complete on this device.
          </motion.div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onPreviewMap}
            className="pressable inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-jmu-purple px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-jmu-purple-dark"
          >
            <MapPinned className="h-4 w-4" aria-hidden />
            Preview on Map
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={completed}
            className={[
              'pressable inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-[14px] font-semibold transition-colors',
              completed
                ? 'cursor-default border-traffic-low/30 bg-traffic-low/10 text-emerald-800'
                : 'border-border-strong bg-surface text-jmu-purple hover:bg-jmu-lavender',
            ].join(' ')}
          >
            <Check className="h-4 w-4" aria-hidden />
            {completed ? 'Completed' : 'Mark Complete'}
          </button>
        </div>

        <button
          type="button"
          onClick={onTryAnother}
          className="pressable inline-flex w-full items-center justify-center gap-2 rounded-[14px] py-2.5 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-jmu-lavender/60 hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Try Another
        </button>
      </div>
    </motion.article>
  )
}
