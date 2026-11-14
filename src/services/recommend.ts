import { CHALLENGES } from '../data/challenges'
import type {
  Challenge,
  ChallengeDifficulty,
  ChallengeInterest,
  ComfortLevel,
  ExplorePreferences,
  RankedChallenge,
  TrafficStatus,
  ZoneOccupancy,
} from '../data/types'
import { getTrafficStatus } from '../utils/traffic'

const WEIGHTS = {
  interest: 0.4,
  comfort: 0.3,
  novelty: 0.2,
  crowd: 0.1,
} as const

const COMFORT_DIFFICULTY: Record<ComfortLevel, ChallengeDifficulty[]> = {
  'getting-started': ['easy'],
  'ready-different': ['easy', 'moderate'],
  'push-me': ['moderate', 'stretch'],
}

function interestScore(challenge: Challenge, interest: ChallengeInterest): number {
  if (interest === 'surprise') return 0.75
  return challenge.category === interest ? 1 : 0
}

function comfortScore(challenge: Challenge, comfort: ComfortLevel): number {
  const preferred = COMFORT_DIFFICULTY[comfort]
  if (!preferred.includes(challenge.difficulty)) return 0

  if (comfort === 'getting-started') {
    return challenge.beginnerFriendly && challenge.difficulty === 'easy' ? 1 : 0.7
  }
  if (comfort === 'ready-different') {
    return challenge.difficulty === 'moderate' ? 1 : 0.75
  }
  // push-me
  return challenge.difficulty === 'stretch' ? 1 : 0.8
}

function noveltyScore(
  challenge: Challenge,
  completedIds: Set<string>,
  exploredZoneIds: Set<string>,
): number {
  if (completedIds.has(challenge.id)) return 0
  if (!exploredZoneIds.has(challenge.zoneId)) return 1
  return 0.45
}

function crowdScore(occupancyPercent: number): number {
  // Quieter zones score higher; still allow moderate rooms.
  if (occupancyPercent < 40) return 1
  if (occupancyPercent < 65) return 0.65
  if (occupancyPercent < 80) return 0.35
  return 0.1
}

function isEligible(
  challenge: Challenge,
  prefs: ExplorePreferences,
  completedIds: Set<string>,
  excludeIds: Set<string>,
): boolean {
  if (excludeIds.has(challenge.id)) return false
  if (completedIds.has(challenge.id)) return false

  if (prefs.interest !== 'surprise' && challenge.category !== prefs.interest) {
    return false
  }

  if (!COMFORT_DIFFICULTY[prefs.comfort].includes(challenge.difficulty)) {
    return false
  }

  if (prefs.comfort === 'getting-started' && !challenge.beginnerFriendly) {
    return false
  }

  return true
}

function buildReasons(
  challenge: Challenge,
  prefs: ExplorePreferences,
  crowdStatus: TrafficStatus,
  isNewZone: boolean,
): string[] {
  const reasons: string[] = []
  if (prefs.interest === 'surprise') {
    reasons.push('Picked as a gentle surprise match')
  } else {
    reasons.push(`Matches your interest in ${challenge.category}`)
  }
  if (prefs.comfort === 'getting-started') {
    reasons.push('Kept beginner-friendly on purpose')
  } else if (prefs.comfort === 'push-me') {
    reasons.push('A stretch beyond the usual routine')
  }
  if (isNewZone) reasons.push('A zone you have not marked explored yet')
  reasons.push(`Simulated crowd looks ${crowdStatus} right now`)
  return reasons
}

export interface RecommendOptions {
  preferences: ExplorePreferences
  occupancyByZone: Record<string, ZoneOccupancy>
  completedIds?: string[]
  exploredZoneIds?: string[]
  /** Soft-exclude recently shown challenges when using “Try Another” */
  excludeIds?: string[]
  catalog?: Challenge[]
}

/**
 * Deterministic recommendation engine — swap for a backend later.
 * Ranking: interest 40% · comfort 30% · novelty 20% · crowd 10%.
 */
export function recommendChallenges(options: RecommendOptions): RankedChallenge[] {
  const {
    preferences,
    occupancyByZone,
    completedIds = [],
    exploredZoneIds = [],
    excludeIds = [],
    catalog = CHALLENGES,
  } = options

  const completed = new Set(completedIds)
  const explored = new Set(exploredZoneIds)
  const excluded = new Set(excludeIds)

  const ranked: RankedChallenge[] = []

  for (const challenge of catalog) {
    if (!isEligible(challenge, preferences, completed, excluded)) continue

    const occ = occupancyByZone[challenge.zoneId]
    const occupancyPercent = occ?.occupancyPercent ?? 50
    const crowdStatus = occ?.status ?? getTrafficStatus(occupancyPercent)

    const i = interestScore(challenge, preferences.interest)
    const c = comfortScore(challenge, preferences.comfort)
    const n = noveltyScore(challenge, completed, explored)
    const cr = crowdScore(occupancyPercent)

    // Skip if interest/comfort contribute nothing meaningful
    if (i === 0 || c === 0) continue

    const score =
      i * WEIGHTS.interest +
      c * WEIGHTS.comfort +
      n * WEIGHTS.novelty +
      cr * WEIGHTS.crowd

    ranked.push({
      challenge,
      score: Math.round(score * 1000) / 1000,
      crowdStatus,
      crowdOccupancyPercent: occupancyPercent,
      reasons: buildReasons(
        challenge,
        preferences,
        crowdStatus,
        !explored.has(challenge.zoneId),
      ),
    })
  }

  return ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.challenge.id.localeCompare(b.challenge.id)
  })
}

export function pickRecommendation(
  options: RecommendOptions,
): RankedChallenge | null {
  return recommendChallenges(options)[0] ?? null
}
