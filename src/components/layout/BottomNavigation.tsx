import { NavLink } from 'react-router-dom'
import { Bookmark, CalendarClock, Compass, Home, Map, Users } from 'lucide-react'
import { motion } from 'framer-motion'

const links: Array<{
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}> = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/plan', label: 'Plan', icon: CalendarClock },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/friends', label: 'Friends', icon: Users },
]

interface BottomNavigationProps {
  mapMode?: boolean
}

export function BottomNavigation({ mapMode = false }: BottomNavigationProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 shadow-[var(--shadow-nav)] backdrop-blur-xl safe-bottom"
      aria-label="Primary"
    >
      <ul
        className={[
          'mx-auto flex items-stretch justify-around px-2 pt-1.5 pb-1',
          mapMode ? 'max-w-md' : 'max-w-lg',
        ].join(' ')}
      >
        {links.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'relative flex flex-col items-center gap-0.5 rounded-[12px] px-2 py-2 text-[10px] font-semibold tracking-wide transition-colors',
                  isActive ? 'text-jmu-purple' : 'text-ink-subtle hover:text-ink-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-[12px] bg-jmu-lavender"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon
                    className="relative z-10 h-[21px] w-[21px]"
                    strokeWidth={isActive ? 2.3 : 1.7}
                  />
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
