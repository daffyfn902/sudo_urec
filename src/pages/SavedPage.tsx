import { Bookmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SavedPlanCard } from '../components/ui/SavedPlanCard'
import { useSavedPlans } from '../hooks/useSavedPlans'

export function SavedPage() {
  const { plans, remove } = useSavedPlans()

  return (
    <div className="safe-top px-4 pb-4 pt-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Saved plans</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Workout windows you&apos;ve saved. Stored on this device.
        </p>
      </header>

      {plans.length === 0 ? (
        <div className="card-surface flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-jmu-lavender text-jmu-purple">
            <Bookmark className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-ink">No saved plans yet</h2>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            Build a recommendation on the Plan page and tap Save Plan to keep it here.
          </p>
          <Link
            to="/plan"
            className="mt-6 rounded-2xl bg-jmu-purple px-5 py-3 text-sm font-semibold text-white hover:bg-jmu-purple-dark"
          >
            Find a time
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <SavedPlanCard key={plan.id} plan={plan} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
