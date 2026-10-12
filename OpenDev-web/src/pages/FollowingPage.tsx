import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import {
  SearchIcon,
  CheckIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
} from '../components/common/Icons'
import { usersList, aminaUser } from '../mocks/opendev-data'
import type { User } from '../types'

export const FollowingPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({
    'usr-lea': true,
    'usr-thomas': true,
    'usr-nora': true,
    'usr-hugo': false,
    'usr-ines': false,
    'usr-julien': false,
  })

  const toggleFollow = (userId: string) => {
    setFollowMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }))
  }

  // Abonnements d'Amina list
  const followingList: User[] = [
    usersList.find((u: User) => u.id === 'usr-lea')!,
    usersList.find((u: User) => u.id === 'usr-thomas')!,
    usersList.find((u: User) => u.id === 'usr-djibril-preview')!,
    usersList.find((u: User) => u.id === 'usr-nora')!,
    usersList.find((u: User) => u.id === 'usr-hugo')!,
    usersList.find((u: User) => u.id === 'usr-ines')!,
    usersList.find((u: User) => u.id === 'usr-julien')!,
  ].filter(Boolean)

  const filteredUsers = followingList.filter((u: User) => {
    return (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.bio ? u.bio.toLowerCase().includes(searchQuery.toLowerCase()) : false)
    )
  })

  const rightSidebar = (
    <aside className="w-80 shrink-0 space-y-4 py-6 px-4">
      {/* 1. À propos d'Amina */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">À propos d’Amina</h4>
        <div className="mt-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e]">
            AD
          </div>
          <div>
            <h5 className="text-xs font-bold text-[#0e0e0e]">Amina Diallo</h5>
            <p className="text-[11px] text-[#757575]">@amina.codes</p>
          </div>
        </div>
        <p className="text-xs text-[#616161] mt-2.5 leading-relaxed">
          Développeuse front-end
        </p>
        <p className="text-xs text-[#616161] mt-1 leading-relaxed">
          React, accessibilité et petits projets qui deviennent grands.
        </p>
        <p className="text-xs text-[#757575] mt-3 pt-3 border-t border-[#f0f0f0]">
          248 abonnés · 126 abonnements
        </p>
        <Link
          to="/profil/amina"
          className="mt-3 text-xs font-semibold text-[#0e0e0e] flex items-center gap-1 hover:underline"
        >
          <span>Voir le profil</span>
          <ChevronRightIcon size={12} />
        </Link>
      </div>

      {/* 2. Communautés */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Communautés</h4>
        <div className="mt-3 space-y-3">
          <Link to="/communaute/react" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#eff5ff] border border-blue-200 flex items-center justify-center text-xs text-blue-600">
              ⚛
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0e0e0e] group-hover:underline">React</h5>
              <p className="text-[10px] text-[#757575]">24 800 membres · En commun</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#f5f0ff] border border-purple-200 flex items-center justify-center text-xs text-purple-600">
              ⑂
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0e0e0e]">Open Source</h5>
              <p className="text-[10px] text-[#757575]">18 600 membres · En commun</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#ebf9f3] border border-emerald-200 flex items-center justify-center text-xs text-emerald-600">
              ◇
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0e0e0e]">Design Systems</h5>
              <p className="text-[10px] text-[#757575]">6 200 membres</p>
            </div>
          </div>
        </div>
        <button className="mt-3 text-xs font-semibold text-[#0e0e0e] flex items-center gap-1 hover:underline">
          <span>Voir les communautés</span>
          <ChevronRightIcon size={12} />
        </button>
      </div>

      {/* 3. Construisons ensemble */}
      <div className="bg-[#f2f2f0] border border-[#e0e0e0] rounded-2xl p-4">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Construisons ensemble</h4>
        <p className="text-xs text-[#616161] mt-1 mb-3 leading-relaxed">
          Suivre un développeur, c'est découvrir ses contributions et continuer la conversation.
        </p>
        <Link
          to="/decouvrir"
          className="block w-full bg-white border border-[#e0e0e0] hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] py-2 px-3 rounded-lg text-center shadow-sm"
        >
          Découvrir des développeurs
        </Link>
      </div>

      {/* Footer */}
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

  return (
    <AppLayout
      sidebarVariant="none"
      showRail={true}
      customRightSidebar={rightSidebar}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* BACK LINK */}
        <Link
          to="/profil/amina"
          className="text-xs text-[#757575] hover:text-[#0e0e0e] flex items-center gap-1.5"
        >
          <ArrowLeftIcon size={14} />
          <span>Retour au profil d’Amina Diallo</span>
        </Link>

        {/* HEADER */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-sm font-bold text-[#0e0e0e] shrink-0">
            AD
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0e0e0e]">
              Abonnements d’Amina Diallo
            </h1>
            <p className="text-xs text-[#757575]">
              {aminaUser.handle} · {aminaUser.roleTitle}
            </p>
          </div>
        </div>

        {/* TABS (Abonnés · 248 / Abonnements · 126) */}
        <div className="border-b border-[#e5e7eb] flex items-center gap-8 text-xs sm:text-sm font-medium">
          <Link
            to="/profil/amina/abonnes"
            className="pb-3 border-b-2 border-transparent text-[#616161] hover:text-[#0e0e0e]"
          >
            Abonnés · 248
          </Link>
          <Link
            to="/profil/amina/abonnements"
            className="pb-3 border-b-2 border-[#0e0e0e] text-[#0e0e0e] font-semibold"
          >
            Abonnements · 126
          </Link>
        </div>

        {/* SEARCH & SORT */}
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-sm">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9e9e9e]">
              <SearchIcon size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un développeur parmi les abonnements..."
              className="w-full bg-transparent border-none pl-9 pr-3 py-1.5 text-xs text-[#0e0e0e] placeholder-[#9e9e9e] focus:outline-none"
            />
          </div>

          <span className="text-xs text-[#616161] shrink-0 pr-2">
            Les plus récents ▾
          </span>
        </div>

        {/* SECTION HEADER */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="font-bold text-[#0e0e0e]">
            Amina suit 126 développeurs
          </span>
          <span className="text-[#757575]">
            Les actions de suivi concernent votre compte
          </span>
        </div>

        {/* USERS LIST (CARD STYLE FIGMA) */}
        <div className="bg-white border border-[#e0e0e0] rounded-2xl divide-y divide-[#f0f0f0] shadow-sm overflow-hidden">
          {filteredUsers.map((user: User) => {
            const isFollowed = followMap[user.id] ?? false

            return (
              <div key={user.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e] shrink-0">
                    {user.avatarInitials}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-[#0e0e0e]">{user.name}</h4>
                      {user.isSelf ? (
                        <span className="text-[10px] font-semibold text-[#757575] bg-[#f4f4f5] px-2 py-0.5 rounded-full border border-[#e4e4e7]">
                          Vous
                        </span>
                      ) : user.followsYou ? (
                        <span className="text-[10px] font-semibold text-[#757575] bg-[#f4f4f5] px-2 py-0.5 rounded-full border border-[#e4e4e7]">
                          Vous suit
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-[#757575]">{user.handle}</p>
                    <p className="text-xs text-[#3f3f46] leading-relaxed pt-0.5">
                      {user.bio}
                    </p>

                    {/* Tech tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {user.tags?.map((t: string) => (
                        <span
                          key={t}
                          className="text-[10px] font-medium text-[#616161] bg-[#f4f4f5] px-2 py-0.5 rounded-md"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Follow / Following button (hidden for self) */}
                {!user.isSelf && (
                  <button
                    onClick={() => toggleFollow(user.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                      isFollowed
                        ? 'bg-white border border-[#e0e0e0] text-[#0e0e0e] hover:bg-neutral-50'
                        : 'bg-[#0e0e0e] text-white hover:bg-neutral-800'
                    }`}
                  >
                    {isFollowed && <CheckIcon size={12} />}
                    <span>{isFollowed ? 'Abonné' : 'Suivre'}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* VOIR PLUS */}
        <div className="text-center pt-2">
          <button className="border border-[#e0e0e0] bg-white hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] px-6 py-2.5 rounded-xl shadow-sm">
            Voir plus d’abonnements
          </button>
        </div>

        {/* FOOTER NOTE */}
        <p className="text-center text-xs text-[#757575] pt-2">
          Les développeurs qu’Amina suit, pour apprendre, partager et collaborer.
        </p>
      </div>
    </AppLayout>
  )
}
