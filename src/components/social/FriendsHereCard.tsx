import { Link } from 'react-router-dom'
import { ArrowUpRight, Users } from 'lucide-react'
import { useSocial } from '../../hooks/useSocial'
import { social } from '../../services/social'
import { Avatar } from './Avatar'

/** Home-page card: which friends are at UREC right now. Hidden when the database is offline. */
export function FriendsHereCard() {
  const { data, unavailable } = useSocial(social.friends)
  if (unavailable || !data) return null

  const here = data.friends.filter((f) => f.atUrec)
  const requests = data.incoming.length

  return (
    <Link
      to="/friends"
      className="pressable group card-surface flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:border-border-strong hover:bg-jmu-lavender/30"
    >
      <div className="flex min-w-0 items-center gap-3">
        {here.length > 0 ? (
          <span className="flex shrink-0 -space-x-2">
            {here.slice(0, 3).map((f) => (
              <Avatar key={f.username} user={f} present />
            ))}
          </span>
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-jmu-lavender text-jmu-purple">
            <Users className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
            {here.length === 0
              ? 'No friends at UREC right now'
              : here.length === 1
                ? `${here[0].displayName} is at UREC`
                : `${here.length} friends are at UREC`}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-ink-muted">
            {here.length > 0
              ? here.map((f) => `${f.displayName}${f.atUrec?.zoneLabel ? ` · ${f.atUrec.zoneLabel}` : ''}`).join('   ')
              : 'Invite someone to your next lift'}
            {requests > 0 && ` · ${requests} friend request${requests > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-subtle transition group-hover:text-jmu-purple" />
    </Link>
  )
}
