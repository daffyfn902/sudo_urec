import { matchScenarioFromText, SCENARIO_PRESETS } from '../data/scenarios'
import {
  buildForecastResult,
  buildOverview,
  buildZoneForecast,
  findQuietestHourForZone,
} from '../data/mockData'
import type {
  ApiService,
  ForecastResult,
  GymOverview,
  GymZone,
  ScenarioKnobs,
  WorkoutPreference,
  ZoneDetails,
} from '../data/types'
import { GYM_ZONES, ZONE_BY_ID } from '../data/zones'
import { getSimulatedCurrentHour, todayISODate } from '../utils/time'
import { headcountFromPercent } from '../utils/traffic'

/**
 * Mock API service — swap implementations here for a FastAPI backend later.
 * Example: return fetch(`${BASE_URL}/occupancy`).then(r => r.json())
 */
const LATENCY_MS = 180

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), LATENCY_MS)
  })
}

export const api: ApiService = {
  async getCurrentOccupancy(scenarioId?: string | null): Promise<GymOverview> {
    return delay(buildOverview(getSimulatedCurrentHour(), scenarioId))
  },

  async getForecast(
    date: string,
    scenarioId?: string | null,
    preference: WorkoutPreference = 'any',
  ): Promise<ForecastResult> {
    return delay(buildForecastResult(date || todayISODate(), scenarioId, preference))
  },

  async getZoneDetails(
    zoneId: string,
    hour?: number,
    scenarioId?: string | null,
  ): Promise<ZoneDetails> {
    const zone = ZONE_BY_ID[zoneId]
    if (!zone) {
      throw new Error(`Unknown zone: ${zoneId}`)
    }

    const targetHour = hour ?? getSimulatedCurrentHour()
    const forecast = buildZoneForecast(zoneId, scenarioId)
    const point = forecast.find((f) => f.hour === targetHour) ?? forecast[0]
    const suggested = findQuietestHourForZone(zoneId, scenarioId)

    return delay({
      zone,
      occupancy: {
        zoneId,
        hour: targetHour,
        occupancyPercent: point.occupancyPercent,
        headcount: headcountFromPercent(zone.capacity, point.occupancyPercent),
        status: point.status,
      },
      forecast,
      suggestedHour: suggested.hour,
      suggestedLabel: suggested.label,
      isSimulated: true,
    })
  },

  async applyScenario(text: string): Promise<ScenarioKnobs | null> {
    // Deterministic mock — replace with POST /scenarios/interpret later
    return delay(matchScenarioFromText(text))
  },

  async getZones(): Promise<GymZone[]> {
    return delay([...GYM_ZONES])
  },

  async getScenarios(): Promise<ScenarioKnobs[]> {
    return delay([...SCENARIO_PRESETS])
  },
}
