import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Compass, Dumbbell, Footprints, Shuffle, Sparkles, Volleyball } from 'lucide-react'
import { ChallengeCard } from '../components/explore/ChallengeCard'
import { useChallengeProgress } from '../hooks/useChallengeProgress'
import { buildAllZoneOccupancy } from '../data/mockData'
import type {
  ChallengeInterest,
  ComfortLevel,
  ExplorePreferences,
  RankedChallenge,
  ZoneOccupancy,
} from '../data/types'
import { pickRecommendation } from '../services/recommend'
import { getSimulatedCurrentHour } from '../utils/time'

const COMFORT_OPTIONS: Array<{
  id: ComfortLevel
  label: string
  hint: string
}> = [
  {
    id: 'getting-started',
    label: 'Just getting started',
    hint: 'Gentle intros in quieter-feeling spaces',
  },
  {
    id: 'ready-different',
    label: 'Ready to try something different',
    hint: 'Familiar enough — with a small twist',
  },
  {
    id: 'push-me',
    label: 'Push me out of my comfort zone',
    hint: 'A stretch — still yours to decline',
  },
]

const INTEREST_OPTIONS: Array<{
  id: ChallengeInterest
  label: string
  icon: typeof Dumbbell
}> = [
  { id: 'strength', label: 'Strength', icon: Dumbbell },
  { id: 'cardio', label: 'Cardio', icon: Footprints },
  { id: 'sports', label: 'Sports', icon: Volleyball },
  { id: 'surprise', label: 'Surprise me', icon: Shuffle },
]

function buildOccupancyMap(): Record<string, ZoneOccupancy> {
  const list = buildAllZoneOccupancy(getSimulatedCurrentHour())
  const map: Record<string, ZoneOccupancy> = {}
  for (const occ of list) map[occ.zoneId] = occ
  return map
}

export function ExplorePage() {
  const navigate = useNavigate()
  const { progress, complete, isComplete, completedCount, areasExplored } =
    useChallengeProgress()

  const [comfort, setComfort] = useState<ComfortLevel | null>(null)
  const [interest, setInterest] = useState<ChallengeInterest | null>(null)
  const [excludeIds, setExcludeIds] = useState<string[]>([])
  /** Keep the completed card visible until the student asks for another */
  const [pinnedRanked, setPinnedRanked] = useState<RankedChallenge | null>(null)
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)
  const [occupancyByZone] = useState(buildOccupancyMap)

  const preferences: ExplorePreferences | null = useMemo(() => {
    if (!comfort || !interest) return null
    return { comfort, interest }
  }, [comfort, interest])

  const ranked = useMemo(() => {
    if (!preferences) return null
    const result = pickRecommendation({
      preferences,
      occupancyByZone,
      completedIds: progress.completedIds,
      exploredZoneIds: progress.exploredZoneIds,
      excludeIds,
    })
    if (result) return result
    // Exhausted soft exclusions — cycle from the full eligible pool
    if (excludeIds.length === 0) return null
    return pickRecommendation({
      preferences,
      occupancyByZone,
      completedIds: progress.completedIds,
      exploredZoneIds: progress.exploredZoneIds,
      excludeIds: [],
    })
  }, [preferences, occupancyByZone, progress.completedIds, progress.exploredZoneIds, excludeIds])

  const displayed = pinnedRanked ?? ranked

  const resetDiscovery = () => {
    setExcludeIds([])
    setPinnedRanked(null)
    setJustCompletedId(null)
  }

  const handleTryAnother = () => {
    if (!displayed) return
    setJustCompletedId(null)
    setPinnedRanked(null)
    setExcludeIds((prev) => {
      const next = [...prev, displayed.challenge.id]
      // If the pool is empty after this exclusion, start a fresh cycle
      const probe = preferences
        ? pickRecommendation({
            preferences,
            occupancyByZone,
            completedIds: progress.completedIds,
            exploredZoneIds: progress.exploredZoneIds,
            excludeIds: next,
          })
        : null
      return probe ? next : [displayed.challenge.id]
    })
  }

  const handleComplete = () => {
    if (!displayed) return
    complete(displayed.challenge.id)
    setPinnedRanked(displayed)
    setJustCompletedId(displayed.challenge.id)
  }

  const handlePreviewMap = () => {
    if (!displayed) return
    navigate('/map', {
      state: {
        challengeId: displayed.challenge.id,
        zoneId: displayed.challenge.zoneId,
      },
    })
  }

  return (
    <div className="page-shell safe-top">
      <header className="mb-7">
        <p className="section-label text-jmu-purple">Explore Something New</p>
        <h1 className="page-title mt-1.5">Step outside your usual</h1>
        <p className="page-subtitle">
          Pick a comfort level and interest — we will suggest a short, low-pressure challenge in a
          real UREC zone. Occupancy is simulated.
        </p>
      </header>

      <div className="space-y-4">
        <section className="card-surface grid grid-cols-2 gap-3 p-4 sm:p-5" aria-label="Your progress">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
              Completed
            </p>
            <p className="mt-1 text-[1.5rem] font-semibold tabular-nums tracking-[-0.03em] text-ink">
              {completedCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
              Areas explored
            </p>
            <p className="mt-1 text-[1.5rem] font-semibold tabular-nums tracking-[-0.03em] text-ink">
              {areasExplored}
            </p>
          </div>
        </section>

        <section className="card-surface p-4 sm:p-5" aria-labelledby="comfort-heading">
          <h2 id="comfort-heading" className="section-label mb-3">
            How adventurous are you feeling?
          </h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="comfort-heading">
            {COMFORT_OPTIONS.map((option) => {
              const active = comfort === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setComfort(option.id)
                    resetDiscovery()
                  }}
                  className={[
                    'pressable rounded-[14px] border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-jmu-purple bg-jmu-purple text-white shadow-sm'
                      : 'border-border bg-surface text-ink hover:border-border-strong hover:bg-jmu-lavender/40',
                  ].join(' ')}
                >
                  <span className="block text-[14px] font-semibold tracking-[-0.01em]">
                    {option.label}
                  </span>
                  <span
                    className={[
                      'mt-0.5 block text-[12px] leading-snug',
                      active ? 'text-white/70' : 'text-ink-muted',
                    ].join(' ')}
                  >
                    {option.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="card-surface p-4 sm:p-5" aria-labelledby="interest-heading">
          <h2 id="interest-heading" className="section-label mb-3">
            What interests you?
          </h2>
          <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-labelledby="interest-heading"
          >
            {INTEREST_OPTIONS.map(({ id, label, icon: Icon }) => {
              const active = interest === id
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setInterest(id)
                    resetDiscovery()
                  }}
                  className={[
                    'pressable inline-flex items-center gap-2 rounded-[14px] border px-3.5 py-3 text-[14px] font-semibold transition-all',
                    active
                      ? 'border-jmu-purple bg-jmu-purple text-white shadow-sm'
                      : 'border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        {!preferences && (
          <div className="card-surface flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-jmu-lavender text-jmu-purple">
              <Compass className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
              Answer both questions
            </h2>
            <p className="mt-1.5 max-w-[18rem] text-[14px] leading-relaxed text-ink-muted">
              We will match you with a short challenge you can preview on the 3D map.
            </p>
          </div>
        )}

        {preferences && !displayed && (
          <div className="card-surface px-5 py-8 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-jmu-purple" aria-hidden />
            <p className="mt-3 text-[14px] text-ink-muted">
              No open challenges match that mix right now. Try another interest, or mark fewer
              complete.
            </p>
            <Link
              to="/map"
              className="mt-4 inline-block text-[13px] font-semibold text-jmu-purple hover:underline"
            >
              Browse the map instead
            </Link>
          </div>
        )}

        {displayed && (
          <ChallengeCard
            ranked={displayed}
            completed={isComplete(displayed.challenge.id)}
            justCompleted={justCompletedId === displayed.challenge.id}
            onPreviewMap={handlePreviewMap}
            onComplete={handleComplete}
            onTryAnother={handleTryAnother}
          />
        )}
      </div>
    </div>
  )
}
