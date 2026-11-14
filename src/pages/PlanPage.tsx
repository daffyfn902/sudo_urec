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
    <div className="page-shell safe-top">
      <header className="mb-7">
        <h1 className="page-title">Best time</h1>
        <p className="page-subtitle">
          Choose a day and workout style for a quieter simulated window.
        </p>
      </header>

      <div className="space-y-4">
        <section className="card-surface p-4 sm:p-5">
          <p className="section-label mb-3">Day</p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setDate((d) => shiftDate(d, -1))}
              className="pressable rounded-full p-2.5 text-ink-muted hover:bg-jmu-lavender hover:text-ink"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
                {formatDisplayDate(date)}
              </p>
              {date === todayISODate() && (
                <p className="mt-0.5 text-[12px] font-medium text-jmu-purple">Today</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDate((d) => shiftDate(d, 1))}
              className="pressable rounded-full p-2.5 text-ink-muted hover:bg-jmu-lavender hover:text-ink"
              aria-label="Next day"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="card-surface p-4 sm:p-5">
          <p className="section-label mb-3">Preference</p>
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
                  className="pressable inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-jmu-purple py-3 text-[14px] font-semibold text-white transition-colors hover:bg-jmu-purple-dark"
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
