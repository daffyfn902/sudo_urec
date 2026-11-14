// The /map route renders the standalone three.js scene in public/urec-3d.html.
// It ships its own three.js build and sizes itself from the iframe's window,
// so the iframe just has to fill the space above the bottom navigation.
export function MapPage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0d1b33]">
      <iframe
        src="/urec-3d.html"
        title="3D UREC building map"
        className="absolute inset-x-0 top-0 block w-full border-0"
        style={{ height: 'calc(100dvh - 86px - env(safe-area-inset-bottom, 0px))' }}
      />
    </div>
  )
}
