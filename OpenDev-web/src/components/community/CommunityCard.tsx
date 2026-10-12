import React, { useState } from 'react'
import type { Community } from '../../types'
import { CommunityEmblem } from '../common/CommunityEmblem'
import { Badge } from '../common/Badge'

interface CommunityCardProps {
  community: Community
  onToggleJoin?: (communityId: string) => void
}

export const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  onToggleJoin,
}) => {
  const [isJoined, setIsJoined] = useState(community.isJoined || false)

  const handleJoin = () => {
    setIsJoined(!isJoined)
    onToggleJoin?.(community.id)
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
      <div>
        {/* Top: Emblem, Name & Category Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CommunityEmblem name={community.name} size={40} />
            <div>
              <h3 className="font-bold text-sm text-[#0e0e0e]">
                {community.name}
              </h3>
              <p className="text-xs text-[#757575] mt-0.5">
                {community.memberCount} membres
              </p>
            </div>
          </div>
          <Badge variant="category">{community.category}</Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-[#3f3f46] leading-relaxed mt-3.5 line-clamp-2">
          {community.description}
        </p>
      </div>

      {/* Footer: Activity & Join button */}
      <div className="mt-5 pt-3 border-t border-[#f4f4f5] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-[#616161]">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: community.color }}
          />
          <span>{community.weeklyDiscussionsCount} discussions cette semaine</span>
        </div>

        <button
          onClick={handleJoin}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
            isJoined
              ? 'bg-[#f4f4f5] text-[#0e0e0e] hover:bg-[#e4e4e7]'
              : 'bg-[#0e0e0e] text-white hover:bg-neutral-800'
          }`}
        >
          {isJoined ? 'Rejoint' : '+ Rejoindre'}
        </button>
      </div>
    </div>
  )
}
