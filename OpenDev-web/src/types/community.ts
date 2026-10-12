export type CommunityCategory = 'Frontend' | 'Backend' | 'Design' | 'Contribution' | 'Open source'

export type CommunityRole = 'Membre' | 'Modérateur'

export interface Community {
  id: string
  name: string
  slug: string
  color: string
  bgColor: string
  badgeCount?: number
  memberCount: string
  category: CommunityCategory
  description: string
  weeklyDiscussionsCount: number
  isJoined?: boolean
  role?: CommunityRole
  isPinned?: boolean
  notificationsEnabled?: boolean
  unreadCount?: number
  latestActivity?: {
    title: string
    authorName: string
    timeAgo: string
  }
}
