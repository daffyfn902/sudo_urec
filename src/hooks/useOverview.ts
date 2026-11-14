import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { GymOverview } from '../data/types'

// One shared request, reused for a minute, so the sidebar and the Home page don't both hit the backend.
let cached: { at: number; promise: Promise<GymOverview> } | null = null

function fetchOverview(): Promise<GymOverview> {
  if (!cached || Date.now() - cached.at > 60_000) {
    cached = { at: Date.now(), promise: api.getCurrentOccupancy() }
  }
  return cached.promise
}

export function useOverview() {
  const [overview, setOverview] = useState<GymOverview | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchOverview().then((data) => {
      if (!cancelled) setOverview(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { overview, loading: overview === null }
}
