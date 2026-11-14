import { matchScenarioFromText, SCENARIO_PRESETS } from '../data/scenarios'
import {
  buildForecastResult,
  buildOverview,
  buildZoneForecast,
  findQuietestHourForZone,
} from '../data/mockData'
import type {
  ApiService,
  AskResult,
  DayZoneReading,
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
 * Talks to the FastAPI backend (backend/main.py) and falls back to the local mock data
 * whenever the backend isn't running, so the app always works.
 *
 * In dev, Vite proxies /api to http://localhost:8000 (vite.config.ts). Set VITE_API_URL to
 * point somewhere else.
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const RETRY_AFTER_MS = 30_000
const LATENCY_MS = 180

let backendDownUntil = 0

/** Where the last response came from, for a "simulated / live model" badge if wanted. */
export let lastSource: 'backend' | 'mock' = 'mock'

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), LATENCY_MS)
  })
}

function query(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = 5000): Promise<T> {
  if (Date.now() < backendDownUntil) throw new Error('backend marked down')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) {
      // Vite's proxy answers 502/504 when the backend isn't running
      if (res.status >= 502) backendDownUntil = Date.now() + RETRY_AFTER_MS
      throw new Error(`${path} -> HTTP ${res.status}`)
    }
    lastSource = 'backend'
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof TypeError || (err as Error).name === 'AbortError') {
      backendDownUntil = Date.now() + RETRY_AFTER_MS
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Try the backend, fall back to the mock. */
async function withFallback<T>(backend: () => Promise<T>, mock: () => T | Promise<T>): Promise<T> {
  try {
    return await backend()
  } catch {
    lastSource = 'mock'
    return delay(await mock())
  }
}

function mockZoneDetails(zoneId: string, hour: number, scenarioId?: string | null): ZoneDetails {
  const zone = ZONE_BY_ID[zoneId]
  const forecast = buildZoneForecast(zoneId, scenarioId)
  const point = forecast.find((f) => f.hour === hour) ?? forecast[0]
  const suggested = findQuietestHourForZone(zoneId, scenarioId)
  return {
    zone,
    occupancy: {
      zoneId,
      hour,
      occupancyPercent: point.occupancyPercent,
      headcount: headcountFromPercent(zone.capacity, point.occupancyPercent),
      status: point.status,
    },
    forecast,
    suggestedHour: suggested.hour,
    suggestedLabel: suggested.label,
    isSimulated: true,
  }
}

export const api: ApiService = {
  async getCurrentOccupancy(scenarioId?: string | null, hour?: number): Promise<GymOverview> {
    const h = hour ?? getSimulatedCurrentHour()
    return withFallback(
      () => call<GymOverview>(`/api/overview${query({ date: todayISODate(), hour: h, scenario: scenarioId })}`),
      () => buildOverview(h, scenarioId),
    )
  },

  async getForecast(
    date: string,
    scenarioId?: string | null,
    preference: WorkoutPreference = 'any',
  ): Promise<ForecastResult> {
    const d = date || todayISODate()
    return withFallback(
      () => call<ForecastResult>(`/api/forecast${query({ date: d, scenario: scenarioId, preference })}`),
      () => buildForecastResult(d, scenarioId, preference),
    )
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
    const h = hour ?? getSimulatedCurrentHour()
    return withFallback(
      async () => {
        const details = await call<Omit<ZoneDetails, 'zone'>>(
          `/api/zones/${encodeURIComponent(zoneId)}${query({ date: todayISODate(), hour: h, scenario: scenarioId })}`,
        )
        return { ...details, zone }
      },
      () => mockZoneDetails(zoneId, h, scenarioId),
    )
  },

  async applyScenario(text: string): Promise<ScenarioKnobs | null> {
    // The language model can take a few seconds, so this call gets a longer timeout
    return withFallback(
      () =>
        call<ScenarioKnobs | null>(
          '/api/scenario/interpret',
          { method: 'POST', body: JSON.stringify({ text }) },
          30_000,
        ),
      () => matchScenarioFromText(text),
    )
  },

  async getZones(): Promise<GymZone[]> {
    // Layout and colours live in the frontend; the backend only supplies numbers
    return delay([...GYM_ZONES])
  },

  async getScenarios(): Promise<ScenarioKnobs[]> {
    return withFallback(
      () => call<ScenarioKnobs[]>('/api/scenarios'),
      () => [...SCENARIO_PRESETS],
    )
  },

  async ask(text: string): Promise<AskResult> {
    return withFallback(
      () => call<AskResult>('/api/ask', { method: 'POST', body: JSON.stringify({ text }) }, 30_000),
      () => ({
        text: 'The assistant needs the backend running (uvicorn backend.main:app --port 8000).',
        understood: '',
        slots: [],
      }),
    )
  },

  async getDay(date: string, scenarioId?: string | null): Promise<DayZoneReading[]> {
    return withFallback(
      () => call<DayZoneReading[]>(`/api/day${query({ date: date || todayISODate(), scenario: scenarioId })}`),
      () => [],
    )
  },
}
