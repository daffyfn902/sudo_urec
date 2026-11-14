import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { FloorNumber, GymZone, ZoneOccupancy } from '../../data/types'
import { GymZone3D } from './GymZone3D'

interface GymScene3DProps {
  zones: GymZone[]
  occupancyByZone: Record<string, ZoneOccupancy>
  selectedZoneId: string | null
  floorFilter: FloorNumber | 'all'
  onSelectZone: (zoneId: string) => void
}

function CameraFocus({
  zones,
  selectedZoneId,
  controlsRef,
}: {
  zones: GymZone[]
  selectedZoneId: string | null
  controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()

  useEffect(() => {
    if (!selectedZoneId || !controlsRef.current) return
    const zone = zones.find((z) => z.id === selectedZoneId)
    if (!zone) return

    const target = {
      x: zone.position[0],
      y: zone.position[1] + 0.5,
      z: zone.position[2],
    }

    const startTarget = controlsRef.current.target.clone()
    const startPos = camera.position.clone()
    const endPos = {
      x: zone.position[0] + 4.5,
      y: zone.position[1] + 5.5,
      z: zone.position[2] + 4.5,
    }

    let frame = 0
    const frames = 40
    let raf = 0

    const animate = () => {
      frame += 1
      const t = Math.min(1, frame / frames)
      const ease = 1 - Math.pow(1 - t, 3)
      camera.position.set(
        startPos.x + (endPos.x - startPos.x) * ease,
        startPos.y + (endPos.y - startPos.y) * ease,
        startPos.z + (endPos.z - startPos.z) * ease,
      )
      controlsRef.current?.target.set(
        startTarget.x + (target.x - startTarget.x) * ease,
        startTarget.y + (target.y - startTarget.y) * ease,
        startTarget.z + (target.z - startTarget.z) * ease,
      )
      controlsRef.current?.update()
      if (t < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [camera, controlsRef, selectedZoneId, zones])

  return null
}

function BuildingShell({ showFloor2 }: { showFloor2: boolean }) {
  return (
    <group>
      {/* Ground floor slab */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[9.5, 0.16, 8.2]} />
        <meshStandardMaterial color="#f0ebf7" roughness={0.85} />
      </mesh>

      {/* Outer low walls floor 1 */}
      <mesh position={[0, 0.7, -4]}>
        <boxGeometry args={[9.5, 1.4, 0.12]} />
        <meshStandardMaterial color="#e4daf2" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.7, 4]}>
        <boxGeometry args={[9.5, 1.4, 0.12]} />
        <meshStandardMaterial color="#e4daf2" transparent opacity={0.35} />
      </mesh>
      <mesh position={[-4.7, 0.7, 0]}>
        <boxGeometry args={[0.12, 1.4, 8]} />
        <meshStandardMaterial color="#e4daf2" transparent opacity={0.45} />
      </mesh>
      <mesh position={[4.7, 0.7, 0]}>
        <boxGeometry args={[0.12, 1.4, 8]} />
        <meshStandardMaterial color="#e4daf2" transparent opacity={0.45} />
      </mesh>

      {/* Second floor slab */}
      {showFloor2 && (
        <>
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[9.2, 0.12, 7.8]} />
            <meshStandardMaterial color="#ebe3f7" transparent opacity={0.75} roughness={0.8} />
          </mesh>
          <mesh position={[-4.5, 1.2, -3.5]}>
            <boxGeometry args={[0.35, 2.4, 0.35]} />
            <meshStandardMaterial color="#cbb8e8" />
          </mesh>
          <mesh position={[4.5, 1.2, -3.5]}>
            <boxGeometry args={[0.35, 2.4, 0.35]} />
            <meshStandardMaterial color="#cbb8e8" />
          </mesh>
          <mesh position={[-4.5, 1.2, 3.5]}>
            <boxGeometry args={[0.35, 2.4, 0.35]} />
            <meshStandardMaterial color="#cbb8e8" />
          </mesh>
          <mesh position={[4.5, 1.2, 3.5]}>
            <boxGeometry args={[0.35, 2.4, 0.35]} />
            <meshStandardMaterial color="#cbb8e8" />
          </mesh>
        </>
      )}

      {/* Entrance marker */}
      <mesh position={[0, 0.02, 4.3]}>
        <boxGeometry args={[1.6, 0.04, 0.5]} />
        <meshStandardMaterial color="#450084" />
      </mesh>
    </group>
  )
}

function SceneContent({
  zones,
  occupancyByZone,
  selectedZoneId,
  floorFilter,
  onSelectZone,
}: GymScene3DProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const visibleZones = useMemo(() => {
    if (floorFilter === 'all') return zones
    return zones.filter((z) => z.floor === floorFilter)
  }, [floorFilter, zones])

  return (
    <>
      <color attach="background" args={['#f7f4fb']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow />
      <directionalLight position={[-6, 8, -4]} intensity={0.35} />

      <BuildingShell showFloor2={floorFilter === 'all' || floorFilter === 2} />

      {visibleZones.map((zone) => {
        const occupancy = occupancyByZone[zone.id]
        if (!occupancy) return null
        return (
          <GymZone3D
            key={zone.id}
            zone={zone}
            occupancy={occupancy}
            selected={selectedZoneId === zone.id}
            dimmed={Boolean(selectedZoneId && selectedZoneId !== zone.id)}
            onSelect={onSelectZone}
          />
        )
      })}

      <ContactShadows position={[0, -0.12, 0]} opacity={0.35} scale={14} blur={2.5} far={8} />
      <Environment preset="city" />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        minPolarAngle={0.35}
        maxPolarAngle={1.35}
        minDistance={6}
        maxDistance={18}
        target={[0, 1.2, 0]}
      />
      <CameraFocus zones={zones} selectedZoneId={selectedZoneId} controlsRef={controlsRef} />
    </>
  )
}

export function GymScene3D(props: GymScene3DProps) {
  return (
    <div className="h-full w-full touch-none">
      <Canvas
        camera={{ position: [9, 9, 9], fov: 42, near: 0.1, far: 100 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}
