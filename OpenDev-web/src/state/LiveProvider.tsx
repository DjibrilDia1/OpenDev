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
}
interface MyState {
  following?: string[]
  preferences?: { interests: string[] } | null
  profile: ProfileRow | null
  memberships: { community_id: string; role: string }[]
  likes: { post_id: string }[]
  rsvps: { event_id: string }[]
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
  const revision = useRef(0)
  const sessionUser = useRef<string | null | undefined>(undefined)
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
          api<CommunityRow[]>('/discover/communities?limit=100'),
          api<PostRow[]>('/posts?limit=100'),
          api<ProfileRow[]>('/discover/people?limit=100'),
          api<EventRow[]>('/events?limit=100'),
          session ? api<MyState>('/me/state') : Promise.resolve(null),
          api<{ github: boolean; google: boolean }>('/auth/options'),
        ])
      if (current !== revision.current) return
      if (me && !me.profile)
        me.profile = await api<ProfileRow>('/profiles/me', 'PUT')
      if (current !== revision.current) return
      const nextCommunities = communityRows.map((row) => ({
        ...toCommunity(row),
        ownerName:
          userRows.find((user) => user.id === row.created_by)?.full_name ||
          'un membre',
      }))
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
        liked: me?.likes.map((like) => like.post_id) ?? [],
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
  async function request<T = unknown>(
    path: string,
    method = 'GET',
    body?: unknown,
  ): Promise<T> {
    return api<T>(path, method, body)
  }
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
    if (signup && (!profile?.first_name?.trim() || !profile.last_name?.trim() || !profile.username?.trim()))
      throw Error('Renseigne ton prénom, ton nom et ton nom d’utilisateur.')
    const result = signup
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/',
            data: profile
              ? {
                  full_name: profile.full_name.trim(),
                  first_name: profile.first_name?.trim(),
                  last_name: profile.last_name?.trim(),
                  username: profile.username?.trim(),
                }
              : undefined,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error)
      throw Object.assign(new Error(authErrorMessage(result.error)), { code: result.error.code })
    if (signup && result.data.user?.identities?.length === 0)
      throw Object.assign(new Error('Un compte existe peut-être déjà pour cette adresse. Connecte-toi ou réinitialise ton mot de passe.'), { code: 'user_already_exists' })
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
        body: string
        author: { full_name: string; username: string }
      }[]
    >('/posts/' + id + '/comments')
    if (current !== revision.current) return
    const comments: Comment[] = rows.map((row) => ({
      id: row.id,
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
        remote: {
          request,
          refresh,
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
        toggleSave: () =>
          notify(
            'Les enregistrements seront disponibles dans une prochaine étape.',
          ),
        toggleFollow: (id) => {
          if (id !== state.profile.id)
            void mutate('follow:' + id, '/profiles/' + id + '/follow', state.following.includes(id) ? 'DELETE' : 'PUT')
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
