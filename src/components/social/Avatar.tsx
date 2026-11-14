import type { SocialUser } from '../../data/types'

interface AvatarProps {
  user: SocialUser
  size?: 'sm' | 'md'
  /** Green dot: at UREC right now */
  present?: boolean
}

export function Avatar({ user, size = 'md', present = false }: AvatarProps) {
  const box = size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-9 w-9 text-[14px]'
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={`flex ${box} items-center justify-center rounded-full font-semibold text-white`}
        style={{ backgroundColor: user.color }}
        aria-hidden
      >
        {user.displayName.charAt(0).toUpperCase()}
      </span>
      {present && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-traffic-low" />
      )}
    </span>
  )
}
