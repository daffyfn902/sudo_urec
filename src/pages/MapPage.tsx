import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { GymScene3D } from '../components/gym/GymScene3D'
import { FloorSelector } from '../components/ui/FloorSelector'
import { TrafficLegend } from '../components/ui/TrafficLegend'
import { TimeSlider } from '../components/ui/TimeSlider'
import { ZoneDetailSheet } from '../components/ui/ZoneDetailSheet'
import { ScenarioInput } from '../components/ui/ScenarioInput'
import { TrafficBadge } from '../components/ui/TrafficBadge'
import { useGymData } from '../hooks/useGymData'
import type { FloorNumber } from '../data/types'
import { formatHour, getSimulatedCurrentHour } from '../utils/time'

export function MapPage() {
  const {
    zones,
    scenarios,
    scenarioId,
    setScenarioId,
    selectedHour,
    setSelectedHour,
    resetToNow,
    overview,
    occupancyByZone,
    selectedZoneId,
    setSelectedZoneId,
    zoneDetails,
    applyScenarioText,
    loading,
  } = useGymData()

  const [floorFilter, setFloorFilter] = useState<FloorNumber | 'all'>('all')
  const [scenarioOpen, setScenarioOpen] = useState(false)

  const quieterAlternative = useMemo(() => {
    if (!selectedZoneId) return null
    const candidates = Object.values(occupancyByZone)
      .filter((o) => o.zoneId !== selectedZoneId)
      .sort((a, b) => a.occupancyPercent - b.occupancyPercent)
    return candidates[0]?.zoneId ?? null
  }, [occupancyByZone, selectedZoneId])

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-jmu-lavender">
      {/* 3D viewport */}
      <div className="absolute inset-0 bottom-0">
        {loading && zones.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="card-surface px-6 py-4 text-sm text-ink-muted">Loading 3D UREC…</div>
          </div>
        ) : (
          <GymScene3D
            zones={zones}
            occupancyByZone={occupancyByZone}
            selectedZoneId={selectedZoneId}
            floorFilter={floorFilter}
            onSelectZone={setSelectedZoneId}
          />
        )}
      </div>

      {/* Top floating controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 safe-top">
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2 px-3 pt-3 sm:px-4">
          <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4">
            <div>
              <h1 className="text-sm font-bold text-ink sm:text-base">3D UREC Map</h1>
              <p className="text-[11px] text-ink-subtle">
                Simulated · {formatHour(selectedHour)}
                {overview ? ` · ${overview.overallOccupancyPercent}% overall` : ''}
              </p>
            </div>
            {overview && <TrafficBadge status={overview.status} size="sm" />}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FloorSelector value={floorFilter} onChange={setFloorFilter} />
            <TrafficLegend />
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-20 z-30 px-3 sm:bottom-24 sm:px-4">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-2">
          <div className="glass-panel overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setScenarioOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold text-ink"
            >
              Scenario presets
              {scenarioOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            {scenarioOpen && (
              <div className="border-t border-border px-3 pb-3 pt-2">
                <ScenarioInput
                  scenarios={scenarios}
                  activeScenarioId={scenarioId}
                  onSelectScenario={setScenarioId}
                  onApplyText={applyScenarioText}
                  compact
                />
              </div>
            )}
          </div>

          <TimeSlider
            value={selectedHour}
            onChange={setSelectedHour}
            onResetNow={resetToNow}
            currentHour={getSimulatedCurrentHour()}
          />
        </div>
      </div>

      <ZoneDetailSheet
        details={zoneDetails}
        onClose={() => setSelectedZoneId(null)}
        onFindAlternative={() => {
          if (quieterAlternative) setSelectedZoneId(quieterAlternative)
        }}
      />
    </div>
  )
}
