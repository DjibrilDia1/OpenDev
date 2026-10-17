export type CommunityCategory =
  | 'Frontend'
  | 'Backend'
  | 'Design'
  | 'Contribution'
  | 'Open source'
  | 'IA & Data'
  | 'DevOps'
  | 'Mobile'
  | 'Gaming'
  | 'Sécurité'

export type CommunityRole = 'Membre' | 'Modérateur'

export interface Community {
  promotionActive?: boolean
  visibility?: 'public' | 'private'
  coverUrl?: string
  memberIds?: string[]
  staff?: { userId: string; role: 'Administrateur' | 'Modérateur' }[]
  kind?: 'official' | 'member'
  ownerId?: string
  ownerName?: string
  invitedUserIds?: string[]
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
