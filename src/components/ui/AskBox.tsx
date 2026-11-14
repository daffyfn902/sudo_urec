import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowUp, Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react'
import type { AskResult } from '../../data/types'
import { api } from '../../services/api'

const EXAMPLES = [
  "I'm new and kind of nervous, when's the quietest time to try the weight room this week?",
  'Is the pool packed tonight?',
  "What if it's finals week and raining?",
]

const DOT: Record<string, string> = {
  '🟢': 'bg-traffic-low',
  '🟡': 'bg-traffic-moderate',
  '🔴': 'bg-traffic-high',
}

/** Render one line of the reply: **bold** spans, _italic notes_ and 🟢🟡🔴 as the app's status dots. */
function renderLine(line: string, key: number): ReactNode {
  const note = /^_(.*)_$/.exec(line.trim())
  if (note) {
    return (
      <p key={key} className="text-[12px] italic text-ink-subtle">
        {note[1]}
      </p>
    )
  }
  const dot = Object.keys(DOT).find((d) => line.startsWith(d))
  const body = dot ? line.slice(dot.length).trim() : line
  const parts = body.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
  return (
    <p key={key} className="flex items-start gap-2 text-[14px] leading-relaxed text-ink-muted">
      {dot && <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${DOT[dot]}`} aria-hidden />}
      <span>{parts}</span>
    </p>
  )
}

export function AskBox() {
  const [text, setText] = useState('')
  const [asked, setAsked] = useState<string | null>(null)
  const [result, setResult] = useState<AskResult | null>(null)
  const [busy, setBusy] = useState(false)

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    setBusy(true)
    setAsked(q)
    setResult(null)
    try {
      setResult(await api.ask(q))
      setText('')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void ask(text)
  }

  const source = result?.request?.source
  const sourceLabel =
    source === 'llm' ? 'Read by AI' : source === 'keyword' ? 'Keyword match' : null

  return (
    <section className="card-surface p-4 sm:p-5" aria-labelledby="ask-title">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-jmu-lavender text-jmu-purple">
          <MessageCircleQuestion className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2 id="ask-title" className="text-sm font-semibold text-ink">
            Ask about crowds
          </h2>
          <p className="text-[11px] text-ink-subtle">Plain English · answers come from the forecast</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="When's the best time to lift tomorrow?"
          aria-label="Ask a question about how busy UREC will be"
          disabled={busy}
          className="min-w-0 flex-1 rounded-xl border border-border bg-jmu-mist px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-jmu-purple/40 focus:ring-2 focus:ring-jmu-purple/15 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label="Ask"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-jmu-purple px-3.5 py-2.5 text-white transition hover:bg-jmu-purple-dark disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.5} />}
        </button>
      </form>

      {!asked && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => void ask(example)}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-left text-[11px] font-medium text-ink-muted transition hover:border-border-strong hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {asked && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[12px] font-medium text-ink">“{asked}”</p>

            {busy ? (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-subtle">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-jmu-purple" aria-hidden />
                Reading your question…
              </p>
            ) : (
              result && (
                <div className="mt-2 space-y-1.5">
                  {(result.understood || sourceLabel) && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {result.understood && (
                        <span className="rounded-full bg-jmu-lavender px-2.5 py-1 text-[11px] font-medium text-jmu-purple">
                          Understood: {result.understood}
                        </span>
                      )}
                      {sourceLabel && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-ink-subtle">
                          {sourceLabel}
                        </span>
                      )}
                    </div>
                  )}
                  {result.text.split('\n').filter(Boolean).map(renderLine)}
                  <p className="pt-1 text-[10px] text-ink-subtle">Simulated forecast</p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  )
}
