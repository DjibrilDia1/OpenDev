import React, { useState } from 'react'
import { TopNav } from './TopNav'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'

interface AppLayoutProps {
  children: React.ReactNode
  sidebarVariant?: 'home' | 'none'
  showRail?: boolean
  isLoggedIn?: boolean
  customRightSidebar?: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  sidebarVariant = 'home',
  showRail = true,
  isLoggedIn = true,
  customRightSidebar,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f8f8f6] text-[#0e0e0e] flex flex-col font-sans">
      {/* TOP NAVIGATION */}
      <TopNav
        isLoggedIn={isLoggedIn}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-xl z-10 flex flex-col">
            <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <span className="font-mono font-bold text-sm bg-[#0e0e0e] text-white px-2.5 py-1 rounded">
                &lt;OpenDev /&gt;
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1">
              <LeftSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto flex">
        {/* LEFT RAIL (Desktop) */}
        {showRail && (
          <div className="hidden lg:block shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
            <LeftSidebar />
          </div>
        )}

        {/* CENTER CONTENT */}
        <main className="flex-1 min-w-0 py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* RIGHT SIDEBAR (Desktop) */}
        {customRightSidebar ? (
          <div className="hidden xl:block shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-l border-[#e5e7eb]">
            {customRightSidebar}
          </div>
        ) : sidebarVariant === 'home' ? (
          <div className="hidden xl:block shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-l border-[#e5e7eb]">
            <RightSidebar />
          </div>
        ) : null}
      </div>
    </div>
  )
}
