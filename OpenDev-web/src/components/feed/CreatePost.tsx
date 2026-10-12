import React, { useState } from 'react'
import { Avatar } from '../common/Avatar'
import { Button } from '../common/Button'
import { currentUser } from '../../mocks/opendev-data'

interface CreatePostProps {
  onPublish?: (content: string) => void
}

export const CreatePost: React.FC<CreatePostProps> = ({ onPublish }) => {
  const [content, setContent] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim()) {
      onPublish?.(content)
      setContent('')
    }
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 sm:p-5 shadow-sm">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <Avatar initials={currentUser.avatarInitials} size="md" />
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Qu'as-tu appris ou construit récemment ?"
          className="flex-1 bg-[#f7f7f7] border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0e0e0e] placeholder-[#9e9e9e] focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="px-5 py-2.5 font-semibold text-sm shrink-0"
        >
          Publier
        </Button>
      </form>
    </div>
  )
}
