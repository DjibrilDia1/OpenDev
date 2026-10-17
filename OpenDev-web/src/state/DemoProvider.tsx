import { useEffect, useRef, useState, type ReactNode } from 'react'
import { currentUser } from '../mocks/opendev-data'
import { initialState } from './initialState'
import { seedPosts } from './catalog'
import {
  DemoContext,
  toggleItem,
  getCommunities,
  canReadCommunity,
  isCommunityMember,
  type DemoState,
} from './store'

const storageKey = 'opendev:demo:v1'
function loadState(): DemoState {
  try {
    const data = JSON.parse(
      localStorage.getItem(storageKey) ?? 'null',
    ) as DemoState | null
    if (!data || data.version !== 1) return initialState
    // Reject incomplete or corrupt snapshots rather than breaking the whole application.
    for (const field of [
      'interests',
      'joined',
      'following',
      'liked',
      'saved',
      'eventIds',
      'mutedCommunities',
    ] as const) {
      if (
        !Array.isArray(data[field]) ||
        !data[field].every((item) => typeof item === 'string')
      )
        return initialState
    }
    if (
      !Array.isArray(data.posts) ||
      !data.posts.every(
        (p) =>
          typeof p.content === 'string' && p.author && Array.isArray(p.tags),
      )
    )
      return initialState
    if (
      !Array.isArray(data.projects) ||
      !data.projects.every(
        (p) => typeof p.title === 'string' && Array.isArray(p.tags),
      )
    )
      return initialState
    if (
      !Array.isArray(data.conversations) ||
      !data.conversations.every(
        (c) => c.participant && Array.isArray(c.messages),
      )
    )
      return initialState
    if (
      !data.profile ||
      typeof data.profile.name !== 'string' ||
      typeof data.profile.handle !== 'string' ||
      !data.comments ||
      typeof data.comments !== 'object' ||
      !Object.values(data.comments).every(Array.isArray)
    )
      return initialState
    return {
      ...initialState,
      ...data,
      sponsoredBanners: Array.isArray(data.sponsoredBanners)
        ? data.sponsoredBanners.filter(
            (banner) =>
              banner &&
              typeof banner.title === 'string' &&
              typeof banner.text === 'string' &&
              typeof banner.sponsor === 'string' &&
              typeof banner.active === 'boolean',
          )
        : [],
      communityOverrides:
        data.communityOverrides &&
        typeof data.communityOverrides === 'object' &&
        !Array.isArray(data.communityOverrides)
          ? data.communityOverrides
          : {},
      joinRequests:
        data.joinRequests &&
        typeof data.joinRequests === 'object' &&
        !Array.isArray(data.joinRequests)
          ? Object.fromEntries(
              Object.entries(data.joinRequests).filter(
                ([, ids]) =>
                  Array.isArray(ids) &&
                  ids.every((id) => typeof id === 'string'),
              ),
            )
          : {},
      communityEvents: Array.isArray(data.communityEvents)
        ? data.communityEvents.filter(
            (event) =>
              typeof event.date === 'string' &&
              typeof event.title === 'string' &&
              typeof event.time === 'string',
          )
        : [],
      hiddenPosts: Array.isArray(data.hiddenPosts)
        ? data.hiddenPosts.filter((id) => typeof id === 'string')
        : [],
      mutedAuthors: Array.isArray(data.mutedAuthors)
        ? data.mutedAuthors.filter((id) => typeof id === 'string')
        : [],
      moderatedPosts: Array.isArray(data.moderatedPosts)
        ? data.moderatedPosts.filter((id) => typeof id === 'string')
        : [],
      reports:
        data.reports &&
        typeof data.reports === 'object' &&
        !Array.isArray(data.reports)
          ? Object.fromEntries(
              Object.entries(data.reports).filter(
                ([, reason]) => typeof reason === 'string',
              ),
            )
          : {},
      helpRequests:
        data.helpRequests &&
        typeof data.helpRequests === 'object' &&
        !Array.isArray(data.helpRequests)
          ? Object.fromEntries(
              Object.entries(data.helpRequests).filter(
                ([, value]) =>
                  value &&
                  typeof value.requested === 'boolean' &&
                  (value.solutionId === undefined ||
                    typeof value.solutionId === 'string'),
              ),
            )
          : {},
      readCommunities: Array.isArray(data.readCommunities)
        ? data.readCommunities.filter((slug) => typeof slug === 'string')
        : [],
      createdCommunities: Array.isArray(data.createdCommunities)
        ? data.createdCommunities.filter(
            (community) =>
              community &&
              typeof community.name === 'string' &&
              typeof community.slug === 'string' &&
              typeof community.description === 'string' &&
              Array.isArray(community.invitedUserIds),
          )
        : [],
      autoRotateBanner: data.autoRotateBanner !== false,
      signedIn: data.signedIn === true,
      onboarded: data.onboarded === true,
    }
  } catch {
    return initialState
  }
}
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, update] = useState(loadState)
  const [authOpen, setAuthOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  function notify(message: string) {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 4500)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
      setStorageWarning(false)
    } catch {
      setStorageWarning(true)
    }
  }, [state])
  function requireAuth() {
    if (state.signedIn) return true
    setAuthOpen(true)
    return false
  }
  function toggle(
    field: 'following' | 'joined' | 'liked' | 'saved',
    id: string,
  ) {
    if (!requireAuth()) return
    const community = getCommunities(state).find((item) => item.slug === id)
    if (
      field === 'joined' &&
      community?.visibility === 'private' &&
      !canReadCommunity(state, community)
    ) {
      update((previous) => ({
        ...previous,
        joinRequests: {
          ...previous.joinRequests,
          [id]: toggleItem(
            previous.joinRequests[id] ?? [],
            previous.profile.id,
          ),
        },
      }))
      notify(
        state.joinRequests[id]?.includes(state.profile.id)
          ? 'Demande annulée.'
          : 'Demande transmise dans la démo. Un administrateur doit l’accepter.',
      )
      return
    }
    if (
      field === 'joined' &&
      (community?.ownerId === state.profile.id ||
        community?.staff?.some((member) => member.userId === state.profile.id))
    ) {
      notify(
        'Un membre de l’équipe doit d’abord être retiré de ses fonctions par le propriétaire avant de quitter cet espace.',
      )
      return
    }
    update((previous) => ({
      ...previous,
      communityOverrides:
        field === 'joined' &&
        community &&
        isCommunityMember(previous, community)
          ? {
              ...previous.communityOverrides,
              [id]: {
                ...community,
                memberIds: community.memberIds?.filter(
                  (userId) => userId !== previous.profile.id,
                ),
              },
            }
          : previous.communityOverrides,
      [field]:
        field === 'joined' &&
        community &&
        isCommunityMember(previous, community)
          ? previous.joined.filter((slug) => slug !== id)
          : toggleItem(previous[field], id),
    }))
  }
  const allPosts = [...state.posts, ...seedPosts]
    .filter((post) => {
      const community = getCommunities(state).find(
        (item) => item.slug === post.communitySlug,
      )
      return !community || canReadCommunity(state, community)
    })
    .map((post) =>
      post.author.handle === currentUser.handle
        ? {
            ...post,
            author: {
              name: state.profile.name,
              handle: state.profile.handle,
              initials: state.profile.avatarInitials,
            },
          }
        : post,
    )
  return (
    <DemoContext.Provider
      value={{
        state,
        update,
        authOpen,
        openAuth: () => setAuthOpen(true),
        closeAuth: () => setAuthOpen(false),
        requireAuth,
        notify,
        allPosts,
        toggleFollow: (id) => toggle('following', id),
        toggleJoin: (slug) => toggle('joined', slug),
        toggleSave: (id) => toggle('saved', id),
        toggleLike: (id) => toggle('liked', id),
      }}
    >
      {children}
      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
      {storageWarning && (
        <div className="storage-warning" role="alert">
          Le stockage local est plein ou indisponible. Tes changements restent
          disponibles jusqu’à la fermeture de cette page.
        </div>
      )}
    </DemoContext.Provider>
  )
}
