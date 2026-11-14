import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { GymOverview } from '../data/types'
import { getTrafficStatus } from '../utils/traffic'
import { sliderNow } from '../utils/time'

// One shared request, reused for a minute, so the sidebar and the Home page don't both hit the backend.
let cached: { at: number; promise: Promise<GymOverview> } | null = null

function fetchOverview(): Promise<GymOverview> {
  if (!cached || Date.now() - cached.at > 60_000) {
    cached = { at: Date.now(), promise: api.getCurrentOccupancy() }
  }
  return cached.promise
}

/**
 * "Right now" must agree with the map's time slider, which is drawn from the hourly forecast. The backend's overview
 * can instead come from a simulated live reading for the current hour, which differs from the forecast, so the
 * headline number is read off the forecast at the same moment the slider sits on "now".
 */
function syncWithForecast(data: GymOverview): GymOverview {
  const t = sliderNow()
  const h = Math.floor(t)
  const a = data.hourlyForecast.find((p) => p.hour === h)
  if (!a) return data
  const b = data.hourlyForecast.find((p) => p.hour === h + 1)
  const percent = Math.round(b ? a.occupancyPercent + (b.occupancyPercent - a.occupancyPercent) * (t - h) : a.occupancyPercent)
  const ratio = data.overallOccupancyPercent > 0 ? percent / data.overallOccupancyPercent : 1
  return {
    ...data,
    overallOccupancyPercent: percent,
    status: getTrafficStatus(percent),
    estimatedHeadcount: Math.round(data.estimatedHeadcount * ratio),
  }
}

export function useOverview() {
  const [overview, setOverview] = useState<GymOverview | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchOverview().then((data) => {
      if (!cancelled) setOverview(syncWithForecast(data))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { overview, loading: overview === null }
}
