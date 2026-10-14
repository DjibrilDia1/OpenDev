export interface User {
  id: string
  name: string
  handle: string
  avatarInitials: string
  avatarUrl?: string
  roleTitle: string
  contributionsCount: number
  communitiesCount: number
  bio?: string
  location?: string
  joinedDate?: string
  isAvailableForCollab?: boolean
  tags?: string[]
  githubUrl?: string
  websiteUrl?: string
  linkedinUrl?: string
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
  isFollowedByMe?: boolean
  followsYou?: boolean
  isSelf?: boolean
  isOnline?: boolean
}

export interface Project {
  id: string
  title: string
  slug: string
  description: string
  tags: string[]
  repoUrl?: string
  liveUrl?: string
  canManage?: boolean
}

export interface DirectMessage {
  id: string
  senderId: string
  senderName: string
  senderInitials: string
  text: string
  time: string
  isOutgoing: boolean
  isRead?: boolean
  attachment?: {
    name: string
    size: string
    pages?: string
    type: string
  }
}

export interface Conversation {
  id: string
  participant: {
    id: string
    name: string
    handle: string
    initials: string
    tag: string
    isOnline: boolean
    statusText: string
  }
  lastMessage: string
  time: string
  unreadCount?: number
  contextTitle?: string
  contextCommunity?: string
  messages: DirectMessage[]
}
