import { ProfilePage } from './ProfilePage'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDemo } from '../state/store'
import { toUser, type ProfileRow } from '../lib/adapters'
import type { User } from '../types'
import { AppLayout } from '../components/layout/AppLayout'

function LiveUserProfile({ handle }: { handle: string }) {
  const { remote, state, allPosts } = useDemo()
  const request = remote!.request
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    void request<ProfileRow>('/profiles/' + encodeURIComponent(handle))
      .then((row) => {
        if (active) {
          setUser({ ...toUser(row), isSelf: row.id === state.profile.id })
          setError('')
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : 'Chargement impossible.',
          )
      })
    return () => {
      active = false
    }
  }, [handle, request, retry, state.profile.id, allPosts])
  if (user) return <ProfilePage profile={user} />
  return (
    <AppLayout>
      {error ? (
        <div className="surface" role="alert">
          <p>{error}</p>
          <button
            className="button secondary mt-4"
            onClick={() => setRetry(retry + 1)}
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="centered" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          <span className="sr-only">Chargement du profil…</span>
        </div>
      )}
    </AppLayout>
  )
}
export function UserProfilePage() {
  const { remote, state } = useDemo()
  const { handle = '' } = useParams()
  if (remote)
    return <LiveUserProfile key={handle + state.profile.id} handle={handle} />
  return <ProfilePage />
}
