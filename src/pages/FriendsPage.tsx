import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Check, DatabaseZap, LogOut, MapPin, UserPlus, X } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Avatar } from '../components/social/Avatar'
import type { FriendsData, Presence, SocialUser } from '../data/types'
import { GYM_ZONES } from '../data/zones'
import { useSocial } from '../hooks/useSocial'
import { setCurrentUsername, social } from '../services/social'

interface FriendsPageData {
  me: SocialUser & { atUrec: Presence | null }
  friends: FriendsData
  users: SocialUser[]
}

const loadFriendsPage = async (): Promise<FriendsPageData> => {
  const [me, friends, users] = await Promise.all([social.me(), social.friends(), social.users()])
  return { me, friends, users }
}

function sinceLabel(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  return `${h} hr${h > 1 ? 's' : ''} ago`
}

export function FriendsPage() {
  const navigate = useNavigate()
  const { data, loading, unavailable, error, reload, username } = useSocial(loadFriendsPage)
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const run = async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      if (done) setMessage({ ok: true, text: done })
      reload()
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    const name = addName.trim().toLowerCase()
    if (!name) return
    void run(async () => {
      const res = await social.requestFriend(name)
      setAddName('')
      setMessage({ ok: true, text: res.status === 'accepted' ? `You and ${name} are now friends` : `Request sent to ${name}` })
    })
  }

  const friends = data?.friends.friends ?? []
  const here = friends.filter((f) => f.atUrec)
  const known = new Set([
    username,
    ...friends.map((f) => f.username),
    ...(data?.friends.incoming ?? []).map((u) => u.username),
    ...(data?.friends.outgoing ?? []).map((u) => u.username),
  ])
  const suggestions = (data?.users ?? []).filter((u) => !known.has(u.username))

  return (
    <div className="page-shell safe-top">
      <PageHeader
        eyebrow="Friends"
        title="Who's at UREC"
        subtitle="See which friends are here and invite them to your next lift."
      />

      {unavailable ? (
        <div className="card-surface flex items-start gap-3 p-4">
          <DatabaseZap className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Friends need the backend and its database. Start them with{' '}
            <code className="rounded bg-jmu-mist px-1 py-0.5 text-[12px]">python -m backend.db start</code> and{' '}
            <code className="rounded bg-jmu-mist px-1 py-0.5 text-[12px]">python -m uvicorn backend.main:app --port 8000</code>.
          </p>
        </div>
      ) : loading || !data ? (
        <div className="space-y-4">
          <div className="card-surface h-24 animate-pulse bg-jmu-lavender/40" />
          <div className="card-surface h-40 animate-pulse bg-jmu-lavender/30" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
          <div className="order-2 space-y-4 lg:col-span-2">
          {/* Add a friend */}
          <section className="card-surface p-4 sm:p-5" aria-labelledby="add-title">
            <p id="add-title" className="section-label mb-3">
              Add a friend
            </p>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Username"
                aria-label="Friend's username"
                autoCapitalize="none"
                className="min-w-0 flex-1 rounded-xl border border-border bg-jmu-mist px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-jmu-purple/40 focus:ring-2 focus:ring-jmu-purple/15"
              />
              <button
                type="submit"
                disabled={busy || !addName.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-jmu-purple px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-jmu-purple-dark disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden /> Add
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-ink-subtle">People you may know:</span>
                {suggestions.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => social.requestFriend(u.username), `Request sent to ${u.displayName}`)}
                    className="pressable inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-2.5 text-[12px] font-medium text-ink-muted hover:border-jmu-purple hover:text-jmu-purple disabled:opacity-50"
                  >
                    <Avatar user={u} size="sm" /> {u.displayName}
                  </button>
                ))}
              </div>
            )}
            {data.friends.outgoing.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {data.friends.outgoing.map((u) => (
                  <li key={u.username} className="flex items-center justify-between text-[12px] text-ink-muted">
                    <span>Request sent to {u.displayName}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => social.removeFriend(u.username))}
                      className="font-medium text-ink-subtle hover:text-red-600"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>


          <div aria-live="polite">
            {(message || error) && (
              <p className={`text-[13px] ${message?.ok ? 'text-ink-muted' : 'text-red-600'}`}>{message?.text ?? error}</p>
            )}
          </div>

          {/* Test-user switcher (stands in for login) */}
          <section className="card-surface p-4 sm:p-5" aria-labelledby="signed-in-title">
            <p id="signed-in-title" className="section-label mb-3">
              Signed in as
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.users.map((u) => {
                const on = u.username === username
                return (
                  <button
                    key={u.username}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setMessage(null)
                      setCurrentUsername(u.username)
                    }}
                    className={[
                      'pressable inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[13px] font-medium transition',
                      on
                        ? 'border-jmu-purple bg-jmu-lavender text-jmu-purple'
                        : 'border-border bg-surface text-ink-muted hover:border-border-strong',
                    ].join(' ')}
                  >
                    <Avatar user={u} size="sm" />
                    {u.displayName}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-ink-subtle">Test accounts for the demo: tap one to switch. No password.</p>
          </section>

          </div>

          <div className="order-1 space-y-4 lg:col-span-3">
          {/* My check-in */}
          <section className="card-surface p-4 sm:p-5" aria-labelledby="checkin-title">
            <p id="checkin-title" className="section-label mb-3">
              Your status
            </p>
            {data.me.atUrec ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar user={data.me} present />
                  <div>
                    <p className="text-[14px] font-semibold text-ink">You're at UREC</p>
                    <p className="text-[12px] text-ink-muted">
                      {data.me.atUrec.zoneLabel ?? 'Somewhere in the building'} · checked in{' '}
                      {sinceLabel(data.me.atUrec.since)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => social.checkOut())}
                  className="pressable inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[13px] font-medium text-ink-muted hover:border-border-strong disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden /> Check out
                </button>
              </div>
            ) : (
              <>
                <p className="mb-2.5 text-[13px] text-ink-muted">
                  Check in so friends can see you're here. It clears itself after 3 hours.
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {[{ id: null as string | null, label: 'Anywhere' }, ...GYM_ZONES.map((z) => ({ id: z.id as string | null, label: z.label }))].map(
                    (z) => (
                      <button
                        key={z.id ?? 'any'}
                        type="button"
                        aria-pressed={zoneId === z.id}
                        onClick={() => setZoneId(z.id)}
                        className={[
                          'rounded-full border px-2.5 py-1 text-[12px] font-medium transition',
                          zoneId === z.id
                            ? 'border-jmu-purple bg-jmu-purple text-white'
                            : 'border-border bg-surface text-ink-muted hover:border-border-strong',
                        ].join(' ')}
                      >
                        {z.label}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => social.checkIn(zoneId))}
                  className="pressable inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-jmu-purple py-3 text-[14px] font-semibold text-white hover:bg-jmu-purple-dark disabled:opacity-60"
                >
                  <MapPin className="h-4 w-4" aria-hidden /> I'm at UREC
                </button>
              </>
            )}
          </section>

          {/* Friend requests */}
          {data.friends.incoming.length > 0 && (
            <section className="card-surface p-4 sm:p-5" aria-labelledby="requests-title">
              <p id="requests-title" className="section-label mb-3 text-jmu-purple">
                Friend requests
              </p>
              <ul className="divide-y divide-border">
                {data.friends.incoming.map((u) => (
                  <li key={u.username} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <p className="text-[14px] font-medium text-ink">{u.displayName}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => social.acceptFriend(u.username), `You and ${u.displayName} are now friends`)}
                        className="pressable inline-flex items-center gap-1 rounded-xl bg-jmu-purple px-3 py-2 text-[13px] font-semibold text-white hover:bg-jmu-purple-dark disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden /> Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => social.removeFriend(u.username))}
                        aria-label={`Decline ${u.displayName}'s request`}
                        className="pressable rounded-xl border border-border px-2.5 py-2 text-ink-muted hover:border-border-strong disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Friends list */}
          <section className="card-surface p-4 sm:p-5" aria-labelledby="friends-title">
            <div className="mb-3 flex items-baseline justify-between">
              <p id="friends-title" className="section-label">
                Your friends
              </p>
              <span className="text-[11px] font-medium text-ink-subtle">
                {here.length === 0 ? 'Nobody at UREC right now' : `${here.length} at UREC now`}
              </span>
            </div>
            {friends.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No friends yet. Add someone below.</p>
            ) : (
              <ul className="divide-y divide-border">
                {friends.map((f) => (
                  <li key={f.username} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar user={f} present={!!f.atUrec} />
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-ink">{f.displayName}</p>
                        {f.atUrec ? (
                          <p className="text-[12px] font-medium leading-snug text-emerald-700">
                            At UREC{f.atUrec.zoneLabel ? ` · ${f.atUrec.zoneLabel}` : ''} · {sinceLabel(f.atUrec.since)}
                          </p>
                        ) : (
                          <p className="text-[12px] text-ink-subtle">Not at UREC</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate('/plan', { state: { invite: f.username } })}
                        aria-label={`Invite ${f.displayName} to a lift`}
                        className="pressable inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-medium text-jmu-purple hover:border-jmu-purple"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Invite
                        <span className="hidden sm:inline">to a lift</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => social.removeFriend(f.username), `Removed ${f.displayName}`)}
                        aria-label={`Remove ${f.displayName} from friends`}
                        className="rounded-xl p-2 text-ink-subtle hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>
        </div>
      )}
    </div>
  )
}
