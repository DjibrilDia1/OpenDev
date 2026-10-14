import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CommunityEditor } from '../components/community/CommunityEditor'
import { AppLayout } from '../components/layout/AppLayout'
import { CommunityCard } from '../components/community/CommunityCard'
import { EmptyState } from '../components/common/EmptyState'
import { SearchIcon } from '../components/common/Icons'
import { categories, matches } from '../state/catalog'
import { useCommunities, useDemo } from '../state/store'
export function DiscoverPage() {
  const communityCatalog = useCommunities()
  const [params, setParams] = useSearchParams()
  const { state, requireAuth } = useDemo()
  const [creating, setCreating] = useState(false)
  const category = params.get('categorie') ?? 'Tout'
  const query = params.get('q') ?? ''
  const joinedOnly = params.get('mes') === '1'
  function setFilter(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }
  const filtered = communityCatalog.filter(
    (community) =>
      (!params.get('type') || community.kind === params.get('type')) &&
      (category === 'Tout' || community.category === category) &&
      matches(community.name + ' ' + community.description, query) &&
      (!joinedOnly ||
        (state.signedIn && state.joined.includes(community.slug))),
  )
  return (
    <AppLayout sidebarVariant="none">
      <div className="discover-page">
        <section className="discover-hero">
          <div className="discover-hero-copy">
            <p>Il y a une place pour toi ici.</p>
            <h1>
              Trouve tes gens.
              <br />
              Construis la suite.
            </h1>
            <p>
              Des communautés de développeurs pour apprendre,
              <br className="desktop-break" /> partager et donner vie à tes
              idées.
            </p>
            <a href="#communautes" className="button light">
              Explorer les communautés <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="discover-art" aria-hidden="true">
            <div className="art-grid" />
            <div className="art-window">
              <div className="art-window-header">
                <i />
                <i />
                <i />
              </div>
              <span>&lt;hello, world /&gt;</span>
              <div className="art-code-lines">
                <i />
                <i />
                <i />
              </div>
              <div className="art-avatars">
                <b>AD</b>
                <b>TN</b>
                <b>Toi</b>
              </div>
            </div>
            <span className="discover-star">✳</span>
            <span className="discover-bracket">{'{ }'}</span>
            <span className="art-small-orbit" />
          </div>
        </section>
        <section className="create-community-callout">
          <div>
            <h2>Ton idée mérite sa communauté.</h2>
            <p className="muted">
              Crée un espace, deviens son administrateur et invite tes abonnés.
            </p>
          </div>
          <button
            className="button"
            onClick={() => {
              if (requireAuth()) setCreating(true)
            }}
          >
            Créer une communauté
          </button>
        </section>
        <section id="communautes" className="discovery-results">
          <div className="discovery-toolbar">
            <div>
              <h2>À chacun son terrain de jeu</h2>
              <p className="muted">
                Une passion en commun. Des possibilités en plus.
              </p>
            </div>
            <label className="search-field">
              <SearchIcon aria-hidden="true" />
              <input
                aria-label="Rechercher une communauté"
                placeholder="Une communauté, un sujet…"
                value={query}
                onChange={(event) => setFilter('q', event.target.value)}
              />
            </label>
          </div>
          <div
            className="category-filters"
            aria-label="Catégories de communautés"
          >
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? 'active' : ''}
                aria-pressed={category === item}
                onClick={() => setFilter('categorie', item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="result-meta">
            <label className="community-kind-filter">
              Gestion{' '}
              <select
                aria-label="Type de communauté"
                value={params.get('type') ?? ''}
                onChange={(event) => setFilter('type', event.target.value)}
              >
                <option value="">Toutes</option>
                <option value="official">Officielles OpenDev</option>
                <option value="member">Créées par les membres</option>
              </select>
            </label>
            <span role="status">
              {filtered.length} communauté{filtered.length > 1 ? 's' : ''}
            </span>
            {state.signedIn && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={joinedOnly}
                  onChange={(event) =>
                    setFilter('mes', event.target.checked ? '1' : '')
                  }
                />{' '}
                Mes communautés
              </label>
            )}
          </div>
          <div className="communities-grid">
            {filtered.map((community) => (
              <CommunityCard community={community} key={community.id} />
            ))}
          </div>
          {!filtered.length && (
            <EmptyState
              title="Pas de communauté ici pour le moment"
              description="Essaie un autre sujet ou une autre catégorie."
            />
          )}
          <div className="discover-note">
            <span aria-hidden="true">&lt;/&gt;</span>
            <div>
              <strong>
                Pas besoin d’être expert pour prendre part à la conversation.
              </strong>
              <p>Ta curiosité est un très bon point de départ.</p>
            </div>
          </div>
        </section>
      </div>
      {creating && <CommunityEditor onClose={() => setCreating(false)} />}
    </AppLayout>
  )
}
