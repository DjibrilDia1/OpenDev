import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useDemo } from '../../state/store'
import type { ProfileRow } from '../../lib/adapters'
import type { CommunityPermission } from '../../types/community'

export interface CommunityAccess {
  is_owner: boolean
  role: 'owner' | 'moderator' | 'member' | null
  permissions: CommunityPermission[]
  notifications_enabled: boolean
}
export interface CommunityMemberRow {
  user_id: string
  role: 'owner' | 'moderator' | 'member'
  permissions?: CommunityPermission[]
  joined_at: string
  profile: ProfileRow | null
}
export function useCommunityAccess(communityId?: string) {
  const { state, remote } = useDemo()
  const [access, setAccess] = useState<CommunityAccess | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const identity = state.signedIn ? state.profile.id : ''
  const live = !!remote
  useEffect(() => {
    setAccess(null)
    if (!live || !identity || !communityId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api<CommunityAccess>(`/communities/${communityId}/permissions`)
      .then((result) => {
        if (!cancelled) setAccess(result)
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Impossible de charger les autorisations.',
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [communityId, identity, revision, live])
  return { access, loading, error, reload }
}
export const permissionLabels: Record<CommunityPermission, string> = {
  edit_community: 'Modifier la communauté',
  manage_members: 'Gérer les membres',
  moderate_posts: 'Modérer les publications',
  manage_events: 'Gérer les événements',
}
export function useCommunityPreview(communityId?: string, revision?: string) {
  const [members, setMembers] = useState<CommunityMemberRow[]>([])
  const [staff, setStaff] = useState<CommunityMemberRow[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    setMembers([])
    setStaff([])
    setError('')
    if (!communityId) return
    let cancelled = false
    Promise.all([
      api<CommunityMemberRow[]>(
        `/communities/${communityId}/members?limit=8&offset=0`,
      ),
      api<CommunityMemberRow[]>(
        `/communities/${communityId}/members?role=staff&limit=100&offset=0`,
      ),
    ])
      .then(([rows, team]) => {
        if (!cancelled) {
          setMembers(rows)
          setStaff(
            team.filter(
              (member) =>
                member.role === 'owner' || member.role === 'moderator',
            ),
          )
        }
      })
      .catch(() => {
        if (!cancelled)
          setError('Les membres ne peuvent pas être chargés pour le moment.')
      })
    return () => {
      cancelled = true
    }
  }, [communityId, revision])
  return { members, staff, error }
}
