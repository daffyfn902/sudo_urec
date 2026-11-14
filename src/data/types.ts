export type TrafficStatus = 'low' | 'moderate' | 'high'

export type WorkoutPreference = 'weights' | 'cardio' | 'courts' | 'any'

export type FloorNumber = 1 | 2

export interface GymZone {
  id: string
  label: string
  floor: FloorNumber
  capacity: number
  preference: Exclude<WorkoutPreference, 'any'>
  description: string
  /** Isometric layout position in the 3D scene */
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

export interface ZoneOccupancy {
  zoneId: string
  hour: number
  occupancyPercent: number
  headcount: number
  status: TrafficStatus
}

export interface HourlyForecast {
  hour: number
  label: string
  occupancyPercent: number
  status: TrafficStatus
}

export interface GymOverview {
  currentHour: number
  overallOccupancyPercent: number
  estimatedHeadcount: number
  status: TrafficStatus
  busiestZones: Array<{
    zoneId: string
    label: string
    occupancyPercent: number
    status: TrafficStatus
  }>
  hourlyForecast: HourlyForecast[]
  isSimulated: true
}

export interface ScenarioKnobs {
  id: string
  label: string
  description: string
  /** Multiplier applied to base occupancy (1 = normal) */
  occupancyMultiplier: number
  /** Hours that receive an extra bump (0–23) */
  peakBoostHours: number[]
  peakBoostAmount: number
  /** Zone preference keys that get extra load */
  hotZones?: string[]
  hotZoneBoost?: number
}

export interface SavedWorkoutPlan {
  id: string
  createdAt: string
  date: string
  timeLabel: string
  hour: number
  preference: WorkoutPreference
  expectedCrowdLevel: TrafficStatus
  expectedOccupancyPercent: number
  recommendedZoneId?: string
  recommendedZoneLabel?: string
  scenarioId?: string
  scenarioLabel?: string
}

export interface ZoneDetails {
  zone: GymZone
  occupancy: ZoneOccupancy
  forecast: HourlyForecast[]
  suggestedHour: number
  suggestedLabel: string
  isSimulated: true
}

export interface ForecastResult {
  date: string
  scenario: ScenarioKnobs | null
  overview: GymOverview
  zoneOccupancy: ZoneOccupancy[]
  zoneForecasts: Record<string, HourlyForecast[]>
  recommendedWindow: {
    startHour: number
    endHour: number
    label: string
    reason: string
    expectedStatus: TrafficStatus
    expectedOccupancyPercent: number
  }
  isSimulated: true
}

export interface ApiService {
  getCurrentOccupancy(scenarioId?: string | null): Promise<GymOverview>
  getForecast(date: string, scenarioId?: string | null, preference?: WorkoutPreference): Promise<ForecastResult>
  getZoneDetails(zoneId: string, hour?: number, scenarioId?: string | null): Promise<ZoneDetails>
  applyScenario(text: string): Promise<ScenarioKnobs | null>
  getZones(): Promise<GymZone[]>
  getScenarios(): Promise<ScenarioKnobs[]>
}
