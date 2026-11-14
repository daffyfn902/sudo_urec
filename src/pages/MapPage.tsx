import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CHALLENGE_BY_ID, ZONE_TO_MAP_FOCUS } from '../data/challenges'
import type { Challenge, DayZoneReading, ZoneDetails } from '../data/types'
import { ZoneDetailSheet } from '../components/ui/ZoneDetailSheet'
import { useChallengeProgress } from '../hooks/useChallengeProgress'
import { api } from '../services/api'
import { todayISODate } from '../utils/time'

interface MapLocationState {
  challengeId?: string
  zoneId?: string
}

function postFocusZone(iframe: HTMLIFrameElement | null, appZoneId: string) {
  const mapping = ZONE_TO_MAP_FOCUS[appZoneId]
  if (!mapping || !iframe?.contentWindow) return
  iframe.contentWindow.postMessage(
    {
      type: 'urec:focus-zone',
      zoneId: mapping.mapZoneId,
      floor: mapping.floor,
    },
    window.location.origin,
  )
}

function postClearHighlight(iframe: HTMLIFrameElement | null) {
  iframe?.contentWindow?.postMessage({ type: 'urec:clear-highlight' }, window.location.origin)
}

/** Send the backend's hourly forecast for all 25 real zones into the 3D map. */
function postOccupancy(iframe: HTMLIFrameElement | null, day: DayZoneReading[]) {
  if (!iframe?.contentWindow || day.length === 0) return
  const zones: Record<string, Array<{ hour: number; pct: number; open: boolean }>> = {}
  for (const r of day) {
    ;(zones[r.zoneId] ??= []).push({ hour: r.hour, pct: r.occupancyPercent, open: r.isOpen })
  }
  iframe.contentWindow.postMessage(
    { type: 'urec:occupancy', zones, label: 'Forecast' },
    window.location.origin,
  )
}

export function MapPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const preview = (location.state ?? null) as MapLocationState | null
  const previewZoneId = preview?.zoneId ?? null
  const previewChallengeId = preview?.challengeId ?? null

  const [iframeReady, setIframeReady] = useState(false)
  const [zoneDetails, setZoneDetails] = useState<ZoneDetails | null>(null)
  const [day, setDay] = useState<DayZoneReading[]>([])
  const activeChallenge: Challenge | null = previewChallengeId
    ? (CHALLENGE_BY_ID[previewChallengeId] ?? null)
    : null
  const { isComplete, complete } = useChallengeProgress()

  useEffect(() => {
    if (!previewZoneId) {
      setZoneDetails(null)
      return
    }

    let cancelled = false
    void api.getZoneDetails(previewZoneId).then((details) => {
      if (!cancelled) setZoneDetails(details)
    })
    return () => {
      cancelled = true
    }
  }, [previewZoneId])

  useEffect(() => {
    if (!iframeReady || !previewZoneId) return
    postFocusZone(iframeRef.current, previewZoneId)
  }, [iframeReady, previewZoneId])

  // Today's forecast for every real zone. Empty if the backend is off: the map then keeps its built-in curves.
  useEffect(() => {
    let cancelled = false
    void api.getDay(todayISODate()).then((rows) => {
      if (!cancelled) setDay(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (iframeReady) postOccupancy(iframeRef.current, day)
  }, [iframeReady, day])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as { type?: string } | null
      if (data?.type === 'urec:ready') setIframeReady(true)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const handleClose = () => {
    setZoneDetails(null)
    postClearHighlight(iframeRef.current)
    if (location.state) {
      navigate('/map', { replace: true, state: null })
    }
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#E9EDF4]">
      <iframe
        ref={iframeRef}
        src="/urec-3d.html"
        title="3D UREC building map"
        className="absolute inset-x-0 top-0 block w-full border-0 bg-[#E9EDF4]"
        style={{ height: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))' }}
        onLoad={() => {
          setIframeReady(true)
          if (previewZoneId) postFocusZone(iframeRef.current, previewZoneId)
        }}
      />

      <ZoneDetailSheet
        details={zoneDetails}
        challenge={activeChallenge}
        challengeCompleted={activeChallenge ? isComplete(activeChallenge.id) : false}
        onClose={handleClose}
        onCompleteChallenge={
          activeChallenge ? () => complete(activeChallenge.id) : undefined
        }
      />
    </div>
  )
}
