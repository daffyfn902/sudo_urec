import { Link } from 'react-router-dom'
import { ArrowRight, Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TrafficBadge } from './TrafficBadge'
import { api } from '../../services/api'
import type { ForecastResult } from '../../data/types'
import { todayISODate } from '../../utils/time'

/** The quietest window today, so the main question ("when should I go?") is answered on the Home page. */
export function BestTimeCard() {
  const [forecast, setForecast] = useState<ForecastResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void api.getForecast(todayISODate(), null, 'any').then((result) => {
      if (!cancelled) setForecast(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!forecast) return <div className="card-surface h-full min-h-44 animate-pulse bg-jmu-lavender/40" />

  const win = forecast.recommendedWindow
  return (
    <section className="card-surface flex h-full flex-col p-5 sm:p-6" aria-labelledby="best-time-heading">
      <p id="best-time-heading" className="section-label text-jmu-purple">
        Best time today
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        <p className="flex items-center gap-2 text-[1.5rem] font-semibold tracking-[-0.03em] text-ink">
          <Clock3 className="h-5 w-5 text-jmu-purple-light" aria-hidden />
          {win.label}
        </p>
        <TrafficBadge status={win.expectedStatus} />
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{win.reason}</p>
      <p className="mt-2 text-[13px] text-ink">
        Expected <span className="font-semibold tabular-nums">{win.expectedOccupancyPercent}%</span>
        <span className="text-ink-subtle"> · simulated</span>
      </p>
      <Link to="/plan" className="btn-ghost mt-auto self-start">
        Plan around it
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  )
}
