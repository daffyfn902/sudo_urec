import { useState, type FormEvent } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import type { ScenarioKnobs } from '../../data/types'

interface ScenarioInputProps {
  scenarios: ScenarioKnobs[]
  activeScenarioId: string | null
  onSelectScenario: (id: string | null) => void
  onApplyText: (text: string) => Promise<ScenarioKnobs | null>
  compact?: boolean
}

export function ScenarioInput({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onApplyText,
  compact = false,
}: ScenarioInputProps) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      const matched = await onApplyText(text)
      if (matched) {
        setStatus(`Applied “${matched.label}”`)
        setText('')
      } else {
        setStatus('No matching scenario — try a preset below')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={compact ? '' : 'card-surface p-4 sm:p-5'}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-jmu-lavender text-jmu-purple">
          <Wand2 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">What if…</h3>
          <p className="text-[11px] text-ink-subtle">Type any what-if, or tap a preset</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What if it's finals week?"
          className="min-w-0 flex-1 rounded-xl border border-border bg-jmu-mist px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-jmu-purple/40 focus:ring-2 focus:ring-jmu-purple/15"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-jmu-purple px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-jmu-purple-dark disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Apply
        </button>
      </form>

      {status && <p className="mt-2 text-xs text-ink-muted">{status}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {scenarios
          .filter((s) => s.id !== 'normal')
          .map((scenario) => {
            const active = activeScenarioId === scenario.id
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelectScenario(active ? null : scenario.id)}
                className={[
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                  active
                    ? 'border-jmu-purple bg-jmu-purple text-white'
                    : 'border-border bg-surface text-ink-muted hover:border-border-strong',
                ].join(' ')}
              >
                {scenario.label}
              </button>
            )
          })}
        {activeScenarioId && (
          <button
            type="button"
            onClick={() => onSelectScenario(null)}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-ink-subtle hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
