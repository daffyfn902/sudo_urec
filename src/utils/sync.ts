import type { DayZoneReading, TrafficStatus } from '../data/types'
import { getTrafficStatus } from './traffic'

export interface ZoneNow {
  zoneId: string
  label: string
  occupancyPercent: number
  status: TrafficStatus
}

/**
 * The busiest zones at slider time `t`, from the same per-zone forecast the 3D map is coloured with, blended between
 * hours exactly as the map does (liveAt in public/urec-3d.html). Returns [] when there's no per-zone data.
 */
export function busiestZonesAt(day: DayZoneReading[], t: number, limit = 3): ZoneNow[] {
  const h = Math.floor(t)
  const f = Math.min(1, t - h)
  const byZone = new Map<string, { a?: DayZoneReading; b?: DayZoneReading }>()
  for (const r of day) {
    if (r.hour !== h && r.hour !== h + 1) continue
    const entry = byZone.get(r.zoneId) ?? {}
    if (r.hour === h) entry.a = r
    else entry.b = r
    byZone.set(r.zoneId, entry)
  }
  const zones: ZoneNow[] = []
  for (const { a, b } of byZone.values()) {
    if (!a || !a.isOpen) continue
    const pct = b && b.isOpen ? a.occupancyPercent + (b.occupancyPercent - a.occupancyPercent) * f : a.occupancyPercent
    const occupancyPercent = Math.round(pct)
    zones.push({ zoneId: a.zoneId, label: a.name, occupancyPercent, status: getTrafficStatus(occupancyPercent) })
  }
  return zones.sort((x, y) => y.occupancyPercent - x.occupancyPercent).slice(0, limit)
}
