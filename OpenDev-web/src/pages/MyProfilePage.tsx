import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PostCard } from '../components/feed/PostCard'
import {
  MapPinIcon,
  CalendarIcon,
  EditIcon,
  PlusIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  CodeIcon,
} from '../components/common/Icons'
import {
  currentUser,
  djibrilContributions,
  djibrilProjects,
} from '../mocks/opendev-data'
import type { Post, Project } from '../types'

export const MyProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contributions' | 'projets' | 'communautes'>('contributions')
  const [newPostContent, setNewPostContent] = useState('')

  const profileRightSidebar = (
    <aside className="w-80 shrink-0 space-y-4 py-6 px-4">
      {/* 1. Liens développeur */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Liens développeur</h4>
        <div className="mt-3 space-y-2.5">
          <a
            href={currentUser.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-xs text-[#0e0e0e] hover:underline"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">⑂</span>
              <span>github.com/djibril-dev</span>
            </div>
            <ArrowUpRightIcon size={14} className="text-[#616161]" />
          </a>

          <a
            href={currentUser.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-xs text-[#0e0e0e] hover:underline"
          >
            <div className="flex items-center gap-2">
              <span>🌐</span>
              <span>djibril.dev</span>
            </div>
            <ArrowUpRightIcon size={14} className="text-[#616161]" />
          </a>
        </div>
      </div>

      {/* 2. Mes communautés */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Mes communautés</h4>
        <div className="mt-3 space-y-3">
          <Link to="/communaute/react" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#eff5ff] border border-blue-200 flex items-center justify-center text-xs text-blue-600">
              ⚛
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0e0e0e] group-hover:underline">React</h5>
              <p className="text-[10px] text-[#757575]">24 800 membres</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#f5f0ff] border border-purple-200 flex items-center justify-center text-xs text-purple-600">
              ⑂
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0e0e0e]">Open Source</h5>
              <p className="text-[10px] text-[#757575]">18 600 membres</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#f4f4f5] border border-neutral-300 flex items-center justify-center text-xs text-neutral-800">
              ◇
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0e0e0e]">Node.js</h5>
              <p className="text-[10px] text-[#757575]">9 300 membres</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#f4f4f5] border border-neutral-300 flex items-center justify-center text-xs text-neutral-800">
              ⌘
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0e0e0e]">DevOps & Cloud</h5>
              <p className="text-[10px] text-[#757575]">12,4 k membres</p>
            </div>
          </div>
        </div>
        <button className="mt-3 text-xs font-semibold text-[#0e0e0e] flex items-center gap-1 hover:underline">
          <span>Voir mes communautés</span>
          <ChevronRightIcon size={12} />
        </button>
      </div>

      {/* 3. Mon activité */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Mon activité</h4>
        <div className="mt-3 grid grid-cols-2 gap-4 pb-3 border-b border-[#f0f0f0]">
          <div>
            <p className="text-2xl font-bold text-[#0e0e0e]">12</p>
            <p className="text-xs text-[#757575]">contributions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0e0e0e]">150</p>
            <p className="text-xs text-[#757575]">suivis</p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs text-[#0e0e0e] font-semibold">
            5 questions · 4 réponses · 3 partages
          </p>
          <p className="text-xs text-[#616161]">
            Chaque contribution aide la communauté à avancer.
          </p>
        </div>
      </div>

      {/* 4. Un profil qui te ressemble */}
      <div className="bg-[#f2f2f0] border border-[#e0e0e0] rounded-2xl p-4">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Un profil qui te ressemble</h4>
        <p className="text-xs text-[#616161] mt-1 mb-3 leading-relaxed">
          Tes compétences, tes projets et tes liens aident les autres développeurs à te découvrir.
        </p>
        <button className="w-full bg-white border border-[#e0e0e0] hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] py-2 px-3 rounded-lg text-center">
          Modifier le profil
        </button>
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
      customRightSidebar={profileRightSidebar}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* BREADCRUMB */}
        <nav className="text-xs text-[#757575] flex items-center gap-2">
          <span>Mon espace</span>
          <span>/</span>
          <span className="text-[#0e0e0e] font-medium">Mon profil</span>
        </nav>

        {/* HERO PROFILE CARD */}
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xl font-bold text-[#0e0e0e] shrink-0">
                {currentUser.avatarInitials}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0e0e0e]">
                  {currentUser.name}
                </h1>
                <p className="text-xs text-[#757575]">{currentUser.handle}</p>
                <p className="text-xs text-[#0e0e0e] font-medium mt-1">
                  {currentUser.roleTitle}
                </p>
              </div>
            </div>

            <button className="border border-[#e0e0e0] bg-white hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] px-4 py-2 rounded-xl flex items-center gap-1.5 self-start">
              <EditIcon size={13} />
              <span>Modifier le profil</span>
            </button>
          </div>

          <p className="text-xs text-[#3f3f46] leading-relaxed">
            {currentUser.bio}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {currentUser.tags?.map((t: string) => (
              <span
                key={t}
                className="text-[11px] font-medium text-[#616161] bg-[#f4f4f5] border border-[#e4e4e7] px-2.5 py-0.5 rounded-md"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#757575] pt-1">
            <div className="flex items-center gap-1.5">
              <MapPinIcon size={13} />
              <span>{currentUser.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon size={13} />
              <span>{currentUser.joinedDate}</span>
            </div>
            <span className="text-neutral-400">·</span>
            <span className="text-emerald-700 font-medium">Ouvert aux collaborations</span>
          </div>

          {/* Stats bar */}
          <div className="pt-3 border-t border-[#f0f0f0] flex items-center gap-6 text-xs text-[#0e0e0e]">
            <span>
              <strong className="font-bold">{currentUser.contributionsCount}</strong> contributions
            </span>
            <span>
              <strong className="font-bold">{currentUser.communitiesCount}</strong> communautés
            </span>
            <Link to="/profil/amina/abonnes" className="hover:underline">
              <strong className="font-bold">{currentUser.followersCount}</strong> abonnés
            </Link>
            <Link to="/profil/amina/abonnements" className="hover:underline">
              <strong className="font-bold">{currentUser.followingCount}</strong> suivis
            </Link>
          </div>
        </div>

        {/* PROFILE TABS */}
        <div className="border-b border-[#e5e7eb] flex items-center gap-8 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('contributions')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'contributions'
                ? 'border-[#0e0e0e] text-[#0e0e0e] font-semibold'
                : 'border-transparent text-[#616161] hover:text-[#0e0e0e]'
            }`}
          >
            Contributions · {currentUser.contributionsCount}
          </button>
          <button
            onClick={() => setActiveTab('projets')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'projets'
                ? 'border-[#0e0e0e] text-[#0e0e0e] font-semibold'
                : 'border-transparent text-[#616161] hover:text-[#0e0e0e]'
            }`}
          >
            Projets · 2
          </button>
          <button
            onClick={() => setActiveTab('communautes')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'communautes'
                ? 'border-[#0e0e0e] text-[#0e0e0e] font-semibold'
                : 'border-transparent text-[#616161] hover:text-[#0e0e0e]'
            }`}
          >
            Communautés · {currentUser.communitiesCount}
          </button>
        </div>

        {/* CREATE POST INPUT */}
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-semibold text-[#0e0e0e] shrink-0">
            {currentUser.avatarInitials}
          </div>
          <input
            type="text"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Qu'as-tu appris ou construit récemment ?"
            className="flex-1 bg-[#f8f8f6] border border-[#e5e7eb] rounded-xl px-4 py-2 text-xs sm:text-sm text-[#0e0e0e] placeholder-[#9e9e9e] focus:outline-none focus:bg-white"
          />
          <button className="bg-[#0e0e0e] text-white hover:bg-neutral-800 transition-colors text-xs font-semibold px-4 py-2 rounded-xl">
            Publier
          </button>
        </div>

        {/* CONTRIBUTIONS LIST */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-bold text-[#0e0e0e]">Mes contributions</h2>
          <span className="text-xs font-semibold text-[#0e0e0e] cursor-pointer">
            Les plus récentes ▾
          </span>
        </div>

        <div className="space-y-4">
          {djibrilContributions.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* VOIR MES 12 CONTRIBUTIONS BUTTON */}
        <div className="text-center pt-2">
          <button className="border border-[#e0e0e0] bg-white hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] px-6 py-2.5 rounded-xl shadow-sm">
            Voir mes 12 contributions
          </button>
        </div>

        {/* MES PROJETS SECTION */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#0e0e0e]">Mes projets</h2>
            <button className="border border-[#e0e0e0] bg-white hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
              <PlusIcon size={13} />
              <span>Ajouter un projet</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {djibrilProjects.map((p: Project) => (
              <div
                key={p.id}
                className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#f8f8f6] border border-[#e0e0e0] flex items-center justify-center text-xs text-[#0e0e0e]">
                        <CodeIcon size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0e0e0e]">{p.title}</h4>
                        <p className="text-[10px] text-[#757575]">{p.slug}</p>
                      </div>
                    </div>
                    <button className="border border-[#e0e0e0] bg-white hover:bg-neutral-50 text-[11px] font-semibold text-[#0e0e0e] px-2.5 py-1 rounded-lg">
                      Gérer
                    </button>
                  </div>
                  <p className="text-xs text-[#616161] mt-3 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-[#f0f0f0]">
                  {p.tags.map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] font-medium text-[#616161] bg-[#f4f4f5] px-2 py-0.5 rounded-md"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
