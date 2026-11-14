import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { WorkoutPreferenceSelector } from '../components/ui/WorkoutPreferenceSelector'
import { ForecastChart } from '../components/ui/ForecastChart'
import { RecommendationCard } from '../components/ui/RecommendationCard'
import { ScenarioInput } from '../components/ui/ScenarioInput'
import { api } from '../services/api'
import { useSavedPlans } from '../hooks/useSavedPlans'
import type { ForecastResult, ScenarioKnobs, WorkoutPreference } from '../data/types'
import { GYM_ZONES } from '../data/zones'
import { formatDisplayDate, todayISODate } from '../utils/time'

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

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

  return (
    <div className="safe-top px-4 pb-4 pt-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Best time to visit</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Pick a day and workout style. We&apos;ll recommend a quieter simulated window.
        </p>
      </header>

      <div className="space-y-4">
        <section className="card-surface p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Day</p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setDate((d) => shiftDate(d, -1))}
              className="rounded-xl p-2 text-ink-muted hover:bg-jmu-lavender hover:text-ink"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-lg font-bold text-ink">{formatDisplayDate(date)}</p>
              {date === todayISODate() && (
                <p className="text-xs font-medium text-jmu-purple">Today</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDate((d) => shiftDate(d, 1))}
              className="rounded-xl p-2 text-ink-muted hover:bg-jmu-lavender hover:text-ink"
              aria-label="Next day"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="card-surface p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Workout preference
          </p>
          <WorkoutPreferenceSelector value={preference} onChange={setPreference} />
        </section>

        <ScenarioInput
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

        {loading || !forecast ? (
          <div className="card-surface h-48 animate-pulse bg-jmu-lavender/40" />
        ) : (
          <>
            <RecommendationCard
              label={forecast.recommendedWindow.label}
              reason={forecast.recommendedWindow.reason}
              expectedStatus={forecast.recommendedWindow.expectedStatus}
              expectedOccupancyPercent={forecast.recommendedWindow.expectedOccupancyPercent}
              action={
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-jmu-purple py-3 text-sm font-semibold text-white transition hover:bg-jmu-purple-dark"
                >
                  {savedFlash ? (
                    <>
                      <Check className="h-4 w-4" /> Saved
                    </>
                  ) : (
                    'Save Plan'
                  )}
                </button>
              }
            />

            <ForecastChart
              data={forecast.overview.hourlyForecast}
              height={170}
              highlightHour={forecast.recommendedWindow.startHour}
            />
          </>
        )}
      </div>
    </div>
  )
}
