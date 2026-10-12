import React, { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { HeroBanner } from '../components/feed/HeroBanner'
import { CreatePost } from '../components/feed/CreatePost'
import { PostCard } from '../components/feed/PostCard'
import { homeFeedPosts, currentUser } from '../mocks/opendev-data'
import type { Post } from '../types'

export const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>(homeFeedPosts)
  const [filter, setFilter] = useState<'forYou' | 'recent'>('forYou')

  const handlePublish = (content: string) => {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      author: {
        name: currentUser.name,
        handle: currentUser.handle,
        initials: currentUser.avatarInitials,
      },
      timeAgo: 'à l’instant',
      title: '',
      content: content,
      tags: [],
      likesCount: 0,
      repliesCount: 0,
      sharesCount: 0,
      techBadge: 'React',
    }
    setPosts([newPost, ...posts])
  }

  return (
    <AppLayout sidebarVariant="home" showRail={true}>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* HERO BANNER */}
        <HeroBanner />

        {/* FEED HEADER WITH FILTER */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-base sm:text-lg font-bold text-[#0e0e0e]">
            Fil communautaire
          </h2>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#0e0e0e] cursor-pointer">
            <button
              onClick={() => setFilter(filter === 'forYou' ? 'recent' : 'forYou')}
              className="flex items-center gap-1 hover:text-neutral-600 transition-colors"
            >
              <span>{filter === 'forYou' ? 'Pour toi' : 'Plus récents'}</span>
              <span className="text-[10px]">▾</span>
            </button>
          </div>
        </div>

        {/* CREATE POST INPUT */}
        <CreatePost onPublish={handlePublish} />

        {/* FEED POSTS LIST */}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
