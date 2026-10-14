import React, { useState } from 'react'

interface AvatarProps {
  initials: string
  imageUrl?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  imageUrl,
  size = 'md',
  className = '',
}) => {
  const [failedUrl, setFailedUrl] = useState<string>()
  const tones = ['blue', 'mint', 'rose', 'amber', 'violet']
  const tone = tones[Array.from(initials).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % tones.length]
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
  }[size]

  if (imageUrl && imageUrl !== failedUrl) {
    return (
      <img
        src={imageUrl}
        alt={initials}
        width={size === 'sm' ? 32 : size === 'lg' ? 48 : 40}
        height={size === 'sm' ? 32 : size === 'lg' ? 48 : 40}
        loading="lazy"
        onError={() => setFailedUrl(imageUrl)}
        className={`rounded-full object-cover border border-gray-200 ${sizeClasses} ${className}`}
      />
    )
  }

  return (
    <div
      className={`avatar-tone avatar-${tone} rounded-full border flex items-center justify-center select-none ${sizeClasses} ${className}`}
    >
      {initials}
    </div>
  )
}
