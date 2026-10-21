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
export type CommunityPermission =
  | 'edit_community'
  | 'manage_members'
  | 'moderate_posts'
  | 'manage_events'
export interface CommunityResource {
  title: string
  description: string
  url: string
}

export interface Community {
  rules?: string
  resources?: CommunityResource[]
  myPermissions?: string[]
  myRole?: string
  memberCountValue?: number
  postCount?: number
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
