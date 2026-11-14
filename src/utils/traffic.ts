import type { TrafficStatus } from '../data/types'

/** Shared traffic palette — keep in sync with public/urec-3d.html legend */
export const TRAFFIC_COLORS = {
  low: '#16A66A',
  moderate: '#F4B740',
  high: '#E34B55',
} as const

export function getTrafficStatus(occupancyPercent: number): TrafficStatus {
  if (occupancyPercent >= 75) return 'high'
  if (occupancyPercent >= 40) return 'moderate'
  return 'low'
}

export function trafficLabel(status: TrafficStatus): string {
  switch (status) {
    case 'low':
      return 'Low'
    case 'moderate':
      return 'Moderate'
    case 'high':
      return 'High'
  }
}

export function trafficColor(status: TrafficStatus): string {
  return TRAFFIC_COLORS[status]
}

export function trafficBgClass(status: TrafficStatus): string {
  switch (status) {
    case 'low':
      return 'bg-traffic-low/12 text-emerald-800'
    case 'moderate':
      return 'bg-traffic-moderate/18 text-amber-800'
    case 'high':
      return 'bg-traffic-high/12 text-red-800'
  }
}

export function trafficDotClass(status: TrafficStatus): string {
  switch (status) {
    case 'low':
      return 'bg-traffic-low'
    case 'moderate':
      return 'bg-traffic-moderate'
    case 'high':
      return 'bg-traffic-high'
  }
}

export function clampOccupancy(value: number): number {
  return Math.max(5, Math.min(98, Math.round(value)))
}

export function headcountFromPercent(capacity: number, percent: number): number {
  return Math.max(1, Math.round((capacity * percent) / 100))
}
