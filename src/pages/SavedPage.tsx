import { Bookmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SavedPlanCard } from '../components/ui/SavedPlanCard'
import { useSavedPlans } from '../hooks/useSavedPlans'

export function SavedPage() {
  const { plans, remove } = useSavedPlans()

  return (
    <div className="page-shell safe-top">
      <header className="mb-7">
        <h1 className="page-title">Saved</h1>
        <p className="page-subtitle">Workout windows stored on this device.</p>
      </header>

      {plans.length === 0 ? (
        <div className="card-surface flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-jmu-lavender text-jmu-purple">
            <Bookmark className="h-5 w-5" strokeWidth={2} />
          </div>
          <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">No plans yet</h2>
          <p className="mt-1.5 max-w-[16rem] text-[14px] leading-relaxed text-ink-muted">
            Save a recommendation from Plan to keep it here.
          </p>
          <Link
            to="/plan"
            className="pressable mt-6 rounded-[14px] bg-jmu-purple px-5 py-3 text-[14px] font-semibold text-white hover:bg-jmu-purple-dark"
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
