import type { ChallengeProgress, SavedWorkoutPlan } from '../data/types'
import { CHALLENGE_BY_ID } from '../data/challenges'

const STORAGE_KEY = 'urec-crowd-map:saved-plans'
const CHALLENGE_PROGRESS_KEY = 'urec-crowd-map:challenge-progress'

export function loadSavedPlans(): SavedWorkoutPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedWorkoutPlan[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSavedPlans(plans: SavedWorkoutPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
}

export function addSavedPlan(plan: SavedWorkoutPlan): SavedWorkoutPlan[] {
  const next = [plan, ...loadSavedPlans()]
  saveSavedPlans(next)
  return next
}

export function removeSavedPlan(id: string): SavedWorkoutPlan[] {
  const next = loadSavedPlans().filter((p) => p.id !== id)
  saveSavedPlans(next)
  return next
}

const EMPTY_PROGRESS: ChallengeProgress = {
  completedIds: [],
  exploredZoneIds: [],
}

export function loadChallengeProgress(): ChallengeProgress {
  try {
    const raw = localStorage.getItem(CHALLENGE_PROGRESS_KEY)
    if (!raw) return { ...EMPTY_PROGRESS, completedIds: [], exploredZoneIds: [] }
    const parsed = JSON.parse(raw) as Partial<ChallengeProgress>
    return {
      completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
      exploredZoneIds: Array.isArray(parsed.exploredZoneIds) ? parsed.exploredZoneIds : [],
      lastCompletedAt: parsed.lastCompletedAt,
    }
  } catch {
    return { ...EMPTY_PROGRESS, completedIds: [], exploredZoneIds: [] }
  }
}

export function saveChallengeProgress(progress: ChallengeProgress): void {
  localStorage.setItem(CHALLENGE_PROGRESS_KEY, JSON.stringify(progress))
}

export function markChallengeComplete(challengeId: string): ChallengeProgress {
  const current = loadChallengeProgress()
  if (current.completedIds.includes(challengeId)) return current

  const challenge = CHALLENGE_BY_ID[challengeId]
  const exploredZoneIds = challenge
    ? Array.from(new Set([...current.exploredZoneIds, challenge.zoneId]))
    : current.exploredZoneIds

  const next: ChallengeProgress = {
    completedIds: [...current.completedIds, challengeId],
    exploredZoneIds,
    lastCompletedAt: new Date().toISOString(),
  }
  saveChallengeProgress(next)
  return next
}
