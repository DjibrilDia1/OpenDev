import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PostCard } from '../components/feed/PostCard'
import {
  BellIcon,
  SearchIcon,
  CheckIcon,
  ChevronRightIcon,
  ArrowUpRightIcon,
} from '../components/common/Icons'
import { reactCommunityPosts } from '../mocks/opendev-data'
import type { Post } from '../types'

export const CommunityDetailPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'discussions' | 'questions' | 'projets' | 'ressources' | 'membres'>('discussions')
  const [isMember, setIsMember] = useState(true)
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [newPostContent, setNewPostContent] = useState('')

  const tabs = [
    { key: 'discussions', label: 'Discussions' },
    { key: 'questions', label: 'Questions / Entraide' },
    { key: 'projets', label: 'Projets' },
    { key: 'ressources', label: 'Ressources' },
    { key: 'membres', label: 'Membres' },
  ] as const

  const communityRightSidebar = (
    <aside className="w-80 shrink-0 space-y-4 py-6 px-4">
      {/* 1. À propos de React */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">À propos de React</h4>
        <p className="text-xs text-[#616161] mt-2 leading-relaxed">
          Un espace pour apprendre React, débloquer un problème et construire ensemble. Débutants et développeurs expérimentés sont les bienvenus.
        </p>
        <div className="mt-4 pt-3 border-t border-[#f0f0f0] space-y-2 text-xs text-[#757575]">
          <div className="flex items-center gap-2">
            <span>👥</span>
            <span>24 800 membres</span>
          </div>
          <div className="flex items-center gap-2">
            <span>💬</span>
            <span>32 discussions cette semaine</span>
          </div>
        </div>
      </div>

      {/* 2. Pour bien démarrer */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Pour bien démarrer</h4>
        <div className="mt-3 space-y-3">
          <a
            href="https://fr.react.dev"
            target="_blank"
            rel="noreferrer"
            className="flex items-start justify-between group cursor-pointer"
          >
            <div>
              <p className="text-xs font-bold text-[#0e0e0e] group-hover:underline">Documentation React</p>
              <p className="text-[11px] text-[#757575]">Le guide officiel en français · fr.react.dev</p>
            </div>
            <ArrowUpRightIcon size={14} className="text-[#616161]" />
          </a>

          <a
            href="https://fr.react.dev/learn"
            target="_blank"
            rel="noreferrer"
            className="flex items-start justify-between group cursor-pointer"
          >
            <div>
              <p className="text-xs font-bold text-[#0e0e0e] group-hover:underline">Penser en React</p>
              <p className="text-[11px] text-[#757575]">Découper une UI en composants · fr.react.dev/learn</p>
            </div>
            <ArrowUpRightIcon size={14} className="text-[#616161]" />
          </a>

          <a
            href="https://fr.react.dev/reference"
            target="_blank"
            rel="noreferrer"
            className="flex items-start justify-between group cursor-pointer"
          >
            <div>
              <p className="text-xs font-bold text-[#0e0e0e] group-hover:underline">Les règles des hooks</p>
              <p className="text-[11px] text-[#757575]">Les bons réflexes pour tes composants · fr.react.dev/reference</p>
            </div>
            <ArrowUpRightIcon size={14} className="text-[#616161]" />
          </a>
        </div>
        <button className="mt-3 text-xs font-semibold text-[#0e0e0e] flex items-center gap-1 hover:underline">
          <span>Voir les ressources React</span>
          <ChevronRightIcon size={12} />
        </button>
      </div>

      {/* 3. À venir */}
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

      {/* 4. La communauté */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm text-[#0e0e0e]">La communauté</h4>
          <span className="text-xs text-[#757575]">Membres</span>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-[#757575] uppercase mb-2">Modération</p>
            <div className="space-y-2">
              <Link to="/profil/amina" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e]">
                  AD
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#0e0e0e] group-hover:underline">Amina Diallo</h5>
                  <p className="text-[10px] text-[#757575]">Modératrice · React & accessibilité</p>
                </div>
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e]">
                  TN
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#0e0e0e]">Thomas Nguyen</h5>
                  <p className="text-[10px] text-[#757575]">Modérateur · React & TypeScript</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f0f0f0]">
            <p className="text-[11px] font-bold tracking-wider text-[#757575] uppercase mb-2">Au fil des échanges</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e]">
                  NP
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#0e0e0e]">Nora Petit</h5>
                  <p className="text-[10px] text-[#757575]">Composants React accessibles</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e]">
                  LM
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#0e0e0e]">Lucas Martin</h5>
                  <p className="text-[10px] text-[#757575]">Hooks et interfaces React</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button className="w-full mt-3 text-xs font-semibold text-[#0e0e0e] text-center hover:underline">
          Contacter la modération →
        </button>
      </div>

      {/* 5. Le respect fait partie du code */}
      <div className="bg-[#f2f2f0] border border-[#e0e0e0] rounded-2xl p-4">
        <h4 className="font-bold text-sm text-[#0e0e0e]">Le respect fait partie du code.</h4>
        <p className="text-xs text-[#616161] mt-1 mb-3 leading-relaxed">
          Explique, partage et aide sans juger. Un échange utile commence par l'envie de s'entraider.
        </p>
        <button className="text-xs font-semibold text-[#0e0e0e] hover:underline flex items-center gap-1">
          <span>Lire les règles de React</span>
          <ChevronRightIcon size={12} />
        </button>
      </div>

      {/* 6. Footer Links */}
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
      customRightSidebar={communityRightSidebar}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* BREADCRUMB */}
        <nav className="text-xs text-[#757575] flex items-center gap-2">
          <Link to="/decouvrir" className="hover:text-[#0e0e0e]">Communautés</Link>
          <span>/</span>
          <span className="text-[#0e0e0e] font-medium">React</span>
        </nav>

        {/* COMMUNITY HEADER CARD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#eff5ff] border border-blue-200 flex items-center justify-center text-2xl text-blue-600 shrink-0">
              ⚛
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[#0e0e0e]">
                  Communauté React
                </h1>
                <span className="text-[11px] font-semibold text-[#757575] bg-[#f4f4f5] px-2.5 py-0.5 rounded-full border border-[#e4e4e7]">
                  Frontend
                </span>
              </div>
              <p className="text-xs text-[#616161] mt-1">
                Composants, hooks et bonnes pratiques. Construisons le web de demain.
              </p>
              <p className="text-xs text-[#757575] mt-1">
                24 800 membres · 32 discussions cette semaine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={() => setIsMember(!isMember)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isMember
                  ? 'bg-white border border-[#e0e0e0] text-[#0e0e0e] hover:bg-neutral-50'
                  : 'bg-[#0e0e0e] text-white hover:bg-neutral-800'
              }`}
            >
              {isMember && <CheckIcon size={13} />}
              <span>{isMember ? 'Membre' : 'Rejoindre'}</span>
            </button>

            <button
              onClick={() => setNotificationsOn(!notificationsOn)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border border-[#e0e0e0] flex items-center gap-1.5 transition-colors ${
                notificationsOn ? 'bg-white text-[#0e0e0e]' : 'bg-[#f4f4f5] text-[#757575]'
              }`}
            >
              <BellIcon size={14} />
              <span>Notifications</span>
            </button>
          </div>
        </div>

        {/* TABS + SEARCH */}
        <div className="border-b border-[#e5e7eb] flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0e0e0e] text-[#0e0e0e] font-semibold'
                    : 'border-transparent text-[#616161] hover:text-[#0e0e0e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative pb-2 shrink-0 hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#9e9e9e] pb-2">
              <SearchIcon size={13} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans React"
              className="bg-transparent border-none pl-7 pr-2 py-1 text-xs text-[#0e0e0e] placeholder-[#9e9e9e] focus:outline-none"
            />
          </div>
        </div>

        {/* CREATE POST BOX */}
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-semibold text-[#0e0e0e]">
              JD
            </div>
            <input
              type="text"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Qu'as-tu appris ou construit avec React ?"
              className="flex-1 bg-[#f8f8f6] border border-[#e5e7eb] rounded-xl px-4 py-2 text-xs sm:text-sm text-[#0e0e0e] placeholder-[#9e9e9e] focus:outline-none focus:bg-white"
            />
            <button className="bg-[#0e0e0e] text-white hover:bg-neutral-800 transition-colors text-xs font-semibold px-4 py-2 rounded-xl">
              Publier
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#616161] pt-1 pl-12">
            <button className="flex items-center gap-1.5 hover:text-[#0e0e0e]">
              <span>💬</span>
              <span>Poser une question</span>
            </button>
            <button className="flex items-center gap-1.5 hover:text-[#0e0e0e]">
              <span>‹/›</span>
              <span>Présenter un projet</span>
            </button>
            <button className="flex items-center gap-1.5 hover:text-[#0e0e0e]">
              <span>📎</span>
              <span>Partager une ressource</span>
            </button>
          </div>
        </div>

        {/* FEED LIST */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-bold text-[#0e0e0e]">Discussions récentes</h2>
          <span className="text-xs font-semibold text-[#0e0e0e] cursor-pointer">
            Les plus récentes ▾
          </span>
        </div>

        <div className="space-y-4">
          {reactCommunityPosts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* VOIR PLUS */}
        <div className="text-center pt-2">
          <button className="border border-[#e0e0e0] bg-white hover:bg-neutral-50 transition-colors text-xs font-semibold text-[#0e0e0e] px-6 py-2.5 rounded-xl shadow-sm">
            Voir plus de discussions
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
