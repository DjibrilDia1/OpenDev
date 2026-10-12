import React, { useState } from 'react'
import type { Post } from '../../types'
import { Avatar } from '../common/Avatar'
import { BookmarkIcon, HeartIcon, MessageCircleIcon } from '../common/Icons'

interface DiscussionCardProps {
  post: Post
}

export const DiscussionCard: React.FC<DiscussionCardProps> = ({ post }) => {
  const [bookmarked, setBookmarked] = useState(false)
  const [likes, setLikes] = useState(post.likesCount)
  const [hasLiked, setHasLiked] = useState(false)

  const communityColors: Record<string, string> = {
    React: '#2563EB',
    'Open Source': '#8B5CF6',
    Python: '#FFB020',
    'Design Systems': '#10B981',
  }

  const dotColor =
    (post.communityName && communityColors[post.communityName]) || '#2563EB'

  const handleLike = () => {
    if (hasLiked) {
      setLikes((prev) => prev - 1)
      setHasLiked(false)
    } else {
      setLikes((prev) => prev + 1)
      setHasLiked(true)
    }
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Category header & Bookmark */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0e0e0e]">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span style={{ color: dotColor }}>{post.communityName || 'Général'}</span>
          <span className="text-[#9e9e9e] font-normal">· Discussion</span>
        </div>
        <button
          onClick={() => setBookmarked(!bookmarked)}
          className={`p-1 rounded-lg transition-colors ${
            bookmarked ? 'text-[#0e0e0e]' : 'text-[#9e9e9e] hover:text-[#0e0e0e]'
          }`}
          aria-label="Enregistrer"
        >
          <BookmarkIcon
            size={16}
            className={bookmarked ? 'fill-current text-[#0e0e0e]' : ''}
          />
        </button>
      </div>

      {/* Title & snippet */}
      <h4 className="font-bold text-sm sm:text-base text-[#0e0e0e] mt-2.5 leading-snug">
        {post.title}
      </h4>
      <p className="text-xs sm:text-sm text-[#616161] mt-1.5 leading-relaxed">
        {post.content}
      </p>

      {/* Footer: Author & Metrics */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f4f4f5] text-xs text-[#757575]">
        <div className="flex items-center gap-2">
          <Avatar
            initials={post.author.initials}
            imageUrl={post.author.avatarUrl}
            size="sm"
          />
          <span className="text-[#0e0e0e] font-medium">{post.author.name}</span>
          <span>·</span>
          <span>{post.timeAgo}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <MessageCircleIcon size={14} />
            <span>{post.repliesCount} réponses</span>
          </span>
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 hover:text-[#0e0e0e] transition-colors ${
              hasLiked ? 'text-red-500 font-semibold' : ''
            }`}
          >
            <HeartIcon
              size={14}
              className={hasLiked ? 'fill-current text-red-500' : ''}
            />
            <span>{likes}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
