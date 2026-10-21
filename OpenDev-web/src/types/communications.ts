export interface CommunicationProfile {
  id: string
  username: string
  full_name: string
  headline?: string | null
  avatar_url?: string | null
}

export interface InboxConversation {
  id: string
  participant: CommunicationProfile
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  peer_read_sequence: number
}

export interface PrivateMessage {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  sequence: number
  client_id: string
  created_at: string
}

export interface ActivityNotification {
  id: string
  kind:
    | 'message'
    | 'follow'
    | 'comment'
    | 'reaction'
    | 'event_created'
    | 'event_updated'
    | 'event_cancelled'
  actor: CommunicationProfile | null
  conversation_id: string | null
  post_id: string | null
  event_id?: string | null
  event_title?: string | null
  community_id?: string | null
  community_slug?: string | null
  created_at: string
  read_at: string | null
}
