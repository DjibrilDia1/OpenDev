import type { User, Community, Post } from '../types'
import type { CommunityEvent } from '../types/event'
export interface ProfileRow {
  first_name?: string
  last_name?: string
  company?: string
  school?: string
  experience_level?: string
  followers_count?: number
  following_count?: number
  onboarding_completed_at?: string | null
  tags?: string[]
  cover_url?: string
  id: string
  username: string
  full_name: string
  headline?: string
  bio?: string
  avatar_url?: string
  location?: string
  website_url?: string
  github_url?: string
  post_count?: number
  community_count?: number
}
export interface CommunityRow {
  id: string
  slug: string
  name: string
  description: string
  created_by?: string
  member_count: number
  tags: string[]
}
export interface PostRow {
  id: string
  author_id: string
  author_username: string
  author_name: string
  community_slug?: string
  community_name?: string
  post_type: string
  title: string
  body: string
  code_snippet?: string
  tags: string[]
  created_at: string
  like_count: number
  comment_count: number
}
export interface EventRow {
  id: string
  title: string
  starts_at: string
  location?: string
  community_slug?: string
  organizer_id: string
}
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
export const toUser = (row: ProfileRow): User => ({
  firstName: row.first_name,
  lastName: row.last_name,
  company: row.company,
  school: row.school,
  experienceLevel: row.experience_level,
  followersCount: row.followers_count ?? 0,
  followingCount: row.following_count ?? 0,
  id: row.id,
  name: row.full_name || row.username,
  handle: '@' + row.username,
  avatarInitials: initials(row.full_name || row.username),
  avatarUrl: row.avatar_url,
  coverUrl: row.cover_url,
  tags: row.tags ?? [],
  roleTitle: row.headline || '',
  bio: row.bio,
  location: row.location,
  githubUrl: row.github_url,
  websiteUrl: row.website_url,
  contributionsCount: row.post_count ?? 0,
  communitiesCount: row.community_count ?? 0,
})
export const toCommunity = (row: CommunityRow): Community => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  ownerId: row.created_by,
  kind: 'member',
  visibility: 'public',
  category: 'Open source',
  memberCount: `${row.member_count ?? 0} membres`,
  weeklyDiscussionsCount: 0,
  color: '#333',
  bgColor: '#f1f1f3',
  invitedUserIds: [],
})
export const toPost = (row: PostRow): Post => ({
  id: row.id,
  author: {
    id: row.author_id,
    name: row.author_name || row.author_username,
    handle: '@' + row.author_username,
    initials: initials(row.author_name || row.author_username),
  },
  communitySlug: row.community_slug,
  communityName: row.community_name,
  category:
    row.post_type === 'question'
      ? 'Question · Entraide'
      : row.post_type === 'showcase'
        ? 'Projet · Collaboration'
        : 'Discussion',
  title: row.body.startsWith(row.title) ? '' : row.title,
  content: row.body,
  codeSnippet: row.code_snippet,
  tags: row.tags,
  createdAt: Date.parse(row.created_at),
  timeAgo: new Date(row.created_at).toLocaleDateString('fr-FR'),
  likesCount: row.like_count,
  repliesCount: row.comment_count,
})
export const toEvent = (row: EventRow): CommunityEvent => {
  const date = new Date(row.starts_at)
  return {
    id: row.id,
    title: row.title,
    date: row.starts_at.slice(0, 10),
    day: String(date.getDate()),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }),
    time: date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    location: row.location || 'En ligne',
    communitySlug: row.community_slug,
    organizerId: row.organizer_id,
  }
}
