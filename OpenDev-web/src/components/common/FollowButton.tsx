import type { User } from '../../types'
import { useState } from 'react'
import { useDemo } from '../../state/store'
export function FollowButton({ user }: { user: User }) {
  const { state, toggleFollow, remote, requireAuth, notify } = useDemo()
  const [pending, setPending] = useState(false)
  if (user.isSelf || user.id === state.profile.id) return null
  const following = state.signedIn && state.following.includes(user.id)
  return (
    <button
      disabled={pending}
      className={'button compact ' + (following ? 'secondary' : '')}
      aria-pressed={following}
      aria-label={(following ? 'Ne plus suivre ' : 'Suivre ') + user.name}
      onClick={async () => {
        if (!requireAuth() || pending) return
        if (!remote) {
          toggleFollow(user.id)
          return
        }
        setPending(true)
        try {
          await remote.request(
            '/profiles/' + user.id + '/follow',
            following ? 'DELETE' : 'PUT',
          )
          await remote.refresh()
        } catch (cause) {
          notify(
            cause instanceof Error
              ? cause.message
              : 'Impossible de modifier cet abonnement.',
          )
        } finally {
          setPending(false)
        }
      }}
    >
      {pending ? '…' : following ? '✓ Suivi' : 'Suivre'}
    </button>
  )
}
