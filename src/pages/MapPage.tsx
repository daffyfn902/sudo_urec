// The /map route renders the standalone three.js scene in public/urec-3d.html.
export function MapPage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#E9EDF4]">
      <iframe
        src="/urec-3d.html"
        title="3D UREC building map"
        className="absolute inset-x-0 top-0 block w-full border-0 bg-[#E9EDF4]"
        style={{ height: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))' }}
      />
    </div>
  )
}
