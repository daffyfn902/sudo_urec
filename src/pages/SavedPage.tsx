import { useCallback } from 'react'
import { Bookmark, DatabaseZap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { LiftCard } from '../components/social/LiftCard'
import { SavedPlanCard } from '../components/ui/SavedPlanCard'
import { useSavedPlans } from '../hooks/useSavedPlans'
import { useSocial } from '../hooks/useSocial'
import type { FriendsData, LiftsData } from '../data/types'
import { social } from '../services/social'

const loadSaved = async (): Promise<{ lifts: LiftsData; friends: FriendsData }> => {
  const [lifts, friends] = await Promise.all([social.lifts(), social.friends()])
  return { lifts, friends }
}

export function SavedPage() {
  const { data, loading, unavailable, error, reload } = useSocial(loadSaved)
  const { plans: devicePlans, remove: removeDevicePlan } = useSavedPlans()
  const onChanged = useCallback(() => reload(), [reload])

  const mine = data?.lifts.mine ?? []
  const invited = data?.lifts.invited ?? []
  const pendingInvites = invited.filter((l) => l.myStatus === 'pending')
  const answeredInvites = invited.filter((l) => l.myStatus !== 'pending')
  const nothing = !loading && mine.length === 0 && invited.length === 0 && devicePlans.length === 0

  return (
    <div className="page-shell safe-top">
      <PageHeader
        eyebrow="Saved"
        title="Your lifts"
        subtitle="Workouts you planned and invitations from friends."
        actions={
          !nothing ? (
            <Link to="/plan" className="btn-ghost hidden sm:inline-flex">
              Plan another
            </Link>
          ) : undefined
        }
      />

      {unavailable && (
        <div className="card-surface mb-4 flex items-start gap-3 p-4">
          <DatabaseZap className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink-muted">
            The lifts database is offline, so only plans saved on this device are shown. Start it with{' '}
            <code className="rounded bg-jmu-mist px-1 py-0.5 text-[12px]">python -m backend.db start</code> and the
            backend.
          </p>
        </div>
      )}
      {error && <p className="mb-4 text-[13px] text-red-600">{error}</p>}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card-surface h-36 animate-pulse bg-jmu-lavender/40" />
          <div className="card-surface h-36 animate-pulse bg-jmu-lavender/30" />
        </div>
      ) : nothing ? (
        <div className="card-surface flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-jmu-lavender text-jmu-purple">
            <Bookmark className="h-5 w-5" strokeWidth={2} />
          </div>
          <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">No lifts yet</h2>
          <p className="mt-1.5 max-w-[16rem] text-[14px] leading-relaxed text-ink-muted">
            Find a quiet time on Plan, save it, and invite a friend along.
          </p>
          <Link
            to="/plan"
            className="btn-primary mt-6 px-5 py-3"
          >
            Find a time
          </Link>
        </div>
      ) : (
        <div className="space-y-7">
          {pendingInvites.length > 0 && (
            <section aria-labelledby="invites-title">
              <h2 id="invites-title" className="section-label mb-3 text-jmu-purple">
                Invitations · {pendingInvites.length} new
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {pendingInvites.map((lift) => (
                  <LiftCard key={lift.id} lift={lift} onChanged={onChanged} />
                ))}
              </div>
            </section>
          )}

          {(mine.length > 0 || !unavailable) && (
            <section aria-labelledby="mine-title">
              <h2 id="mine-title" className="section-label mb-3">
                My lifts
              </h2>
              {mine.length === 0 ? (
                <p className="card-surface p-4 text-[13px] text-ink-muted">
                  Nothing planned.{' '}
                  <Link to="/plan" className="font-medium text-jmu-purple">
                    Find a time
                  </Link>
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {mine.map((lift) => (
                    <LiftCard key={lift.id} lift={lift} friends={data?.friends.friends} onChanged={onChanged} />
                  ))}
                </div>
              )}
            </section>
          )}

          {answeredInvites.length > 0 && (
            <section aria-labelledby="joined-title">
              <h2 id="joined-title" className="section-label mb-3">
                Friends' lifts
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {answeredInvites.map((lift) => (
                  <LiftCard key={lift.id} lift={lift} onChanged={onChanged} />
                ))}
              </div>
            </section>
          )}

          {devicePlans.length > 0 && (
            <section aria-labelledby="device-title">
              <h2 id="device-title" className="section-label mb-3">
                Saved on this device
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {devicePlans.map((plan) => (
                  <SavedPlanCard key={plan.id} plan={plan} onRemove={removeDevicePlan} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
