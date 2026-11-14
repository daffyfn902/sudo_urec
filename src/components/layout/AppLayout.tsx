import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNavigation } from './BottomNavigation'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'

export function AppLayout() {
  const location = useLocation()
  const reduceMotion = usePrefersReducedMotion()
  const isMap = location.pathname === '/map'

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-5xl">
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={isMap ? 'h-dvh' : 'min-h-dvh pb-24'}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <BottomNavigation />
    </div>
  )
}
