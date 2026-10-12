import React, { useState } from 'react'
import type { Post } from '../../types'
import { Avatar } from '../common/Avatar'
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  MoreHorizontalIcon,
  PinIcon,
  FilePdfIcon,
} from '../common/Icons'

interface PostCardProps {
  post: Post
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [likes, setLikes] = useState(post.likesCount)
  const [hasLiked, setHasLiked] = useState(false)

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
    <article className="bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Pinned banner if present */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#757575] uppercase tracking-wider mb-3">
          <PinIcon size={13} />
          <span>CONTRIBUTION ÉPINGLÉE</span>
        </div>
      )}

      {/* Header: Author & Options */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            initials={post.author.initials}
            imageUrl={post.author.avatarUrl}
            size="md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#0e0e0e]">
                {post.author.name}
              </h3>
              {post.timeAgo && (
                <span className="text-xs text-[#757575]">· {post.timeAgo}</span>
              )}
            </div>
            {post.author.handle && (
              <p className="text-xs text-[#757575]">{post.author.handle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post.category && (
            <span className="text-[11px] font-medium text-[#757575] bg-[#f4f4f5] border border-[#e4e4e7] px-2.5 py-0.5 rounded-full">
              {post.category}
            </span>
          )}
          <button
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Options"
          >
            <MoreHorizontalIcon size={16} />
          </button>
        </div>
      </div>

      {/* Post Title (if distinct) */}
      {post.title && (
        <h4 className="font-bold text-sm sm:text-base text-[#0e0e0e] mt-3.5 leading-snug">
          {post.title}
        </h4>
      )}

      {/* Content */}
      <p className="text-xs sm:text-sm text-[#3f3f46] leading-relaxed mt-2">
        {post.content}
      </p>

      {/* Attachment (PDF) if present */}
      {post.attachment && (
        <div className="my-3.5 bg-[#f8f8f6] border border-[#e0e0e0] rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <FilePdfIcon size={20} />
            </div>
            <div className="min-w-0">
              <h5 className="font-bold text-xs text-[#0e0e0e] truncate">
                {post.attachment.name}
              </h5>
              <p className="text-[11px] text-[#757575] mt-0.5 truncate">
                {post.attachment.details}
              </p>
            </div>
          </div>
          <button className="text-xs font-semibold text-[#0e0e0e] bg-white border border-[#e0e0e0] hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            Consulter
          </button>
        </div>
      )}

      {/* Code snippet if present */}
      {post.codeSnippet && (
        <div className="my-3.5 bg-[#0e0e0e] text-[#f4f4f5] rounded-xl p-4 overflow-x-auto text-xs font-mono border border-neutral-800">
          <pre>{post.codeSnippet}</pre>
        </div>
      )}

      {/* Footer Actions & Tags */}
      <div className="flex items-center justify-between gap-4 mt-3.5 pt-3 border-t border-[#f4f4f5] text-xs font-medium text-[#616161]">
        <div className="flex items-center gap-5 sm:gap-6">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors ${
              hasLiked ? 'text-red-500 font-semibold' : 'hover:text-[#0e0e0e]'
            }`}
          >
            <HeartIcon
              size={14}
              className={hasLiked ? 'fill-current text-red-500' : ''}
            />
            <span>{likes}</span>
          </button>

          <button className="flex items-center gap-1.5 hover:text-[#0e0e0e] transition-colors">
            <MessageCircleIcon size={14} />
            <span>{post.repliesCount} réponses</span>
          </button>

          <button className="flex items-center gap-1.5 hover:text-[#0e0e0e] transition-colors">
            <ShareIcon size={14} />
            <span>Partager</span>
          </button>
        </div>

        {/* Tech Badge / Tags on right */}
        <div className="flex items-center gap-1.5">
          {post.tags && post.tags.map((t) => (
            <span
              key={t}
              className="text-[11px] font-medium text-[#616161] bg-[#f4f4f5] px-2 py-0.5 rounded-md"
            >
              {t}
            </span>
          ))}
          {post.techBadge && (
            <span className="text-[11px] font-semibold text-[#0e0e0e] bg-[#f2f2f0] border border-[#e0e0e0] px-2.5 py-0.5 rounded-lg">
              {post.techBadge}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
