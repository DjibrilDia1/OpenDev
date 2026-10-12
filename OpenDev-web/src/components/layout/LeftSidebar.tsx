import React from 'react'
import { SettingsIcon } from '../common/Icons'

interface LeftSidebarProps {
  onCloseMobile?: () => void
}

export const LeftSidebar: React.FC<LeftSidebarProps> = () => {
  return (
    <aside className="w-16 h-full flex flex-col justify-between items-center py-6 border-r border-[#e5e7eb] bg-transparent">
      {/* Top spacing indicator */}
      <div className="w-8 h-0.5 bg-transparent" />

      {/* Bottom settings action */}
      <button
        aria-label="Paramètres"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[#757575] hover:text-[#0e0e0e] hover:bg-neutral-100 transition-colors"
      >
        <SettingsIcon size={18} />
      </button>
    </aside>
  )
}
