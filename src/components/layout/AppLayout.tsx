import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNavigation } from './BottomNavigation'
import { SideNav } from './SideNav'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'

export function AppLayout() {
  const location = useLocation()
  const reduceMotion = usePrefersReducedMotion()
  const isMap = location.pathname === '/map'

  return (
    <div className="relative min-h-dvh w-full lg:pl-64">
      <SideNav />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className={isMap ? 'h-dvh' : 'min-h-dvh pb-[5.25rem] lg:pb-0'}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <BottomNavigation />
    </div>
  )
}
