export function TrafficLegend() {
  const items = [
    { color: 'bg-traffic-low', label: '< 40%' },
    { color: 'bg-traffic-moderate', label: '40–74%' },
    { color: 'bg-traffic-high', label: '75%+' },
  ]

  return (
    <div className="glass-panel flex items-center gap-3 rounded-full px-3 py-2 text-[11px] font-medium text-ink-muted">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
