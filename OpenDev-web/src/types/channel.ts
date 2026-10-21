export interface CommunityChannel {
  id: string
  community_id: string
  name: string
  description: string
  position: number
  is_default: boolean
  is_read_only: boolean
  archived_at: string | null
  created_at: string
}
