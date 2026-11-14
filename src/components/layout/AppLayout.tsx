import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNavigation } from './BottomNavigation'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'

export function AppLayout() {
  const location = useLocation()
  const reduceMotion = usePrefersReducedMotion()
  const isMap = location.pathname === '/map'

  return (
    <div className={isMap ? 'relative min-h-dvh w-full' : 'relative mx-auto min-h-dvh w-full'}>
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className={isMap ? 'h-dvh' : 'min-h-dvh pb-[5.25rem]'}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <BottomNavigation mapMode={isMap} />
    </div>
  )
}
