import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import type {
  ForecastResult,
  GymOverview,
  GymZone,
  ScenarioKnobs,
  WorkoutPreference,
  ZoneDetails,
  ZoneOccupancy,
} from '../data/types'
import { getSimulatedCurrentHour, todayISODate } from '../utils/time'
import { headcountFromPercent } from '../utils/traffic'

/** Each zone's occupancy at one hour, read from a day's forecast (backend or mock). */
export function zoneOccupancyAt(
  forecast: ForecastResult | null,
  zones: GymZone[],
  hour: number,
): ZoneOccupancy[] {
  if (!forecast) return []
  return zones.flatMap((zone) => {
    const point = forecast.zoneForecasts[zone.id]?.find((f) => f.hour === hour)
    if (!point) return []
    return [
      {
        zoneId: zone.id,
        hour,
        occupancyPercent: point.occupancyPercent,
        headcount: headcountFromPercent(zone.capacity, point.occupancyPercent),
        status: point.status,
      },
    ]
  })
}

interface UseGymDataOptions {
  preference?: WorkoutPreference
  initialScenarioId?: string | null
}

export function useGymData(options: UseGymDataOptions = {}) {
  const { preference = 'any', initialScenarioId = null } = options

  const [zones, setZones] = useState<GymZone[]>([])
  const [scenarios, setScenarios] = useState<ScenarioKnobs[]>([])
  const [scenarioId, setScenarioId] = useState<string | null>(initialScenarioId)
  const [selectedHour, setSelectedHour] = useState(getSimulatedCurrentHour)
  const [overview, setOverview] = useState<GymOverview | null>(null)
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [zoneDetails, setZoneDetails] = useState<ZoneDetails | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [zoneList, scenarioList, forecastResult] = await Promise.all([
        api.getZones(),
        api.getScenarios(),
        api.getForecast(todayISODate(), scenarioId, preference),
      ])
      setZones(zoneList)
      setScenarios(scenarioList)
      setForecast(forecastResult)
    } finally {
      setLoading(false)
    }
  }, [preference, scenarioId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    void api.getCurrentOccupancy(scenarioId, selectedHour).then((data) => {
      if (!cancelled) setOverview(data)
    })
    return () => {
      cancelled = true
    }
  }, [selectedHour, scenarioId])

  useEffect(() => {
    if (!selectedZoneId) {
      setZoneDetails(null)
      return
    }
    let cancelled = false
    void api.getZoneDetails(selectedZoneId, selectedHour, scenarioId).then((details) => {
      if (!cancelled) setZoneDetails(details)
    })
    return () => {
      cancelled = true
    }
  }, [selectedZoneId, selectedHour, scenarioId])

  const zoneOccupancy: ZoneOccupancy[] = useMemo(
    () => zoneOccupancyAt(forecast, zones, selectedHour),
    [forecast, zones, selectedHour],
  )

  const occupancyByZone = useMemo(() => {
    const map: Record<string, ZoneOccupancy> = {}
    for (const occ of zoneOccupancy) {
      map[occ.zoneId] = occ
    }
    return map
  }, [zoneOccupancy])

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === scenarioId) ?? null,
    [scenarios, scenarioId],
  )

  const resetToNow = useCallback(() => {
    setSelectedHour(getSimulatedCurrentHour())
  }, [])

  const applyScenarioText = useCallback(async (text: string) => {
    const matched = await api.applyScenario(text)
    if (matched) {
      setScenarioId(matched.id === 'normal' ? null : matched.id)
      return matched
    }
    return null
  }, [])

  return {
    zones,
    scenarios,
    scenarioId,
    setScenarioId,
    activeScenario,
    selectedHour,
    setSelectedHour,
    resetToNow,
    overview,
    forecast,
    loading,
    zoneOccupancy,
    occupancyByZone,
    selectedZoneId,
    setSelectedZoneId,
    zoneDetails,
    applyScenarioText,
    refresh,
  }
}
