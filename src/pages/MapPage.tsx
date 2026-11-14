import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CHALLENGE_BY_ID, ZONE_TO_MAP_FOCUS } from '../data/challenges'
import type { Challenge, ZoneDetails } from '../data/types'
import { ZoneDetailSheet } from '../components/ui/ZoneDetailSheet'
import { useChallengeProgress } from '../hooks/useChallengeProgress'
import { api } from '../services/api'

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

export function MapPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const preview = (location.state ?? null) as MapLocationState | null
  const previewZoneId = preview?.zoneId ?? null
  const previewChallengeId = preview?.challengeId ?? null

  const [iframeReady, setIframeReady] = useState(false)
  const [zoneDetails, setZoneDetails] = useState<ZoneDetails | null>(null)
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
