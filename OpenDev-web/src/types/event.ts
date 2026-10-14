export interface CommunityEvent {
  communitySlug?: string
  organizerId?: string
  date: string
  id: string
  title: string
  month: string
  day: string
  location: string
  time: string
  community?: string
}

export interface PopularTopic {
  tag: string
  discussionsCount: string
}

export interface SuggestedCommunity {
  id: string
  name: string
  membersCount: string
  iconType: 'cloud' | 'sparkle' | 'layers'
}

export interface CommunityActivity {
  id: string
  authorInitials: string
  text: string
  communityName: string
  meta: string
  dotColor: string
}
