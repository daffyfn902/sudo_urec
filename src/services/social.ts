import type { FriendsData, InviteStatus, Lift, LiftsData, Presence, SavedWorkoutPlan, SocialUser } from '../data/types'

/**
 * Friends, check-ins and lifts: talks to backend/social.py, which stores them in PostgreSQL.
 *
 * There's no real login yet. The acting user is one of the seeded test users, chosen on the
 * Friends page, remembered in localStorage and sent as the X-User header.
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const USER_KEY = 'urec-crowd-map:user'
const DEFAULT_USER = 'nathan'

/** The backend or its database isn't reachable: callers fall back to on-device storage. */
export class SocialUnavailable extends Error {}

// ---- current (test) user ----------------------------------------------------------------
const listeners = new Set<() => void>()

function readUser(): string {
  try {
    return localStorage.getItem(USER_KEY) || DEFAULT_USER
  } catch {
    return DEFAULT_USER
  }
}

let currentUsername = readUser()

export function getCurrentUsername(): string {
  return currentUsername
}

export function setCurrentUsername(username: string): void {
  currentUsername = username
  try {
    localStorage.setItem(USER_KEY, username)
  } catch {
    // private mode: keep it in memory only
  }
  listeners.forEach((fn) => fn())
}

export function subscribeUser(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ---- requests ------------------------------------------------------------------------------
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-User': currentUsername, ...(init?.headers ?? {}) },
    })
  } catch {
    throw new SocialUnavailable('backend unreachable')
  }
  if (res.status >= 502) throw new SocialUnavailable(`HTTP ${res.status}`)
  if (res.status === 401) {
    // the remembered test user no longer exists (database was reset): fall back to the default
    if (currentUsername !== DEFAULT_USER) setCurrentUsername(DEFAULT_USER)
    throw new Error('That test user no longer exists. Switched back to Nathan.')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
    throw new Error(typeof body?.detail === 'string' ? body.detail : `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

const post = (body?: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body ?? {}) })

export type NewLift = Omit<SavedWorkoutPlan, 'id' | 'createdAt'> & { endHour: number; note: string; invite: string[] }

export const social = {
  users: () => call<SocialUser[]>('/api/users'),
  me: () => call<SocialUser & { atUrec: Presence | null }>('/api/me'),

  friends: () => call<FriendsData>('/api/friends'),
  requestFriend: (username: string) => call<{ status: string }>('/api/friends/request', post({ username })),
  acceptFriend: (username: string) =>
    call<{ status: string }>(`/api/friends/${encodeURIComponent(username)}/accept`, post()),
  removeFriend: (username: string) =>
    call<{ ok: boolean }>(`/api/friends/${encodeURIComponent(username)}`, { method: 'DELETE' }),

  checkIn: (zoneId: string | null) => call<{ atUrec: Presence }>('/api/checkin', post({ zoneId })),
  checkOut: () => call<{ atUrec: null }>('/api/checkin', { method: 'DELETE' }),

  lifts: () => call<LiftsData>('/api/lifts'),
  createLift: (lift: NewLift) => call<Lift>('/api/lifts', post(lift)),
  deleteLift: (id: string) => call<{ ok: boolean }>(`/api/lifts/${id}`, { method: 'DELETE' }),
  inviteToLift: (id: string, usernames: string[]) => call<Lift>(`/api/lifts/${id}/invites`, post({ usernames })),
  respondToLift: (id: string, status: Exclude<InviteStatus, 'pending'>) =>
    call<Lift>(`/api/lifts/${id}/respond`, post({ status })),
}
