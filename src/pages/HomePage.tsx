import { Link } from 'react-router-dom'
import { ArrowRight, Flame, Map } from 'lucide-react'
import { useEffect, useState } from 'react'
import { OccupancyCard } from '../components/ui/OccupancyCard'
import { ForecastChart } from '../components/ui/ForecastChart'
import { TrafficBadge } from '../components/ui/TrafficBadge'
import { api } from '../services/api'
import type { GymOverview } from '../data/types'
import { formatHour } from '../utils/time'

export function HomePage() {
  const [overview, setOverview] = useState<GymOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void api.getCurrentOccupancy().then((data) => {
      if (!cancelled) {
        setOverview(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="safe-top px-4 pb-4 pt-6 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-jmu-purple">
          James Madison University
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          UREC Crowd Map
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          See how crowded UREC feels right now — and find a quieter time to train.
        </p>
      </header>

      {loading || !overview ? (
        <div className="space-y-4">
          <div className="card-surface h-48 animate-pulse bg-jmu-lavender/50" />
          <div className="card-surface h-36 animate-pulse bg-jmu-lavender/40" />
          <div className="card-surface h-44 animate-pulse bg-jmu-lavender/30" />
        </div>
      ) : (
        <div className="space-y-4">
          <OccupancyCard
            status={overview.status}
            occupancyPercent={overview.overallOccupancyPercent}
            headcount={overview.estimatedHeadcount}
            hourLabel={formatHour(overview.currentHour)}
          />

          <section className="card-surface p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-jmu-purple" />
              <h2 className="text-sm font-semibold text-ink">Busiest zones</h2>
            </div>
            <ul className="space-y-2.5">
              {overview.busiestZones.map((zone, index) => (
                <li
                  key={zone.zoneId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-jmu-lavender/50 px-3.5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs font-bold text-jmu-purple">
                      {index + 1}
                    </span>
                    <span className="font-medium text-ink">{zone.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {zone.occupancyPercent}%
                    </span>
                    <TrafficBadge status={zone.status} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <ForecastChart data={overview.hourlyForecast} height={150} highlightHour={overview.currentHour} />

          <Link
            to="/map"
            className="group flex items-center justify-between rounded-2xl bg-jmu-purple px-5 py-4 text-white shadow-[var(--shadow-float)] transition hover:bg-jmu-purple-dark active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Map className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Explore 3D UREC</p>
                <p className="text-xs text-white/70">Interactive map · simulated traffic</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
