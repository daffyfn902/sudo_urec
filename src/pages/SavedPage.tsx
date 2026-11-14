import { Bookmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { SavedPlanCard } from '../components/ui/SavedPlanCard'
import { useSavedPlans } from '../hooks/useSavedPlans'

export function SavedPage() {
  const { plans, remove } = useSavedPlans()

  return (
    <div className="page-shell safe-top">
      <PageHeader
        eyebrow="Saved"
        title="Your plans"
        subtitle="Workout windows you saved. They're stored on this device."
        actions={
          plans.length > 0 ? (
            <Link to="/plan" className="btn-ghost hidden sm:inline-flex">
              Add another
            </Link>
          ) : undefined
        }
      />

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
            className="btn-primary mt-6 px-5 py-3"
          >
            Find a time
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <SavedPlanCard key={plan.id} plan={plan} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
