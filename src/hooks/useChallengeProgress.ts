import { useCallback, useState } from 'react'
import type { ChallengeProgress } from '../data/types'
import {
  loadChallengeProgress,
  markChallengeComplete,
} from '../services/storage'

export function useChallengeProgress() {
  const [progress, setProgress] = useState<ChallengeProgress>(() =>
    loadChallengeProgress(),
  )

  const complete = useCallback((challengeId: string) => {
    setProgress(markChallengeComplete(challengeId))
  }, [])

  const isComplete = useCallback(
    (challengeId: string) => progress.completedIds.includes(challengeId),
    [progress.completedIds],
  )

  return {
    progress,
    complete,
    isComplete,
    completedCount: progress.completedIds.length,
    areasExplored: progress.exploredZoneIds.length,
  }
}
