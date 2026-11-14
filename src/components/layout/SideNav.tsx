import { Link, NavLink } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { NAV_ITEMS } from './navItems'
import { useOverview } from '../../hooks/useOverview'
import { trafficColor, trafficLabel } from '../../utils/traffic'
import { formatHour } from '../../utils/time'

/** Desktop navigation: always visible, shows how busy the gym is right now. */
export function SideNav() {
  const { overview } = useOverview()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-white lg:flex"
      aria-label="Sidebar"
    >
      <Link to="/" className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-jmu-purple text-white">
          <Building2 className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-[-0.02em] text-ink">
            UREC Crowd Map
          </span>
          <span className="block text-[12px] text-ink-muted">James Madison University</span>
        </span>
      </Link>

      <nav className="px-3" aria-label="Primary">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-medium transition-colors',
                    isActive
                      ? 'bg-jmu-lavender text-jmu-purple'
                      : 'text-ink-muted hover:bg-jmu-mist hover:text-ink',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto space-y-3 p-4">
        {overview && (
          <Link
            to="/map"
            className="block rounded-[16px] border border-border bg-jmu-mist p-3.5 transition-colors hover:border-border-strong"
          >
            <p className="section-label">Right now · {formatHour(overview.currentHour)}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: trafficColor(overview.status) }}
                />
                {trafficLabel(overview.status)} traffic
              </span>
              <span className="text-[14px] font-semibold tabular-nums text-jmu-purple">
                {overview.overallOccupancyPercent}%
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-jmu-lavender-mid">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${overview.overallOccupancyPercent}%`,
                  backgroundColor: trafficColor(overview.status),
                }}
              />
            </div>
          </Link>
        )}
        <p className="px-1 text-[11px] leading-snug text-ink-subtle">
          Simulated demo data, not live UREC headcounts.
        </p>
      </div>
    </aside>
  )
}
