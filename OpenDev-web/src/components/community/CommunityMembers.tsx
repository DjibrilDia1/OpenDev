import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { toUser, type ProfileRow } from '../../lib/adapters'
import { PersonRow } from '../profile/PersonRow'

interface Membership {
  user_id: string
  role: 'owner' | 'moderator' | 'member'
  joined_at: string
  profile: ProfileRow | null
}

export function CommunityMembers({ communityId }: { communityId: string }) {
  const [rows, setRows] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const busy = useRef(false)
  const path = '/communities/' + communityId + '/members?limit=100'
  useEffect(() => {
    let active = true
    api<Membership[]>(path)
      .then((data) => {
        if (!active) return
        setRows(data)
        setMore(data.length === 100)
        setError('')
      })
      .catch(() => {
        if (active) setError('Impossible de charger les membres. Réessaie.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [path, attempt])

  async function loadMore() {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setError('')
    try {
      const data = await api<Membership[]>(path + '&offset=' + rows.length)
      setRows((previous) => [...previous, ...data])
      setMore(data.length === 100)
    } catch {
      setError('Impossible de charger les membres. Réessaie.')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }
  return (
    <section className="surface" aria-busy={loading}>
      {rows.flatMap((row) =>
        row.profile
          ? [
              <div key={row.user_id} className="community-directory-member">
                {row.role !== 'member' && (
                  <p className="small muted">
                    {row.role === 'owner' ? 'Administrateur' : 'Modérateur'}
                  </p>
                )}
                <PersonRow user={toUser(row.profile)} />
              </div>,
            ]
          : [],
      )}
      {loading && (
        <div className="centered" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          <span className="sr-only">Chargement des membres</span>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="muted">
          Cette communauté accueille ses premiers membres.
        </p>
      )}
      {error && (
        <div role="alert">
          <p className="field-error">{error}</p>
          <button
            type="button"
            className="button secondary mt-3"
            disabled={loading}
            onClick={() => {
              if (rows.length) void loadMore()
              else {
                setLoading(true)
                setAttempt((previous) => previous + 1)
              }
            }}
          >
            Réessayer
          </button>
        </div>
      )}
      {!error && more && (
        <button
          type="button"
          className="button secondary mt-3"
          disabled={loading}
          onClick={() => void loadMore()}
        >
          Afficher plus de membres
        </button>
      )}
    </section>
  )
}
