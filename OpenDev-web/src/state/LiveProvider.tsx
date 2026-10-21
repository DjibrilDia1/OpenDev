import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { api } from '../lib/api'
import { authErrorMessage } from '../lib/auth-errors'
import {
  toUser,
  toPost,
  toCommunity,
  toEvent,
  initials,
  type ProfileRow,
  type CommunityRow,
  type PostRow,
  type EventRow,
} from '../lib/adapters'
import { DemoContext, type DemoState, type Comment } from './store'
import { initialState } from './initialState'
import type { Community, User } from '../types'
import type { SignupProfile } from '../types/user'
import type { CommunityEvent } from '../types/event'
import type { ThanksTag } from '../types/contribution'

const emptyState: DemoState = {
  ...initialState,
  signedIn: false,
  onboarded: true,
  profile: {
    id: '',
    name: '',
    handle: '',
    avatarInitials: '',
    roleTitle: '',
    contributionsCount: 0,
    communitiesCount: 0,
  },
  projects: [],
  conversations: [],
  joined: [],
  posts: [],
  following: [],
  comments: {},
  saved: [],
  liked: [],
  readNotifications: true,
}
interface CommunicationCounts {
  messages_unread: number
  notifications_unread: number
}
interface MyState {
  saved?: { post_id: string }[]
  following?: string[]
  preferences?: { interests: string[] } | null
  profile: ProfileRow | null
  memberships: {
    community_id: string
    role: string
    permissions?: string[]
    notifications_enabled?: boolean
  }[]
  likes: { post_id: string }[]
  rsvps: { event_id: string }[]
}
async function allRows<T>(path: string): Promise<T[]> {
  const result: T[] = []
  for (let offset = 0; ; offset += 100) {
    const rows = await api<T[]>(`${path}?limit=100&offset=${offset}`)
    result.push(...rows)
    if (rows.length < 100) return result
  }
}
export function LiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(emptyState)
  const [communities, setCommunities] = useState<Community[]>([])
  const [people, setPeople] = useState<User[]>([])
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [providers, setProviders] = useState({ github: false, google: false })
  const refreshProviders = useCallback(async () => {
    setProviders(
      await api<{ github: boolean; google: boolean }>('/auth/options'),
    )
  }, [])
  const [authOpen, setAuthOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, notify] = useState('')
  const [savedRevision, setSavedRevision] = useState(0)
  const savedMutationVersion = useRef(0)
  const [savingPosts, setSavingPosts] = useState<
    { key: string; id: string; userId: string }[]
  >([])
  const revision = useRef(0)
  const sessionUser = useRef<string | null | undefined>(undefined)
  const [communicationCounts, setCommunicationCounts] = useState<{
    userId: string
    counts: CommunicationCounts
  } | null>(null)
  const countsRevision = useRef(0)
  const identity = state.signedIn ? state.profile.id : ''
  const rememberSavedPosts = useCallback(
    (ids: string[], expectedRevision: number) => {
      if (
        !identity ||
        sessionUser.current !== identity ||
        savedMutationVersion.current !== expectedRevision
      )
        return
      setState((previous) =>
        previous.profile.id !== identity
          ? previous
          : {
              ...previous,
              saved: [...new Set([...previous.saved, ...ids])],
            },
      )
    },
    [identity],
  )
  const refreshCommunicationCounts = useCallback(async () => {
    if (!identity) return
    const current = ++countsRevision.current
    const counts = await api<CommunicationCounts>('/communications/counts')
    if (sessionUser.current === identity && current === countsRevision.current)
      setCommunicationCounts({ userId: identity, counts })
  }, [identity])
  useEffect(() => {
    if (!identity) return
    let active = true
    let pending = false
    async function poll() {
      if (!active || pending || document.visibilityState === 'hidden') return
      pending = true
      try {
        await refreshCommunicationCounts()
      } catch {
        // Keep the last known counters and retry without interrupting navigation.
      } finally {
        pending = false
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 8000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [identity, refreshCommunicationCounts])
  const invalidate = useCallback(() => {
    revision.current++
  }, [])
  const busy = useRef(new Set<string>())
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => notify(''), 5000)
    return () => clearTimeout(timer)
  }, [toast])
  const refresh = useCallback(async () => {
    const current = ++revision.current
    const savedVersion = savedMutationVersion.current
    try {
      if (!supabase || !isSupabaseConfigured)
        throw Error(
          'La connexion aux données doit être configurée pour ouvrir la plateforme.',
        )
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const [communityRows, postRows, userRows, eventRows, me, authProviders] =
        await Promise.all([
          allRows<CommunityRow>('/discover/communities'),
          api<PostRow[]>('/posts?limit=100'),
          api<ProfileRow[]>('/discover/people?limit=100'),
          allRows<EventRow>('/events'),
          session ? api<MyState>('/me/state') : Promise.resolve(null),
          api<{ github: boolean; google: boolean }>('/auth/options'),
        ])
      if (current !== revision.current) return
      if (me && !me.profile)
        me.profile = await api<ProfileRow>('/profiles/me', 'PUT')
      if (current !== revision.current) return
      const nextCommunities = communityRows.map(
        (row): Community => ({
          ...toCommunity(row),
          myPermissions: (me?.memberships.find(
            (membership) => membership.community_id === row.id,
          )?.permissions ?? []) as NonNullable<Community['myPermissions']>,
          myRole: me?.memberships.find(
            (membership) => membership.community_id === row.id,
          )?.role as Community['myRole'],
          notificationsEnabled:
            me?.memberships.find(
              (membership) => membership.community_id === row.id,
            )?.notifications_enabled ?? true,
          ownerName: row.is_official
            ? 'Équipe OpenDev'
            : userRows.find((user) => user.id === row.created_by)?.full_name ||
              'un membre',
        }),
      )
      setProviders(authProviders)
      setCommunities(nextCommunities)
      setPeople(
        userRows.map((row) => ({
          ...toUser(row),
          isSelf: row.id === session?.user.id,
        })),
      )
      setEvents(eventRows.map(toEvent))
      setState((previous) => ({
        ...emptyState,
        autoRotateBanner: previous.autoRotateBanner,
        signedIn: !!session,
        interests: me?.preferences?.interests ?? [],
        onboarded:
          !!me?.preferences?.interests?.length &&
          !!me?.profile?.onboarding_completed_at &&
          (me?.profile?.account_type !== 'company' ||
            !!me.profile.company_name?.trim()) &&
          !!me?.profile?.full_name?.trim() &&
          !!me?.profile?.headline?.trim(),
        profile: me?.profile ? toUser(me.profile) : emptyState.profile,
        following: me?.following ?? [],
        posts: postRows.map(toPost),
        joined: (me?.memberships ?? []).flatMap((m) =>
          nextCommunities
            .filter((c) => c.id === m.community_id)
            .map((c) => c.slug),
        ),
        mutedCommunities: (me?.memberships ?? []).flatMap((membership) =>
          membership.notifications_enabled === false
            ? nextCommunities
                .filter((community) => community.id === membership.community_id)
                .map((community) => community.slug)
            : [],
        ),
        liked: me?.likes.map((like) => like.post_id) ?? [],
        saved:
          savedVersion === savedMutationVersion.current ||
          previous.profile.id !== me?.profile?.id
            ? (me?.saved?.map((item) => item.post_id) ?? [])
            : previous.saved,
        eventIds: me?.rsvps.map((rsvp) => rsvp.event_id) ?? [],
        comments:
          previous.signedIn === !!session &&
          previous.profile.id === me?.profile?.id
            ? previous.comments
            : {},
      }))
      setError('')
    } catch (cause) {
      if (current === revision.current) {
        setError(
          cause instanceof Error ? cause.message : 'Le chargement a échoué.',
        )
        setState(emptyState)
        setCommunities([])
        setPeople([])
        setEvents([])
      }
    } finally {
      if (current === revision.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null
      if (event === 'TOKEN_REFRESHED' || sessionUser.current === id) return
      sessionUser.current = id
      setCommunicationCounts(null)
      revision.current++
      setState(emptyState)
      setCommunities([])
      setPeople([])
      setEvents([])
      setLoading(true)
      setTimeout(() => void refresh(), 0)
    }).data.subscription
    return () => {
      invalidate()
      subscription?.unsubscribe()
    }
  }, [refresh, invalidate])
  function requireAuth() {
    if (state.signedIn) return true
    setAuthOpen(true)
    return false
  }
  const request = useCallback(
    async <T = unknown,>(
      path: string,
      method = 'GET',
      body?: unknown,
    ): Promise<T> => {
      return api<T>(path, method, body)
    },
    [],
  )
  async function mutate(key: string, path: string, method: string) {
    if (!requireAuth() || busy.current.has(key)) return
    busy.current.add(key)
    try {
      await api(path, method)
      await refresh()
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Action impossible.')
    } finally {
      busy.current.delete(key)
    }
  }
  async function toggleSave(id: string) {
    if (!requireAuth()) return
    const userId = state.profile.id
    const key = `save:${userId}:${id}`
    if (busy.current.has(key)) return
    busy.current.add(key)
    setSavingPosts((previous) => [...previous, { key, id, userId }])
    const removing = state.saved.includes(id)
    try {
      await api(
        '/posts/' + encodeURIComponent(id) + '/save',
        removing ? 'DELETE' : 'PUT',
        undefined,
        userId,
      )
      if (sessionUser.current !== userId) return
      savedMutationVersion.current++
      setState((previous) =>
        previous.profile.id !== userId
          ? previous
          : {
              ...previous,
              saved: removing
                ? previous.saved.filter((item) => item !== id)
                : [...new Set([...previous.saved, id])],
            },
      )
      setSavedRevision((previous) => previous + 1)
      notify(
        removing
          ? 'Publication retirée des enregistrements.'
          : 'Publication enregistrée.',
      )
    } catch (cause) {
      if (sessionUser.current === userId)
        notify(
          cause instanceof Error
            ? cause.message
            : 'Enregistrement impossible. Réessaie.',
        )
    } finally {
      busy.current.delete(key)
      setSavingPosts((previous) => previous.filter((item) => item.key !== key))
    }
  }
  async function signIn(provider: 'github' | 'google') {
    if (!supabase) throw Error('La connexion n’est pas configurée.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/' },
    })
    if (error)
      throw Error(
        'La connexion n’a pas pu être démarrée. Vérifie que ce fournisseur est activé.',
      )
  }
  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw Error('La déconnexion a échoué. Réessaie.')
    revision.current++
    setState(emptyState)
    setAuthOpen(false)
    await refresh()
  }
  async function emailAuth(
    email: string,
    password: string,
    signup: boolean,
    profile?: SignupProfile,
  ) {
    if (!supabase) throw Error('La connexion n’est pas configurée.')
    if (
      signup &&
      (!profile?.username?.trim() ||
        (profile.account_type === 'company'
          ? !profile.company_name?.trim() ||
            profile.company_name.trim().length > 100
          : !profile.first_name?.trim() || !profile.last_name?.trim()))
    )
      throw Error('Renseigne ton identité et ton nom d’utilisateur.')
    const result = signup
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/',
            data: profile
              ? {
                  full_name: profile.full_name.trim(),
                  account_type: profile.account_type ?? 'individual',
                  company_name:
                    profile.account_type === 'company'
                      ? profile.company_name?.trim()
                      : null,
                  first_name: profile.first_name?.trim(),
                  last_name: profile.last_name?.trim(),
                  username: profile.username?.trim(),
                }
              : undefined,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error)
      throw Object.assign(new Error(authErrorMessage(result.error)), {
        code: result.error.code,
      })
    if (signup && result.data.user?.identities?.length === 0)
      throw Object.assign(
        new Error(
          'Un compte existe peut-être déjà pour cette adresse. Connecte-toi ou réinitialise ton mot de passe.',
        ),
        { code: 'user_already_exists' },
      )
    if (result.data.session) setAuthOpen(false)
    return !!result.data.session
  }
  async function rsvp(id: string, registered: boolean) {
    if (!requireAuth()) return
    await api('/events/' + id + '/rsvps/me', registered ? 'DELETE' : 'PUT')
    await refresh()
    notify(registered ? 'Inscription annulée.' : 'Inscription enregistrée.')
  }
  const loadComments = useCallback(async (id: string) => {
    const current = revision.current
    const rows = await api<
      {
        id: string
        author_id: string
        body: string
        author_score?: number
        thanks_count?: number
        my_thanks_tag?: ThanksTag | null
        is_solution?: boolean
        author: { full_name: string; username: string }
      }[]
    >('/posts/' + id + '/comments')
    if (current !== revision.current) return
    const comments: Comment[] = rows.map((row) => ({
      id: row.id,
      authorId: row.author_id,
      contributionScore: row.author_score,
      thanksCount: row.thanks_count,
      myThanksTag: row.my_thanks_tag,
      isSolution: row.is_solution,
      text: row.body,
      author: row.author?.full_name || row.author?.username || 'Membre',
      initials: initials(
        row.author?.full_name || row.author?.username || 'Membre',
      ),
    }))
    setState((previous) => ({
      ...previous,
      comments: { ...previous.comments, [id]: comments },
    }))
  }, [])
  return (
    <DemoContext.Provider
      value={{
        state,
        savedRevision,
        savingPostIds: savingPosts
          .filter((item) => item.userId === identity)
          .map((item) => item.id),
        communicationCounts:
          communicationCounts?.userId === identity
            ? communicationCounts.counts
            : null,
        remote: {
          request,
          refresh,
          refreshCommunicationCounts,
          rememberSavedPosts,
          signIn,
          signOut,
          loadComments,
          emailAuth,
          providers,
          refreshProviders,
          rsvp,
        },
        liveCommunities: communities,
        livePeople: people,
        liveEvents: events,
        allPosts: state.posts,
        authOpen,
        openAuth: () => setAuthOpen(true),
        closeAuth: () => setAuthOpen(false),
        requireAuth,
        notify,
        update: (change) => {
          setState((previous) => {
            const next = change(previous)
            return {
              ...previous,
              autoRotateBanner: next.autoRotateBanner,
              hiddenPosts: next.hiddenPosts,
              mutedAuthors: next.mutedAuthors,
              readCommunities: next.readCommunities,
              mutedCommunities: next.mutedCommunities,
            }
          })
        },
        toggleLike: (id) =>
          void mutate(
            'like:' + id,
            '/posts/' + id + '/like',
            state.liked.includes(id) ? 'DELETE' : 'PUT',
          ),
        toggleJoin: (slug) => {
          const community = communities.find((c) => c.slug === slug)
          if (community)
            void mutate(
              'join:' + slug,
              '/communities/' + community.id + '/members/me',
              state.joined.includes(slug) ? 'DELETE' : 'POST',
            )
        },
        toggleSave,
        toggleFollow: (id) => {
          if (id !== state.profile.id)
            void mutate(
              'follow:' + id,
              '/profiles/' + id + '/follow',
              state.following.includes(id) ? 'DELETE' : 'PUT',
            )
        },
      }}
    >
      {loading ? (
        <div
          className="platform-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="loading-spinner" aria-hidden="true" />
          <span className="sr-only">Chargement de la plateforme…</span>
        </div>
      ) : error ? (
        <div className="surface" role="alert">
          <h1>Connexion aux données indisponible</h1>
          <p>{error}</p>
          <button
            className="button mt-4"
            onClick={() => {
              setLoading(true)
              void refresh()
            }}
          >
            Réessayer
          </button>
          <button
            className="text-button mt-4"
            onClick={() =>
              void signOut().catch((cause) => notify(cause.message))
            }
          >
            Réinitialiser ma session
          </button>
        </div>
      ) : (
        children
      )}
      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
    </DemoContext.Provider>
  )
}
