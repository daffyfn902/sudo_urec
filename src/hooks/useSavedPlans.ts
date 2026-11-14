import { useCallback, useEffect, useState } from 'react'
import type { SavedWorkoutPlan } from '../data/types'
import { addSavedPlan, loadSavedPlans, removeSavedPlan } from '../services/storage'

export function useSavedPlans() {
  const [plans, setPlans] = useState<SavedWorkoutPlan[]>([])

  useEffect(() => {
    setPlans(loadSavedPlans())
  }, [])

  const save = useCallback((plan: SavedWorkoutPlan) => {
    setPlans(addSavedPlan(plan))
  }, [])

  const remove = useCallback((id: string) => {
    setPlans(removeSavedPlan(id))
  }, [])

  return { plans, save, remove }
}
