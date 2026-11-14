import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Compass } from 'lucide-react'
import { WorkoutPreferenceSelector } from '../components/ui/WorkoutPreferenceSelector'
import { ForecastChart } from '../components/ui/ForecastChart'
import { RecommendationCard } from '../components/ui/RecommendationCard'
import { ScenarioInput } from '../components/ui/ScenarioInput'
import { api } from '../services/api'
import { useSavedPlans } from '../hooks/useSavedPlans'
import type { ForecastResult, ScenarioKnobs, WorkoutPreference } from '../data/types'
import { GYM_ZONES } from '../data/zones'
import { PageHeader } from '../components/layout/PageHeader'
import { shiftISODate, todayISODate } from '../utils/time'

export function PlanPage() {
  const [date, setDate] = useState(todayISODate)
  const [preference, setPreference] = useState<WorkoutPreference>('any')
  const [scenarioId, setScenarioId] = useState<string | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioKnobs[]>([])
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedFlash, setSavedFlash] = useState(false)
  const { save } = useSavedPlans()

  useEffect(() => {
    void api.getScenarios().then(setScenarios)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void api.getForecast(date, scenarioId, preference).then((result) => {
      if (!cancelled) {
        setForecast(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [date, preference, scenarioId])

  const handleSave = () => {
    if (!forecast) return
    const recommended = forecast.recommendedWindow
    const matchingZones = GYM_ZONES.filter(
      (z) => preference === 'any' || z.preference === preference,
    )
    const quietest = matchingZones
      .map((z) => {
        const occ =
          forecast.zoneForecasts[z.id]?.find((f) => f.hour === recommended.startHour)
            ?.occupancyPercent ?? 100
        return { zone: z, occ }
      })
      .sort((a, b) => a.occ - b.occ)[0]

    save({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      date,
      timeLabel: recommended.label,
      hour: recommended.startHour,
      preference,
      expectedCrowdLevel: recommended.expectedStatus,
      expectedOccupancyPercent: recommended.expectedOccupancyPercent,
      recommendedZoneId: quietest?.zone.id,
      recommendedZoneLabel: quietest?.zone.label,
      scenarioId: forecast.scenario?.id,
      scenarioLabel: forecast.scenario?.label,
    })
    setSavedFlash(true)
    globalThis.setTimeout(() => setSavedFlash(false), 1800)
  }

  const today = todayISODate()
  const days = Array.from({ length: 7 }, (_, i) => shiftISODate(today, i))
  const activeScenario = scenarios.find((s) => s.id === scenarioId)

  return (
    <div className="page-shell safe-top">
      <PageHeader
        eyebrow="Plan"
        title="Find your best time"
        subtitle="Pick a day and what you plan to do. We'll suggest the quietest window."
      />

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-6">
        {/* Choices */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <section className="card-surface p-4 sm:p-5" aria-labelledby="day-heading">
            <h2 id="day-heading" className="section-label mb-3">
              Day
            </h2>
            <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Choose a day">
              {days.map((iso) => {
                const d = new Date(`${iso}T12:00:00`)
                const active = iso === date
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setDate(iso)}
                    aria-pressed={active}
                    aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    className={[
                      'pressable flex flex-col items-center rounded-[12px] border py-2 transition-colors',
                      active
                        ? 'border-jmu-purple bg-jmu-purple text-white shadow-sm'
                        : 'border-border bg-surface text-ink hover:border-border-strong hover:bg-jmu-lavender/40',
                    ].join(' ')}
                  >
                    <span className={['text-[10px] font-semibold uppercase', active ? 'text-white/75' : 'text-ink-subtle'].join(' ')}>
                      {iso === today ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="mt-0.5 text-[15px] font-semibold tabular-nums">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>
            <label className="mt-3 flex items-center justify-between gap-3 text-[12px] text-ink-muted">
              Another date
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="rounded-[10px] border border-border bg-jmu-mist px-2.5 py-1.5 text-[13px] text-ink"
              />
            </label>
          </section>

          <section className="card-surface p-4 sm:p-5" aria-labelledby="pref-heading">
            <h2 id="pref-heading" className="section-label mb-3">
              Workout style
            </h2>
            <WorkoutPreferenceSelector value={preference} onChange={setPreference} />
          </section>

          <details className="card-surface group" open={Boolean(scenarioId)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="card-title block">What if…</span>
                <span className="mt-0.5 block text-[12px] text-ink-muted">
                  {activeScenario ? `Using “${activeScenario.label}”` : 'Finals week, rain, breaks and more'}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-border p-4 sm:p-5">
              <ScenarioInput
                compact
                scenarios={scenarios}
                activeScenarioId={scenarioId}
                onSelectScenario={setScenarioId}
                onApplyText={async (text) => {
                  const matched = await api.applyScenario(text)
                  if (matched) {
                    setScenarioId(matched.id === 'normal' ? null : matched.id)
                  }
                  return matched
                }}
              />
            </div>
          </details>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {loading || !forecast ? (
            <>
              <div className="card-surface h-48 animate-pulse bg-jmu-lavender/40" />
              <div className="card-surface h-60 animate-pulse bg-jmu-lavender/30" />
            </>
          ) : (
            <>
              <RecommendationCard
                label={forecast.recommendedWindow.label}
                reason={forecast.recommendedWindow.reason}
                expectedStatus={forecast.recommendedWindow.expectedStatus}
                expectedOccupancyPercent={forecast.recommendedWindow.expectedOccupancyPercent}
                action={
                  <button type="button" onClick={handleSave} className="btn-primary w-full">
                    {savedFlash ? (
                      <>
                        <Check className="h-4 w-4" /> Saved
                      </>
                    ) : (
                      'Save plan'
                    )}
                  </button>
                }
              />

              <ForecastChart
                title="Crowd through the day"
                data={forecast.overview.hourlyForecast}
                height={220}
                highlightHour={forecast.recommendedWindow.startHour}
                highlightLabel="Best"
              />

              <Link
                to="/explore"
                className="pressable card-surface flex items-center gap-3 px-4 py-4 transition-colors hover:border-border-strong hover:bg-jmu-lavender/30"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-jmu-lavender text-jmu-purple">
                  <Compass className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="card-title">Explore something new</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">Try a beginner-friendly challenge in another zone</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
