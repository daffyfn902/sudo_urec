import { SCENARIO_PRESETS } from './scenarios'
import type {
  ForecastResult,
  GymOverview,
  HourlyForecast,
  ScenarioKnobs,
  WorkoutPreference,
  ZoneOccupancy,
} from './types'
import { GYM_ZONES } from './zones'
import {
  clampOccupancy,
  getTrafficStatus,
  headcountFromPercent,
} from '../utils/traffic'
import {
  CLOSE_HOUR,
  formatHour,
  formatHourRange,
  getSimulatedCurrentHour,
  hoursInDay,
  OPEN_HOUR,
} from '../utils/time'

/** Base occupancy curves by zone preference — peaks around lunch and evening */
const BASE_CURVES: Record<string, number[]> = {
  'free-weights': [18, 22, 35, 48, 42, 38, 55, 68, 72, 78, 70, 58, 48, 42, 38, 28, 18],
  cardio: [28, 40, 52, 45, 38, 42, 58, 72, 80, 76, 65, 50, 42, 38, 32, 24, 16],
  'basketball-courts': [12, 18, 25, 30, 35, 48, 62, 70, 75, 68, 55, 72, 78, 65, 48, 30, 18],
  'upstairs-strength': [15, 20, 32, 45, 40, 35, 50, 62, 68, 72, 60, 48, 40, 35, 30, 22, 14],
  'indoor-track': [22, 35, 48, 40, 32, 30, 45, 55, 60, 58, 48, 40, 35, 42, 38, 25, 15],
  'functional-training': [14, 18, 28, 40, 38, 35, 48, 60, 65, 70, 58, 45, 38, 32, 28, 20, 12],
}

function getScenario(scenarioId?: string | null): ScenarioKnobs {
  return SCENARIO_PRESETS.find((s) => s.id === scenarioId) ?? SCENARIO_PRESETS[0]
}

function applyScenarioToPercent(
  base: number,
  hour: number,
  zoneId: string,
  scenario: ScenarioKnobs,
): number {
  let value = base * scenario.occupancyMultiplier

  if (scenario.peakBoostHours.includes(hour)) {
    value += scenario.peakBoostAmount
  }

  if (scenario.hotZones?.includes(zoneId) && scenario.hotZoneBoost) {
    value += scenario.hotZoneBoost
  }

  return clampOccupancy(value)
}

export function buildZoneForecast(
  zoneId: string,
  scenarioId?: string | null,
): HourlyForecast[] {
  const scenario = getScenario(scenarioId)
  const curve = BASE_CURVES[zoneId] ?? BASE_CURVES['free-weights']
  const hours = hoursInDay()

  return hours.map((hour, index) => {
    const base = curve[index] ?? 30
    const occupancyPercent = applyScenarioToPercent(base, hour, zoneId, scenario)
    return {
      hour,
      label: formatHour(hour),
      occupancyPercent,
      status: getTrafficStatus(occupancyPercent),
    }
  })
}

export function buildAllZoneOccupancy(
  hour: number,
  scenarioId?: string | null,
): ZoneOccupancy[] {
  return GYM_ZONES.map((zone) => {
    const forecast = buildZoneForecast(zone.id, scenarioId)
    const point = forecast.find((f) => f.hour === hour) ?? forecast[0]
    return {
      zoneId: zone.id,
      hour,
      occupancyPercent: point.occupancyPercent,
      headcount: headcountFromPercent(zone.capacity, point.occupancyPercent),
      status: point.status,
    }
  })
}

export function buildOverview(
  hour = getSimulatedCurrentHour(),
  scenarioId?: string | null,
): GymOverview {
  const occupancy = buildAllZoneOccupancy(hour, scenarioId)
  const totalCapacity = GYM_ZONES.reduce((sum, z) => sum + z.capacity, 0)
  const totalHeadcount = occupancy.reduce((sum, o) => sum + o.headcount, 0)
  const overallOccupancyPercent = clampOccupancy((totalHeadcount / totalCapacity) * 100)

  const busiestZones = [...occupancy]
    .sort((a, b) => b.occupancyPercent - a.occupancyPercent)
    .slice(0, 3)
    .map((o) => {
      const zone = GYM_ZONES.find((z) => z.id === o.zoneId)!
      return {
        zoneId: o.zoneId,
        label: zone.label,
        occupancyPercent: o.occupancyPercent,
        status: o.status,
      }
    })

  const blendedForecast: HourlyForecast[] = hoursInDay().map((h) => {
    const hourOcc = buildAllZoneOccupancy(h, scenarioId)
    const headcount = hourOcc.reduce((sum, o) => sum + o.headcount, 0)
    const percent = clampOccupancy((headcount / totalCapacity) * 100)
    return {
      hour: h,
      label: formatHour(h),
      occupancyPercent: percent,
      status: getTrafficStatus(percent),
    }
  })

  return {
    currentHour: hour,
    overallOccupancyPercent,
    estimatedHeadcount: totalHeadcount,
    status: getTrafficStatus(overallOccupancyPercent),
    busiestZones,
    hourlyForecast: blendedForecast,
    isSimulated: true,
  }
}

function preferenceMatchesZone(
  preference: WorkoutPreference,
  zonePreference: string,
): boolean {
  if (preference === 'any') return true
  return preference === zonePreference
}

export function buildForecastResult(
  date: string,
  scenarioId?: string | null,
  preference: WorkoutPreference = 'any',
): ForecastResult {
  const hour = getSimulatedCurrentHour()
  const overview = buildOverview(hour, scenarioId)
  const zoneOccupancy = buildAllZoneOccupancy(hour, scenarioId)

  const zoneForecasts: Record<string, HourlyForecast[]> = {}
  for (const zone of GYM_ZONES) {
    zoneForecasts[zone.id] = buildZoneForecast(zone.id, scenarioId)
  }

  const relevantZones = GYM_ZONES.filter((z) =>
    preferenceMatchesZone(preference, z.preference),
  )

  const hourlyScores = hoursInDay().map((h) => {
    const scores = relevantZones.map((zone) => {
      const point = zoneForecasts[zone.id].find((f) => f.hour === h)!
      return point.occupancyPercent
    })
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    return { hour: h, avg }
  })

  // Prefer morning / mid-afternoon quieter windows during open hours
  const candidates = hourlyScores
    .filter((s) => s.hour >= OPEN_HOUR + 1 && s.hour <= CLOSE_HOUR - 3)
    .sort((a, b) => a.avg - b.avg)

  const best = candidates[0] ?? hourlyScores[0]
  const startHour = best.hour
  const endHour = Math.min(startHour + 2, CLOSE_HOUR - 1)
  const expectedOccupancyPercent = clampOccupancy(best.avg)
  const expectedStatus = getTrafficStatus(expectedOccupancyPercent)

  const scenario = getScenario(scenarioId)
  const reasonParts = [
    `Simulated ${preference === 'any' ? 'overall' : preference} traffic is lowest around ${formatHour(startHour)}.`,
  ]
  if (scenario.id !== 'normal') {
    reasonParts.push(`Adjusted for “${scenario.label}”.`)
  }

  return {
    date,
    scenario: scenario.id === 'normal' ? null : scenario,
    overview,
    zoneOccupancy,
    zoneForecasts,
    recommendedWindow: {
      startHour,
      endHour,
      label: formatHourRange(startHour, endHour),
      reason: reasonParts.join(' '),
      expectedStatus,
      expectedOccupancyPercent,
    },
    isSimulated: true,
  }
}

export function findQuietestHourForZone(
  zoneId: string,
  scenarioId?: string | null,
): { hour: number; label: string } {
  const forecast = buildZoneForecast(zoneId, scenarioId)
  const quietest = [...forecast].sort((a, b) => a.occupancyPercent - b.occupancyPercent)[0]
  return { hour: quietest.hour, label: quietest.label }
}
