import type { ScenarioKnobs } from './types'

export const SCENARIO_PRESETS: ScenarioKnobs[] = [
  {
    id: 'normal',
    label: 'Typical day',
    description: 'Baseline simulated traffic for a regular weekday.',
    occupancyMultiplier: 1,
    peakBoostHours: [],
    peakBoostAmount: 0,
  },
  {
    id: 'finals-week',
    label: 'Finals week',
    description: 'Students hit the gym to blow off steam between exams.',
    occupancyMultiplier: 1.25,
    peakBoostHours: [14, 15, 16, 17, 20, 21],
    peakBoostAmount: 12,
    hotZones: ['cardio', 'indoor-track'],
    hotZoneBoost: 10,
  },
  {
    id: 'new-years',
    label: "First week after New Year's",
    description: 'Resolution season — every zone gets busier.',
    occupancyMultiplier: 1.4,
    peakBoostHours: [6, 7, 8, 17, 18, 19],
    peakBoostAmount: 15,
    hotZones: ['free-weights', 'cardio', 'upstairs-strength'],
    hotZoneBoost: 12,
  },
  {
    id: 'rainy-monday',
    label: 'Rainy Monday',
    description: 'Outdoor workouts cancel; indoor zones fill up.',
    occupancyMultiplier: 1.2,
    peakBoostHours: [11, 12, 16, 17, 18],
    peakBoostAmount: 10,
    hotZones: ['basketball-courts', 'indoor-track', 'cardio'],
    hotZoneBoost: 14,
  },
  {
    id: 'spring-break-friday',
    label: 'Friday before spring break',
    description: 'Campus empties early — unusually quiet afternoon.',
    occupancyMultiplier: 0.55,
    peakBoostHours: [9, 10],
    peakBoostAmount: 8,
    hotZones: ['free-weights'],
    hotZoneBoost: 5,
  },
]

export function matchScenarioFromText(text: string): ScenarioKnobs | null {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return null

  const patterns: Array<{ keys: string[]; id: string }> = [
    { keys: ['final', 'exam'], id: 'finals-week' },
    { keys: ['new year', "new year's", 'resolution', 'january'], id: 'new-years' },
    { keys: ['rain', 'rainy', 'weather'], id: 'rainy-monday' },
    { keys: ['spring break', 'break friday', 'before break'], id: 'spring-break-friday' },
    { keys: ['normal', 'typical', 'regular'], id: 'normal' },
  ]

  for (const pattern of patterns) {
    if (pattern.keys.some((key) => normalized.includes(key))) {
      return SCENARIO_PRESETS.find((s) => s.id === pattern.id) ?? null
    }
  }

  return SCENARIO_PRESETS.find((s) => normalized.includes(s.label.toLowerCase())) ?? null
}
