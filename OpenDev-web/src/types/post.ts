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

interface PostFileMetadata {
  path: string
  name: string
  mime_type: string
  size: number
  /** Computed from the storage path when reading; never submitted to the API. */
  url?: string
}

export type PostResource =
  | (PostFileMetadata & { kind: 'image' })
  | (PostFileMetadata & { kind: 'document' })
  | { kind: 'link'; url: string; title: string }

export interface Post {
  solutionCommentId?: string | null
  channelId?: string
  channelName?: string
  channelReadOnly?: boolean
  channelArchivedAt?: string
  resources?: PostResource[]
  media?: PostMedia[]
  communitySlug?: string
  createdAt?: number
  id: string
  author: {
    contributionScore?: number
    id?: string
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
