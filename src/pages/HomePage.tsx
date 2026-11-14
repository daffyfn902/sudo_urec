import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, Compass, Map as MapIcon } from 'lucide-react'
import { AskBox } from '../components/ui/AskBox'
import { BestTimeCard } from '../components/ui/BestTimeCard'
import { FriendsHereCard } from '../components/social/FriendsHereCard'
import { ForecastChart } from '../components/ui/ForecastChart'
import { OccupancyCard } from '../components/ui/OccupancyCard'
import { TrafficBadge } from '../components/ui/TrafficBadge'
import { PageHeader } from '../components/layout/PageHeader'
import { useOverview } from '../hooks/useOverview'
import { formatHour } from '../utils/time'

const QUICK_LINKS = [
  { to: '/map', label: '3D map', hint: 'See every zone', icon: MapIcon },
  { to: '/plan', label: 'Plan a visit', hint: 'Find a quiet window', icon: CalendarClock },
  { to: '/explore', label: 'Explore', hint: 'Try something new', icon: Compass },
] as const

function greeting(): string {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function HomePage() {
  const { overview, loading } = useOverview()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="page-shell safe-top">
      <PageHeader
        eyebrow={today}
        title={greeting()}
        subtitle="See how busy the UREC is right now, and find a quieter time to train."
        actions={
          <Link to="/map" className="btn-primary hidden sm:inline-flex">
            <MapIcon className="h-4 w-4" aria-hidden />
            Open 3D map
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {loading || !overview ? (
            <div className="card-surface h-56 animate-pulse bg-jmu-lavender/40" />
          ) : (
            <OccupancyCard
              status={overview.status}
              occupancyPercent={overview.overallOccupancyPercent}
              headcount={overview.estimatedHeadcount}
              hourLabel={formatHour(overview.currentHour)}
            />
          )}
        </div>
        <div className="lg:col-span-2">
          <BestTimeCard />
        </div>
      </div>

      <nav className="mt-4 grid grid-cols-3 gap-3" aria-label="Quick links">
        {QUICK_LINKS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="pressable card-surface group flex flex-col gap-2 p-3.5 transition-colors hover:border-border-strong hover:bg-jmu-lavender/30 sm:flex-row sm:items-center sm:gap-3 sm:p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-jmu-lavender text-jmu-purple">
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold tracking-[-0.01em] text-ink">{label}</span>
              <span className="block truncate text-[12px] text-ink-muted">{hint}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-4 space-y-4">
        <AskBox />
        {/* Hidden by the card itself when the friends database is offline */}
        <FriendsHereCard />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {loading || !overview ? (
            <div className="card-surface h-64 animate-pulse bg-jmu-lavender/30" />
          ) : (
            <ForecastChart
              title="Today's forecast"
              data={overview.hourlyForecast}
              height={196}
              highlightHour={overview.currentHour}
              highlightLabel="Now"
            />
          )}
        </div>

        <section className="card-surface p-4 sm:p-5 lg:col-span-2" aria-labelledby="busiest-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="busiest-heading" className="card-title">
              Busiest zones now
            </h2>
            <Link to="/map" className="inline-flex items-center gap-1 text-[12px] font-semibold text-jmu-purple hover:underline">
              See map <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
          {loading || !overview ? (
            <div className="h-40 animate-pulse rounded-xl bg-jmu-lavender/30" />
          ) : (
            <ul className="divide-y divide-border">
              {overview.busiestZones.map((zone, index) => (
                <li key={zone.zoneId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-4 text-[13px] font-semibold tabular-nums text-ink-subtle">{index + 1}</span>
                    <span className="truncate text-[14px] font-medium text-ink">{zone.label}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[13px] font-semibold tabular-nums text-ink">{zone.occupancyPercent}%</span>
                    <TrafficBadge status={zone.status} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
