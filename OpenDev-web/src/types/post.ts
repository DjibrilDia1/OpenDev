export type PostCategory =
  | 'Question · Entraide'
  | 'Discussion'
  | 'Projet · Collaboration'
  | 'Ressource'
  | 'Réponse · Entraide'

export interface PostAttachment {
  name: string
  details: string
  type: 'pdf' | 'doc' | 'archive'
  downloadUrl?: string
}

export interface PostMedia {
  id: string
  url: string
  name: string
  type: 'image'
}

export interface Post {
  media?: PostMedia[]
  communitySlug?: string
  createdAt?: number
  id: string
  author: {
    name: string
    handle: string
    initials: string
    avatarUrl?: string
  }
  timeAgo: string
  title: string
  content: string
  category?: PostCategory
  isPinned?: boolean
  codeSnippet?: string
  attachment?: PostAttachment
  tags: string[]
  likesCount: number
  repliesCount: number
  sharesCount?: number
  communityName?: string
  isBookmarked?: boolean
  techBadge?: string
}
