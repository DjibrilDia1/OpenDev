import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  HouseIcon,
  CompassIcon,
  MessageCircleIcon,
  BellIcon,
  SearchIcon,
  ChevronDownIcon,
} from '../common/Icons'
import { currentUser } from '../../mocks/opendev-data'

interface TopNavProps {
  onToggleMobileMenu?: () => void
  isLoggedIn?: boolean
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleMobileMenu,
  isLoggedIn = true,
}) => {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#e5e7eb] px-4 lg:px-8 h-16 flex items-center justify-between">
      {/* LEFT: Mobile toggle & Brand Logo & Search */}
      <div className="flex items-center gap-4 lg:gap-8 flex-1 max-w-2xl">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <Link to="/" className="shrink-0 flex items-center">
          <div className="bg-[#0e0e0e] text-white font-mono font-bold text-sm tracking-tight px-3 py-1.5 rounded-md flex items-center shadow-sm">
            &lt;OpenDev /&gt;
          </div>
        </Link>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-md hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9e9e9e]">
            <SearchIcon size={15} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher discussions, tags, membres..."
            className="w-full bg-[#f8f8f6] border border-[#e5e7eb] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[#0e0e0e] placeholder-[#9e9e9e] focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* RIGHT: Main navigation items + Profile or Login */}
      <div className="flex items-center gap-6 lg:gap-8">
        <nav className="flex items-center gap-6 sm:gap-8">
          {/* Accueil */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center group transition-colors ${
              isActive('/') ? 'text-[#0e0e0e]' : 'text-[#616161] hover:text-[#0e0e0e]'
            }`}
          >
            <HouseIcon size={20} className={isActive('/') ? 'stroke-[2]' : ''} />
            <span className={`text-[11px] mt-0.5 ${isActive('/') ? 'font-semibold' : 'font-normal'}`}>
              Acceuil
            </span>
          </Link>

          {/* Découvrir */}
          <Link
            to="/decouvrir"
            className={`flex flex-col items-center justify-center group transition-colors ${
              isActive('/decouvrir') ? 'text-[#0e0e0e]' : 'text-[#616161] hover:text-[#0e0e0e]'
            }`}
          >
            <CompassIcon size={20} className={isActive('/decouvrir') ? 'stroke-[2]' : ''} />
            <span className={`text-[11px] mt-0.5 ${isActive('/decouvrir') ? 'font-semibold' : 'font-normal'}`}>
              Decouvrir
            </span>
          </Link>

          {/* Messages */}
          <Link
            to="/messages"
            className={`flex flex-col items-center justify-center relative group transition-colors ${
              isActive('/messages') ? 'text-[#0e0e0e]' : 'text-[#616161] hover:text-[#0e0e0e]'
            }`}
          >
            <div className="relative">
              <MessageCircleIcon size={20} className={isActive('/messages') ? 'stroke-[2]' : ''} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
            </div>
            <span className={`text-[11px] mt-0.5 ${isActive('/messages') ? 'font-semibold' : 'font-normal'}`}>
              Messages
            </span>
          </Link>

          {/* Notifs */}
          <button
            className="flex flex-col items-center justify-center group text-[#616161] hover:text-[#0e0e0e] transition-colors"
          >
            <div className="relative">
              <BellIcon size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
            <span className="text-[11px] mt-0.5 font-normal">
              Notifs
            </span>
          </button>
        </nav>

        {/* User profile dropdown or Login button */}
        {isLoggedIn ? (
          <Link
            to="/profil"
            className="flex items-center gap-2.5 pl-2 group py-1 pr-1 hover:bg-neutral-50 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-semibold text-[#0e0e0e]">
              {currentUser.avatarInitials}
            </div>
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#0e0e0e] group-hover:text-neutral-700">
                  {currentUser.name}
                </span>
                <ChevronDownIcon size={12} className="text-[#616161]" />
              </div>
              <span className="text-[10px] text-[#757575]">Mon profil</span>
            </div>
          </Link>
        ) : (
          <button className="bg-[#0e0e0e] text-white hover:bg-neutral-800 transition-colors text-xs font-semibold px-4 py-2.5 rounded-xl shrink-0">
            Se connecter
          </button>
        )}
      </div>
    </header>
  )
}
