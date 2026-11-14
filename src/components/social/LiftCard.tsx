import { useState } from 'react'
import { CalendarDays, Check, Clock3, Trash2, UserPlus, X } from 'lucide-react'
import type { Friend, InviteStatus, Lift } from '../../data/types'
import { getCurrentUsername, social } from '../../services/social'
import { formatDisplayDate } from '../../utils/time'
import { TrafficBadge } from '../ui/TrafficBadge'
import { Avatar } from './Avatar'

const PREFERENCE_LABELS: Record<string, string> = {
  any: 'Any zone',
  weights: 'Weights',
  cardio: 'Cardio',
  courts: 'Courts',
}

const STATUS_STYLE: Record<InviteStatus, string> = {
  accepted: 'border-traffic-low/30 bg-traffic-low/10 text-emerald-800',
  pending: 'border-border bg-surface text-ink-muted',
  declined: 'border-border bg-surface text-ink-subtle line-through',
}
const STATUS_LABEL: Record<InviteStatus, string> = { accepted: 'Going', pending: 'Invited', declined: "Can't go" }

interface LiftCardProps {
  lift: Lift
  /** The viewer's friends, to offer "invite more" on their own lifts */
  friends?: Friend[]
  /** Called after any change so the page can reload */
  onChanged: () => void
}

/** A planned lift: the owner's view (invite list, invite more, delete) or the invitee's (accept / decline). */
export function LiftCard({ lift, friends = [], onChanged }: LiftCardProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const invited = new Set(lift.invites.map((i) => i.user.username))
  const invitable = friends.filter((f) => !invited.has(f.username))
  // Other people who said yes (the viewer's own answer is shown separately)
  const going = lift.invites.filter((i) => i.status === 'accepted' && i.user.username !== getCurrentUsername())

  return (
    <article className="card-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-jmu-lavender text-jmu-purple">
          <CalendarDays className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{formatDisplayDate(lift.date)}</h3>
            <TrafficBadge status={lift.expectedCrowdLevel} size="sm" />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {lift.timeLabel}
          </p>
          <p className="mt-1 text-sm text-ink">
            {PREFERENCE_LABELS[lift.preference] ?? lift.preference}
            {lift.recommendedZoneLabel ? ` · ${lift.recommendedZoneLabel}` : ''}
          </p>
          {lift.note && <p className="mt-1 text-[13px] italic text-ink-muted">“{lift.note}”</p>}
          <p className="mt-1 text-xs text-ink-subtle">
            ~{lift.expectedOccupancyPercent}% expected
            {lift.scenarioLabel ? ` · ${lift.scenarioLabel}` : ''}
            {' · '}simulated
          </p>
        </div>
        {lift.isMine && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => social.deleteLift(lift.id))}
            className="rounded-xl p-2 text-ink-subtle transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label="Delete this lift"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Who's coming */}
      <div className="mt-3 border-t border-border pt-3">
        {!lift.isMine && (
          <p className="mb-2 flex items-center gap-2 text-[13px] text-ink">
            <Avatar user={lift.owner} size="sm" />
            <span>
              <span className="font-semibold">{lift.owner.displayName}</span> invited you
              {going.length > 0 &&
                ` · ${going.map((g) => g.user.displayName).join(', ')} ${going.length === 1 ? 'is' : 'are'} going`}
            </span>
          </p>
        )}

        {lift.isMine &&
          (lift.invites.length === 0 ? (
            <p className="text-[12px] text-ink-subtle">Just you so far.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {lift.invites.map((i) => (
                <li
                  key={i.user.username}
                  className={`inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-[12px] font-medium ${STATUS_STYLE[i.status]}`}
                >
                  <Avatar user={i.user} size="sm" />
                  <span>{i.user.displayName}</span>
                  <span className="font-normal no-underline opacity-80">· {STATUS_LABEL[i.status]}</span>
                </li>
              ))}
            </ul>
          ))}

        {lift.isMine && invitable.length > 0 && (
          <div className="mt-2">
            {inviting ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {invitable.map((f) => (
                  <button
                    key={f.username}
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => social.inviteToLift(lift.id, [f.username]))}
                    className="pressable inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-2.5 text-[12px] font-medium text-ink-muted hover:border-jmu-purple hover:text-jmu-purple disabled:opacity-50"
                  >
                    <Avatar user={f} size="sm" present={!!f.atUrec} />
                    Invite {f.displayName}
                  </button>
                ))}
                <button type="button" onClick={() => setInviting(false)} className="px-1 text-[12px] text-ink-subtle">
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInviting(true)}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-jmu-purple"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden /> Invite a friend
              </button>
            )}
          </div>
        )}

        {!lift.isMine && (
          <div className="flex flex-wrap items-center gap-2">
            {lift.myStatus === 'pending' ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => social.respondToLift(lift.id, 'accepted'))}
                  className="pressable inline-flex items-center gap-1.5 rounded-xl bg-jmu-purple px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-jmu-purple-dark disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden /> I'm in
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => social.respondToLift(lift.id, 'declined'))}
                  className="pressable inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-border-strong disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden /> Can't make it
                </button>
              </>
            ) : (
              <>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${lift.myStatus === 'accepted' ? STATUS_STYLE.accepted : 'border-border text-ink-subtle'}`}
                >
                  {lift.myStatus === 'accepted' ? "You're going" : 'You declined'}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(() => social.respondToLift(lift.id, lift.myStatus === 'accepted' ? 'declined' : 'accepted'))
                  }
                  className="text-[12px] font-medium text-jmu-purple disabled:opacity-50"
                >
                  {lift.myStatus === 'accepted' ? "Can't make it anymore" : 'Actually, I can go'}
                </button>
              </>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      </div>
    </article>
  )
}
