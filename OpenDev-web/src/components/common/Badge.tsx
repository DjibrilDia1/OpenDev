import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'tag' | 'status' | 'category' | 'count'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'tag',
  className = '',
}) => {
  const variantClasses = {
    tag: 'bg-[#f4f4f5] text-[#3f3f46] text-xs font-medium px-2.5 py-1 rounded-md hover:bg-gray-200 transition-colors',
    status: 'bg-[#f4f4f5] text-[#71717a] text-xs font-medium px-2 py-0.5 rounded-md border border-[#e4e4e7]',
    category: 'bg-[#f4f4f5] text-[#71717a] text-xs font-medium px-2.5 py-1 rounded-md',
    count: 'text-[#2563eb] text-xs font-semibold',
  }[variant]

  return (
    <span className={`inline-flex items-center ${variantClasses} ${className}`}>
      {children}
    </span>
  )
}
