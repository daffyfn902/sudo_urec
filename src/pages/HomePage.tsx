import { Link } from 'react-router-dom'
import { ArrowUpRight, Compass } from 'lucide-react'
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
    <div className="page-shell safe-top">
      <header className="mb-7">
        <p className="section-label text-jmu-purple">JMU UREC</p>
        <h1 className="page-title mt-1.5">Crowd Map</h1>
        <p className="page-subtitle">
          See how crowded the gym feels — and find a quieter time to train.
        </p>
      </header>

      {loading || !overview ? (
        <div className="space-y-4">
          <div className="card-surface h-44 animate-pulse bg-jmu-lavender/40" />
          <div className="card-surface h-32 animate-pulse bg-jmu-lavender/30" />
          <div className="card-surface h-40 animate-pulse bg-jmu-lavender/25" />
        </div>
      ) : (
        <div className="space-y-4">
          <OccupancyCard
            status={overview.status}
            occupancyPercent={overview.overallOccupancyPercent}
            headcount={overview.estimatedHeadcount}
            hourLabel={formatHour(overview.currentHour)}
          />

          <Link
            to="/map"
            className="pressable group flex items-center justify-between rounded-[18px] bg-jmu-purple px-5 py-4 text-white shadow-[var(--shadow-float)] transition-colors hover:bg-jmu-purple-dark"
          >
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em]">Explore 3D UREC</p>
              <p className="mt-0.5 text-[12px] text-white/65">Interactive map · simulated</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/20">
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
            </span>
          </Link>

          <Link
            to="/explore"
            className="pressable group card-surface flex items-center justify-between px-5 py-4 transition-colors hover:border-border-strong hover:bg-jmu-lavender/30"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[12px] bg-jmu-lavender text-jmu-purple">
                <Compass className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
                  Explore Something New
                </p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  Gentle challenges to try unfamiliar zones
                </p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-subtle transition group-hover:text-jmu-purple" />
          </Link>

          <section className="card-surface p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
                Busiest zones
              </h2>
              <span className="text-[11px] text-ink-subtle">Simulated</span>
            </div>
            <ul className="divide-y divide-border">
              {overview.busiestZones.map((zone, index) => (
                <li
                  key={zone.zoneId}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-4 text-[13px] font-semibold tabular-nums text-ink-subtle">
                      {index + 1}
                    </span>
                    <span className="text-[14px] font-medium text-ink">{zone.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold tabular-nums text-ink">
                      {zone.occupancyPercent}%
                    </span>
                    <TrafficBadge status={zone.status} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <ForecastChart
            data={overview.hourlyForecast}
            height={148}
            highlightHour={overview.currentHour}
          />
        </div>
      )}
    </div>
  )
}
