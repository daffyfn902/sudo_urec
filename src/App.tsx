import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { PlanPage } from './pages/PlanPage'
import { SavedPage } from './pages/SavedPage'

const MapPage = lazy(() =>
  import('./pages/MapPage').then((m) => ({ default: m.MapPage })),
)

function MapFallback() {
  return (
    <div className="flex h-dvh items-center justify-center bg-[#E9EDF4]">
      <div className="card-surface px-5 py-3 text-[13px] text-ink-muted">Loading UREC…</div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="map"
            element={
              <Suspense fallback={<MapFallback />}>
                <MapPage />
              </Suspense>
            }
          />
          <Route path="plan" element={<PlanPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
