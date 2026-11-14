import { useMemo, useRef, useState } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { GymZone, ZoneOccupancy } from '../../data/types'
import { trafficColor } from '../../utils/traffic'

interface GymZone3DProps {
  zone: GymZone
  occupancy: ZoneOccupancy
  selected: boolean
  dimmed: boolean
  onSelect: (zoneId: string) => void
}

export function GymZone3D({ zone, occupancy, selected, dimmed, onSelect }: GymZone3DProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const overlayColor = trafficColor(occupancy.status)

  const equipment = useMemo(() => {
    const items: Array<{ position: [number, number, number]; size: [number, number, number] }> = []
    const [w, , d] = zone.size
    const count = zone.preference === 'courts' ? 2 : zone.preference === 'cardio' ? 5 : 4

    for (let i = 0; i < count; i++) {
      const x = -w / 2 + 0.5 + (i % 3) * Math.min(1.1, w / 3)
      const z = -d / 2 + 0.55 + Math.floor(i / 3) * 0.9
      items.push({
        position: [x, 0.28, z],
        size:
          zone.preference === 'cardio'
            ? [0.35, 0.45, 0.7]
            : zone.preference === 'courts'
              ? [0.15, 0.9, 0.15]
              : [0.55, 0.35, 0.35],
      })
    }
    return items
  }, [zone])

  useFrame(() => {
    if (!meshRef.current) return
    const targetY = selected ? 0.08 : hovered ? 0.04 : 0
    meshRef.current.position.y += (zone.position[1] + targetY - meshRef.current.position.y) * 0.15
  })

  return (
    <group>
      {/* Floor plate */}
      <mesh
        ref={meshRef}
        position={zone.position}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(zone.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={zone.size} />
        <meshStandardMaterial
          color={zone.color}
          transparent
          opacity={dimmed ? 0.25 : selected ? 0.95 : 0.82}
          roughness={0.55}
          metalness={0.08}
        />
      </mesh>

      {/* Traffic overlay */}
      <mesh position={[zone.position[0], zone.position[1] + 0.08, zone.position[2]]}>
        <boxGeometry args={[zone.size[0] * 0.92, 0.04, zone.size[2] * 0.92]} />
        <meshStandardMaterial
          color={overlayColor}
          transparent
          opacity={dimmed ? 0.15 : selected ? 0.55 : 0.38}
          roughness={0.4}
        />
      </mesh>

      {/* Low walls */}
      {[
        [0, zone.size[2] / 2],
        [0, -zone.size[2] / 2],
        [zone.size[0] / 2, 0],
        [-zone.size[0] / 2, 0],
      ].map(([ox, oz], i) => {
        const isX = i < 2
        return (
          <mesh
            key={i}
            position={[
              zone.position[0] + (ox as number),
              zone.position[1] + 0.35,
              zone.position[2] + (oz as number),
            ]}
          >
            <boxGeometry
              args={isX ? [zone.size[0], 0.55, 0.08] : [0.08, 0.55, zone.size[2]]}
            />
            <meshStandardMaterial
              color="#d8cceb"
              transparent
              opacity={dimmed ? 0.2 : 0.65}
              roughness={0.7}
            />
          </mesh>
        )
      })}

      {/* Simple equipment silhouettes */}
      {equipment.map((item, index) => (
        <mesh
          key={index}
          position={[
            zone.position[0] + item.position[0],
            zone.position[1] + item.position[1],
            zone.position[2] + item.position[2],
          ]}
        >
          <boxGeometry args={item.size} />
          <meshStandardMaterial
            color={selected ? '#2e0058' : '#6b6575'}
            transparent
            opacity={dimmed ? 0.15 : 0.55}
            roughness={0.6}
          />
        </mesh>
      ))}

      <Text
        position={[zone.position[0], zone.position[1] + 0.95, zone.position[2]]}
        fontSize={0.28}
        color={dimmed ? '#b0a8bc' : '#1a1225'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#ffffff"
      >
        {zone.label}
      </Text>
      <Text
        position={[zone.position[0], zone.position[1] + 0.65, zone.position[2]]}
        fontSize={0.22}
        color={overlayColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#ffffff"
      >
        {`${occupancy.occupancyPercent}%`}
      </Text>
    </group>
  )
}
