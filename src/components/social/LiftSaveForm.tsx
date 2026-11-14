import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2, UserPlus } from 'lucide-react'
import { useSocial } from '../../hooks/useSocial'
import { social } from '../../services/social'
import { Avatar } from './Avatar'

interface LiftSaveFormProps {
  /** Saves the plan; resolves to where it ended up */
  onSave: (invite: string[], note: string) => Promise<'database' | 'device'>
  /** Friends to pre-select (e.g. coming from "Invite to a lift" on the Friends page) */
  initialInvite?: string[]
}

/** "Save lift" with a friend picker and an optional note; shown under the recommended time. */
export function LiftSaveForm({ onSave, initialInvite = [] }: LiftSaveFormProps) {
  const { data, unavailable } = useSocial(social.friends)
  const [invite, setInvite] = useState<string[]>(initialInvite)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const friends = data?.friends ?? []
  const chosen = invite.filter((u) => friends.some((f) => f.username === u))

  const toggle = (username: string) => {
    setResult(null)
    setInvite((prev) => (prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]))
  }

  const save = async () => {
    setBusy(true)
    setResult(null)
    try {
      const where = await onSave(chosen, note.trim())
      const names = friends.filter((f) => chosen.includes(f.username)).map((f) => f.displayName)
      setResult({
        ok: true,
        text:
          where === 'device'
            ? 'Saved on this device (the database is offline, so no invites were sent)'
            : names.length
              ? `Saved · invited ${names.join(' and ')}`
              : 'Saved to your lifts',
      })
      setInvite([])
      setNote('')
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {!unavailable && (
        <div>
          <p className="section-label mb-2 flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" aria-hidden /> Invite friends
          </p>
          {friends.length === 0 ? (
            <p className="text-[12px] text-ink-subtle">
              No friends yet.{' '}
              <Link to="/friends" className="font-medium text-jmu-purple">
                Add some
              </Link>{' '}
              to invite them to a lift.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {friends.map((f) => {
                const on = chosen.includes(f.username)
                return (
                  <button
                    key={f.username}
                    type="button"
                    onClick={() => toggle(f.username)}
                    aria-pressed={on}
                    className={[
                      'pressable inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[12px] font-medium transition',
                      on
                        ? 'border-jmu-purple bg-jmu-lavender text-jmu-purple'
                        : 'border-border bg-surface text-ink-muted hover:border-border-strong',
                    ].join(' ')}
                  >
                    <Avatar user={f} size="sm" present={!!f.atUrec} />
                    {f.displayName}
                    {on && <Check className="h-3 w-3" aria-hidden />}
                  </button>
                )
              })}
            </div>
          )}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Add a note (optional): leg day, meet at the front desk…"
            aria-label="Note for this lift"
            className="mt-2.5 w-full rounded-xl border border-border bg-jmu-mist px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-jmu-purple/40 focus:ring-2 focus:ring-jmu-purple/15"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="pressable inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-jmu-purple py-3 text-[14px] font-semibold text-white transition-colors hover:bg-jmu-purple-dark disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : chosen.length ? (
          `Save lift & invite ${chosen.length}`
        ) : (
          'Save lift'
        )}
      </button>

      <div aria-live="polite">
        {result && (
          <p className={`flex items-center gap-1.5 text-[12px] ${result.ok ? 'text-ink-muted' : 'text-red-600'}`}>
            {result.ok && <Check className="h-3.5 w-3.5 text-traffic-low" aria-hidden />}
            {result.text}
            {result.ok && (
              <Link to="/saved" className="font-medium text-jmu-purple">
                View
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
