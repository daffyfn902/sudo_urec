import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { getCurrentUsername, SocialUnavailable, subscribeUser } from '../services/social'

/** The signed-in test user's username; re-renders when it's switched. */
export function useCurrentUsername(): string {
  return useSyncExternalStore(subscribeUser, getCurrentUsername)
}

interface SocialState<T> {
  data: T | null
  loading: boolean
  /** Backend or database not reachable */
  unavailable: boolean
  error: string | null
}

/** Load social data; reloads when the test user changes or `reload()` is called. */
export function useSocial<T>(load: () => Promise<T>) {
  const username = useCurrentUsername()
  const [tick, setTick] = useState(0)
  const [state, setState] = useState<SocialState<T>>({ data: null, loading: true, unavailable: false, error: null })

  useEffect(() => {
    let cancelled = false
    load()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, unavailable: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const unavailable = err instanceof SocialUnavailable
        setState({ data: null, loading: false, unavailable, error: unavailable ? null : (err as Error).message })
      })
    return () => {
      cancelled = true
    }
    // `load` is one of the stable functions from services/social
  }, [username, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload, username }
}
