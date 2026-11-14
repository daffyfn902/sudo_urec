import type { SavedWorkoutPlan } from '../data/types'

const STORAGE_KEY = 'urec-crowd-map:saved-plans'

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
