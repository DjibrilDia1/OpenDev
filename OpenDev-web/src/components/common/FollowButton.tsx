import type { User } from '../../types'
import { useDemo } from '../../state/store'
export function FollowButton({ user }: { user: User }) {
  const { state, toggleFollow } = useDemo()
  if (user.isSelf) return null
  const following = state.signedIn && state.following.includes(user.id)
  return (
    <button
      className={'button compact ' + (following ? 'secondary' : '')}
      aria-pressed={following}
      aria-label={(following ? 'Ne plus suivre ' : 'Suivre ') + user.name}
      onClick={() => toggleFollow(user.id)}
    >
      {following ? '✓ Suivi' : 'Suivre'}
    </button>
  )
}
