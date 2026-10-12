import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SearchIcon } from '../components/common/Icons'
import { communities } from '../mocks/opendev-data'

// Import extracted banners
import reactBanner from '../assets/images/decouvrir_banner_1.png'
import pythonBanner from '../assets/images/decouvrir_banner_3.png'
import designBanner from '../assets/images/decouvrir_banner_5.png'
import openSourceBanner from '../assets/images/decouvrir_banner_7.png'

export const DiscoverPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'Front' | 'Backend' | 'Design' | 'Open Source'>('Front')
  const [searchQuery, setSearchQuery] = useState('')
  const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({
    react: false,
    python: false,
    'design-systems': false,
    'open-source': false,
  })

  const toggleJoin = (slug: string) => {
    setJoinedMap((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }))
  }

  const communityBanners: Record<string, string> = {
    react: reactBanner,
    python: pythonBanner,
    'design-systems': designBanner,
    'open-source': openSourceBanner,
  }

  const tabs = [
    { label: 'Front', key: 'Front' },
    { label: 'Backend', key: 'Backend' },
    { label: 'Design', key: 'Design' },
    { label: 'Open Source', key: 'Open Source' },
  ] as const

  const filteredCommunities = communities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <AppLayout sidebarVariant="none" showRail={false}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HERO BANNER SOMBRE (FIDÈLE À DÉCOUVRIR.SVG) */}
        <div className="bg-[#3e3e3e] text-white rounded-2xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
          {/* Top navigation tabs in hero */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/10 pb-6 mb-12">
            <div className="flex items-center gap-6 text-sm font-medium">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key)}
                  className={`transition-colors relative pb-1 ${
                    selectedTab === tab.key
                      ? 'text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {selectedTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* In-hero Search input */}
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <SearchIcon size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une communaute"
                className="w-full bg-[#525252]/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-400 focus:outline-none focus:bg-[#525252] transition-colors"
              />
            </div>
          </div>

          {/* Hero Main Heading */}
          <div className="py-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              Trouver ta communaute
            </h1>
          </div>
        </div>

        {/* Subtitle text */}
        <p className="text-xs sm:text-sm text-[#616161]">
          Pose une question, partage une découverte ou aide quelqu’un à débloquer son projet.
        </p>

        {/* COMMUNITIES GRID (3 COLUMNS DESKTOP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {filteredCommunities.map((c) => {
            const isJoined = joinedMap[c.slug]
            const bannerImg = communityBanners[c.slug]

            return (
              <div
                key={c.id}
                className="bg-white border border-[#e0e0e0] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Banner Image */}
                  <div className="h-36 sm:h-40 w-full overflow-hidden bg-[#242424] relative">
                    {bannerImg ? (
                      <img
                        src={bannerImg}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center font-bold text-white text-xl"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.name}
                      </div>
                    )}

                    {/* Emblem Badge floating */}
                    <div className="absolute -bottom-3 left-4 w-10 h-10 rounded-xl bg-white border border-[#e0e0e0] p-1.5 shadow-sm flex items-center justify-center">
                      <div
                        className="w-full h-full rounded-lg flex items-center justify-center font-bold text-xs"
                        style={{ backgroundColor: c.bgColor, color: c.color }}
                      >
                        {c.slug === 'react' && '⚛'}
                        {c.slug === 'python' && '🐍'}
                        {c.slug === 'design-systems' && '◇'}
                        {c.slug === 'open-source' && '⑂'}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 pt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <Link
                        to={c.slug === 'react' ? '/communaute/react' : '#'}
                        className="text-base font-bold text-[#0e0e0e] hover:underline"
                      >
                        {c.name}
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#757575]">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span>{c.memberCount}</span>
                    </div>

                    <p className="text-xs text-[#616161] leading-relaxed line-clamp-2 pt-1">
                      {c.description}
                    </p>
                  </div>
                </div>

                {/* Footer Join Action */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => toggleJoin(c.slug)}
                    className={`w-full py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isJoined
                        ? 'bg-[#f4f4f5] text-[#0e0e0e] border border-[#e4e4e7]'
                        : 'bg-[#0e0e0e] text-white hover:bg-neutral-800'
                    }`}
                  >
                    <span>{isJoined ? '✓ Membre' : '+ Rejoindre'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
