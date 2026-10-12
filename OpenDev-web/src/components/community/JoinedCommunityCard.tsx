import React from 'react'
import type { Community } from '../../types'
import { CommunityEmblem } from '../common/CommunityEmblem'
import { Badge } from '../common/Badge'
import {
  MoreHorizontalIcon,
  PinIcon,
  BellIcon,
  ArrowUpRightIcon,
} from '../common/Icons'

interface JoinedCommunityCardProps {
  community: Community
  onOpen?: (communityId: string) => void
}

export const JoinedCommunityCard: React.FC<JoinedCommunityCardProps> = ({
  community,
  onOpen,
}) => {
  return (
    <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
      <div>
        {/* Top: Emblem, Name, Member Count & Options */}
        <div className="flex items-start justify-between">
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
          <button
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            aria-label="Options"
          >
            <MoreHorizontalIcon size={16} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-[#3f3f46] leading-relaxed mt-3.5">
          {community.description}
        </p>

        {/* Roles & Status badges */}
        <div className="flex items-center gap-2 mt-3.5">
          {community.role && (
            <Badge variant="status">{community.role}</Badge>
          )}

          {community.isPinned && (
            <span className="flex items-center gap-1 text-[11px] text-[#71717a] font-medium bg-[#f4f4f5] px-2 py-0.5 rounded-md border border-[#e4e4e7]">
              <PinIcon size={11} />
              <span>Épinglée</span>
            </span>
          )}

          <div className="ml-auto text-neutral-400">
            <BellIcon size={14} />
          </div>
        </div>

        {/* Recent Discussion Activity */}
        <div className="mt-4 pt-3.5 border-t border-[#f4f4f5]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#757575] mb-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: community.color }}
            />
            <span>{community.weeklyDiscussionsCount} discussions cette semaine</span>
          </div>

          {community.latestActivity && (
            <div className="mt-1">
              <h4 className="text-xs font-bold text-[#0e0e0e] line-clamp-1">
                {community.latestActivity.title}
              </h4>
              <p className="text-[11px] text-[#757575] mt-0.5">
                {community.latestActivity.authorName} · {community.latestActivity.timeAgo}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Unread status & Open Button */}
      <div className="mt-4 pt-3 border-t border-[#f4f4f5] flex items-center justify-between">
        <div>
          {community.unreadCount && community.unreadCount > 0 ? (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: community.bgColor,
                color: community.color,
              }}
            >
              {community.unreadCount} non lues
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <span>✓</span>
              <span>Tu es à jour</span>
            </span>
          )}
        </div>

        <button
          onClick={() => onOpen?.(community.id)}
          className="bg-[#0e0e0e] text-white hover:bg-neutral-800 transition-colors text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
        >
          <span>Ouvrir</span>
          <ArrowUpRightIcon size={12} />
        </button>
      </div>
    </div>
  )
}
