import { NavLink } from 'react-router-dom'
import { Bookmark, CalendarClock, Home, Map } from 'lucide-react'
import { motion } from 'framer-motion'

const links: Array<{
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}> = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/plan', label: 'Plan', icon: CalendarClock },
  { to: '/saved', label: 'Saved', icon: Bookmark },
]

export function BottomNavigation() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-elevated/95 backdrop-blur-xl safe-bottom md:left-1/2 md:max-w-lg md:-translate-x-1/2 md:rounded-t-3xl md:border md:border-b-0 md:shadow-[var(--shadow-float)]"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-jmu-purple' : 'text-ink-subtle hover:text-ink-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-jmu-lavender"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative z-10 h-[22px] w-[22px]" strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className="relative z-10">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
