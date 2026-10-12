import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PostCard } from '../components/feed/PostCard'
import {
  MapPinIcon,
  CalendarIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  CodeIcon,
  MessageCircleIcon,
} from '../components/common/Icons'
import {
  aminaUser,
  aminaContributions,
  aminaProjects,
} from '../mocks/opendev-data'
import type { Post, Project } from '../types'

export const UserProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contributions' | 'projets' | 'communautes'>('contributions')
  const [isFollowing, setIsFollowing] = useState(false)

  const profileRightSidebar = (
    <aside className="w-80 shrink-0 space-y-4 py-6 px-4">
      {/* 1. Liens développeur */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Liens développeur</h4>
        <div className="mt-3 space-y-2.5">
          <a
            href={aminaUser.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-xs text-[#0e0e0e] hover:underline"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">⑂</span>
              <span>github.com/amina-codes</span>
            </div>
            <ArrowUpRightIcon size={14} className="text-[#616161]" />
          </a>

          <a
            href={aminaUser.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-xs text-[#0e0e0e] hover:underline"
          >
            <div className="flex items-center gap-2">
              <span>🌐</span>
              <span>amina.codes</span>
            </div>
            <ArrowUpRightIcon size={14} className="text-[#616161]" />
          </a>
        </div>
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

      {/* 3. Contributions à la communauté */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Contributions à la communauté</h4>
        <div className="mt-3 grid grid-cols-2 gap-4 pb-3 border-b border-[#f0f0f0]">
          <div>
            <p className="text-2xl font-bold text-[#0e0e0e]">38</p>
            <p className="text-xs text-[#757575]">contributions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0e0e0e]">14</p>
            <p className="text-xs text-[#757575]">réponses utiles</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-[#616161]">
            Modératrice de React, Amina partage des ressources et accompagne les échanges.
          </p>
          <p className="text-[11px] font-semibold text-[#0e0e0e]">
            React · Accessibilité · Entraide
          </p>
        </div>
      </div>

      {/* 4. À venir */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">À venir</h4>
        <div className="mt-3 flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#f2f2f0] border border-[#e0e0e0] flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-bold uppercase text-[#757575] leading-none">OCT</span>
            <span className="text-sm font-bold text-[#0e0e0e] leading-tight">15</span>
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-bold text-[#0e0e0e] leading-snug">
              Atelier React : des hooks sans pièges
            </h5>
            <p className="text-[11px] text-[#757575] mt-0.5">En ligne · 18:30</p>
          </div>
        </div>
        <p className="text-xs text-[#616161] mt-3 leading-relaxed">
          Apporte un composant : on le refactorise ensemble avec Amina.
        </p>
        <button className="w-full mt-3 border border-[#e0e0e0] hover:bg-[#fafaf9] transition-colors rounded-xl px-3 py-2 text-xs font-semibold text-[#0e0e0e] text-center">
          Voir l’événement
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
          <span>Membres</span>
          <span>/</span>
          <span className="text-[#0e0e0e] font-medium">Amina Diallo</span>
        </nav>

        {/* HERO PROFILE CARD */}
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xl font-bold text-[#0e0e0e] shrink-0 relative">
                {aminaUser.avatarInitials}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-[#0e0e0e]">
                    {aminaUser.name}
                  </h1>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    Modératrice · React
                  </span>
                </div>
                <p className="text-xs text-[#757575] mt-0.5">{aminaUser.handle}</p>
                <p className="text-xs text-[#0e0e0e] font-medium mt-1">
                  {aminaUser.roleTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start">
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isFollowing
                    ? 'bg-white border border-[#e0e0e0] text-[#0e0e0e] hover:bg-neutral-50'
                    : 'bg-[#0e0e0e] text-white hover:bg-neutral-800'
                }`}
              >
                {isFollowing ? 'Abonné' : 'Suivre'}
              </button>
              <Link
                to="/messages"
                className="border border-[#e0e0e0] bg-white hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <MessageCircleIcon size={14} />
                <span>Message</span>
              </Link>
            </div>
          </div>

          <p className="text-xs text-[#3f3f46] leading-relaxed">
            {aminaUser.bio}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {aminaUser.tags?.map((t: string) => (
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
              <span>{aminaUser.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon size={13} />
              <span>{aminaUser.joinedDate}</span>
            </div>
            <span className="text-neutral-400">·</span>
            <span className="text-emerald-700 font-medium">Ouverte aux collaborations</span>
          </div>

          {/* Stats bar */}
          <div className="pt-3 border-t border-[#f0f0f0] flex items-center gap-6 text-xs text-[#0e0e0e]">
            <span>
              <strong className="font-bold">{aminaUser.contributionsCount}</strong> contributions
            </span>
            <span>
              <strong className="font-bold">{aminaUser.communitiesCount}</strong> communautés
            </span>
            <Link to="/profil/amina/abonnes" className="hover:underline">
              <strong className="font-bold">{aminaUser.followersCount}</strong> abonnés
            </Link>
            <Link to="/profil/amina/abonnements" className="hover:underline">
              <strong className="font-bold">{aminaUser.followingCount}</strong> abonnements
            </Link>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-[#e5e7eb] flex items-center gap-8 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('contributions')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'contributions'
                ? 'border-[#0e0e0e] text-[#0e0e0e] font-semibold'
                : 'border-transparent text-[#616161] hover:text-[#0e0e0e]'
            }`}
          >
            Contributions · {aminaUser.contributionsCount}
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
            Communautés · {aminaUser.communitiesCount}
          </button>
        </div>

        {/* CONTRIBUTIONS LIST */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-bold text-[#0e0e0e]">Contributions récentes</h2>
          <span className="text-xs font-semibold text-[#0e0e0e] cursor-pointer">
            Les plus récentes ▾
          </span>
        </div>

        <div className="space-y-4">
          {aminaContributions.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* VOIR PLUS */}
        <div className="text-center pt-2">
          <button className="border border-[#e0e0e0] bg-white hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] px-6 py-2.5 rounded-xl shadow-sm">
            Voir plus de contributions
          </button>
        </div>

        {/* PROJETS SECTION */}
        <div className="pt-6">
          <h2 className="text-base font-bold text-[#0e0e0e] mb-4">Projets</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {aminaProjects.map((p: Project) => (
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
                      Voir le projet
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
