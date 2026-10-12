import React from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../common/Avatar'
import { PlusIcon } from '../common/Icons'
import {
  currentUser,
  popularTopics,
  upcomingEvents,
  suggestedCommunities,
} from '../../mocks/opendev-data'

export const RightSidebar: React.FC = () => {
  return (
    <aside className="w-80 shrink-0 space-y-4 py-6 px-4">
      {/* 1. USER PROFILE CARD */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar initials={currentUser.avatarInitials} size="md" />
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#0e0e0e] truncate">{currentUser.name}</h3>
            <p className="text-xs text-[#616161] truncate">{currentUser.roleTitle}</p>
          </div>
        </div>
        <p className="text-xs text-[#757575] mt-3 pt-3 border-t border-[#f0f0f0]">
          {currentUser.contributionsCount} contributions · {currentUser.communitiesCount} communautés · {currentUser.followingCount} suivis
        </p>
      </div>

      {/* 2. SUJETS POPULAIRES */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm text-[#0e0e0e]">Sujets populaires</h4>
          <button className="text-xs text-[#616161] hover:text-[#0e0e0e] transition-colors">
            Voir tout
          </button>
        </div>
        <div className="divide-y divide-[#f0f0f0]">
          {popularTopics.map((topic) => (
            <div
              key={topic.tag}
              className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-[#0e0e0e] group-hover:text-neutral-700">
                  {topic.tag}
                </p>
                <p className="text-[11px] text-[#757575] mt-0.5">
                  {topic.discussionsCount}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. À VENIR */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm text-[#0e0e0e]">À venir</h4>
          <button className="text-xs text-[#616161] hover:text-[#0e0e0e] transition-colors">
            Calendrier
          </button>
        </div>
        <div className="space-y-3">
          {upcomingEvents.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#f2f2f0] border border-[#e0e0e0] flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-bold uppercase text-[#757575] leading-none">
                  {ev.month}
                </span>
                <span className="text-sm font-bold text-[#0e0e0e] leading-tight">
                  {ev.day}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-bold text-[#0e0e0e] truncate">{ev.title}</h5>
                <p className="text-[11px] text-[#757575] mt-0.5 truncate">
                  {ev.location} · {ev.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. À DÉCOUVRIR */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">À découvrir</h4>
        <p className="text-xs text-[#616161] mt-0.5 mb-3">Des communautés pour toi</p>
        <div className="space-y-3">
          {suggestedCommunities.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#f4f4f5] border border-[#e0e0e0] flex items-center justify-center text-xs text-[#0e0e0e]">
                  {item.iconType === 'cloud' && '⌘'}
                  {item.iconType === 'sparkle' && '✳'}
                  {item.iconType === 'layers' && '◇'}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#0e0e0e]">{item.name}</h5>
                  <p className="text-[11px] text-[#757575]">{item.membersCount}</p>
                </div>
              </div>
              <button
                className="p-1 rounded-lg hover:bg-neutral-100 text-[#0e0e0e] transition-colors"
                aria-label="Rejoindre"
              >
                <PlusIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. CONSTRUISONS ENSEMBLE */}
      <div className="bg-[#f2f2f0] border border-[#e0e0e0] rounded-2xl p-4">
        <h4 className="font-bold text-sm text-[#0e0e0e] text-center">Construisons ensemble</h4>
        <p className="text-xs text-[#616161] mt-1 mb-3 text-center leading-relaxed">
          Rejoins des développeurs qui partagent tes intérêts.
        </p>
        <Link
          to="/decouvrir"
          className="block w-full bg-[#0e0e0e] text-white hover:bg-neutral-800 transition-colors text-xs font-semibold py-2 px-3 rounded-lg text-center"
        >
          Trouver ma communauté
        </Link>
      </div>

      {/* 6. FOOTER LINKS */}
      <div className="pt-2 text-[11px] text-[#9e9e9e] leading-relaxed text-center">
        <p className="space-x-1.5">
          <a href="#about" className="hover:underline">À propos</a>
          <span>·</span>
          <a href="#rules" className="hover:underline">Règles</a>
          <span>·</span>
          <a href="#privacy" className="hover:underline">Confidentialité</a>
          <span>·</span>
          <a href="#help" className="hover:underline">Aide</a>
        </p>
      </div>
    </aside>
  )
}
