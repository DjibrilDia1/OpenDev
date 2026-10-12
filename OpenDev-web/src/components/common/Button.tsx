import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'pill' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium transition-colors select-none focus:outline-none'

  const variants = {
    primary:
      'bg-[#0e0e0e] text-white hover:bg-neutral-800 rounded-xl disabled:opacity-50',
    secondary:
      'bg-[#f4f4f5] text-[#0e0e0e] hover:bg-neutral-200 rounded-xl',
    outline:
      'border border-[#e0e0e0] text-[#0e0e0e] hover:bg-neutral-50 rounded-xl',
    pill:
      'bg-[#0e0e0e] text-white hover:bg-neutral-800 rounded-full text-xs font-semibold px-4 py-2',
    ghost:
      'text-[#616161] hover:text-[#0e0e0e] hover:bg-neutral-100 rounded-lg',
  }[variant]

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  }[size]

  return (
    <button className={`${base} ${variants} ${sizes} ${className}`} {...props}>
      {children}
    </button>
  )
}
