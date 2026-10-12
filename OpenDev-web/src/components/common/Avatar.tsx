import React from 'react'

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
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
  }[size]

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={initials}
        className={`rounded-full object-cover border border-gray-200 ${sizeClasses} ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-[#f2f2f0] border border-[#e0e0e0] text-[#0e0e0e] flex items-center justify-center select-none ${sizeClasses} ${className}`}
    >
      {initials}
    </div>
  )
}
