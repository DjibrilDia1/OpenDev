import { createContext, useContext } from 'react'
import type { Community, Conversation, Post, Project, User } from '../types'
import { communityCatalog } from './catalog'
import { upcomingEvents } from '../mocks/opendev-data'
import type { CommunityEvent } from '../types/event'
export interface Comment {
  id: string
  author: string
  initials: string
  text: string
}
export interface DemoState {
  communityOverrides: Record<string, Community>
  joinRequests: Record<string, string[]>
  communityEvents: CommunityEvent[]
  hiddenPosts: string[]
  mutedAuthors: string[]
  reports: Record<string, string>
  moderatedPosts: string[]
  helpRequests: Record<string, { requested: boolean; solutionId?: string }>
  readCommunities: string[]
  createdCommunities: Community[]
  autoRotateBanner: boolean
  version: 1
  signedIn: boolean
  onboarded: boolean
  interests: string[]
  joined: string[]
  following: string[]
  liked: string[]
  saved: string[]
  comments: Record<string, Comment[]>
  posts: Post[]
  profile: User
  projects: Project[]
  conversations: Conversation[]
  readNotifications: boolean
  eventIds: string[]
  mutedCommunities: string[]
}
export interface Store {
  state: DemoState
  update: (change: (previous: DemoState) => DemoState) => void
  requireAuth: () => boolean
  openAuth: () => void
  authOpen: boolean
  closeAuth: () => void
  notify: (message: string) => void
  toggleFollow: (id: string) => void
  toggleJoin: (slug: string) => void
  toggleSave: (id: string) => void
  toggleLike: (id: string) => void
  allPosts: Post[]
}
export const DemoContext = createContext<Store | null>(null)
export function useDemo() {
  const context = useContext(DemoContext)
  if (!context) throw new Error('DemoProvider is required')
  return context
}
export const toggleItem = (items: string[], item: string) =>
  items.includes(item)
    ? items.filter((value) => value !== item)
    : [...items, item]

export function getCommunities(state: DemoState): Community[] {
  return [
    ...communityCatalog.map((community) => ({
      ...community,
      kind: 'official' as const,
      ownerId: 'usr-mod',
      ownerName: 'Équipe OpenDev',
      staff: [{ userId: 'usr-amina', role: 'Modérateur' as const }],
    })),
    ...state.createdCommunities,
  ].map((community) => state.communityOverrides[community.slug] ?? community)
}

export function useCommunities() {
  return getCommunities(useDemo().state)
}
export function canAdministerCommunity(state: DemoState, community: Community) {
  return (
    state.signedIn &&
    (community.ownerId === state.profile.id ||
      !!community.staff?.some(
        (member) =>
          member.userId === state.profile.id &&
          member.role === 'Administrateur',
      ))
  )
}
export function canReadCommunity(state: DemoState, community: Community) {
  return (
    community.visibility !== 'private' ||
    (state.signedIn &&
      (state.joined.includes(community.slug) ||
        community.ownerId === state.profile.id ||
        !!community.staff?.some(
          (member) => member.userId === state.profile.id,
        ) ||
        !!community.memberIds?.includes(state.profile.id)))
  )
}
export function isCommunityMember(state: DemoState, community: Community) {
  return (
    state.signedIn &&
    (state.joined.includes(community.slug) ||
      community.ownerId === state.profile.id ||
      !!community.staff?.some((member) => member.userId === state.profile.id) ||
      !!community.memberIds?.includes(state.profile.id))
  )
}
export function useCommunityEvents() {
  const { state } = useDemo()
  const communities = getCommunities(state)
  return [...upcomingEvents, ...state.communityEvents].filter((event) => {
    const community = communities.find((item) =>
      event.communitySlug
        ? item.slug === event.communitySlug
        : item.name === event.community,
    )
    return !community || canReadCommunity(state, community)
  })
}
