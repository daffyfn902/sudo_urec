import type { TrafficStatus } from '../data/types'

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
  switch (status) {
    case 'low':
      return '#34c759'
    case 'moderate':
      return '#ffcc00'
    case 'high':
      return '#ff3b30'
  }
}

export function trafficBgClass(status: TrafficStatus): string {
  switch (status) {
    case 'low':
      return 'bg-traffic-low/15 text-emerald-800'
    case 'moderate':
      return 'bg-traffic-moderate/20 text-amber-800'
    case 'high':
      return 'bg-traffic-high/15 text-red-800'
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
