import type { User, Community, Post, PostResource } from '../types'
import { postResourceFileUrl } from './post-resources'
import type { CommunityEvent } from '../types/event'
export interface ProfileRow {
  contribution_score?: number
  account_type?: 'individual' | 'company'
  company_name?: string | null
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
  cover_url?: string | null
  rules?: string
  resources?: { title: string; description: string; url: string }[]
  weekly_discussions_count?: number
  post_count?: number
  is_official?: boolean
  category?: Community['category']
  id: string
  slug: string
  name: string
  description: string
  created_by?: string
  member_count: number
  tags: string[]
}
export interface PostRow {
  accepted_comment_id?: string | null
  author_score?: number
  channel_id?: string | null
  channel_name?: string | null
  channel_is_read_only?: boolean | null
  channel_archived_at?: string | null
  resources?: PostResource[]
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
  description?: string
  ends_at?: string
  format?: 'online' | 'in_person'
  registration_url?: string | null
  capacity?: number | null
  attendee_count?: number
  available_seats?: number | null
  community_id?: string | null
  community_name?: string | null
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
  contributionScore: row.contribution_score,
  accountType: row.account_type ?? 'individual',
  companyName: row.company_name || undefined,
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
  coverUrl: row.cover_url || undefined,
  rules: row.rules ?? '',
  resources: row.resources ?? [],
  ownerId: row.created_by,
  kind: row.is_official ? 'official' : 'member',
  visibility: 'public',
  category: row.category ?? 'Open source',
  memberCount: `${row.member_count ?? 0} ${row.member_count === 1 ? 'membre' : 'membres'}`,
  memberCountValue: row.member_count ?? 0,
  postCount: row.post_count,
  weeklyDiscussionsCount: row.weekly_discussions_count ?? 0,
  color: '#333',
  bgColor: '#f1f1f3',
  invitedUserIds: [],
})
export const toPost = (row: PostRow): Post => ({
  solutionCommentId: row.accepted_comment_id,
  channelId: row.channel_id || undefined,
  channelName: row.channel_name || undefined,
  channelReadOnly: row.channel_is_read_only ?? false,
  channelArchivedAt: row.channel_archived_at || undefined,
  resources: (row.resources ?? []).map((resource) =>
    resource.kind === 'link'
      ? resource
      : { ...resource, url: postResourceFileUrl(resource.path) || undefined },
  ),
  id: row.id,
  author: {
    contributionScore: row.author_score,
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
        : row.post_type === 'resource'
          ? 'Ressource'
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
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return {
    id: row.id,
    title: row.title,
    date: localDate,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    description: row.description,
    format: row.format,
    registrationUrl: row.registration_url || undefined,
    capacity: row.capacity ?? null,
    attendeeCount: row.attendee_count ?? 0,
    availableSeats: row.available_seats ?? null,
    communityId: row.community_id || undefined,
    community: row.community_name || undefined,
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
