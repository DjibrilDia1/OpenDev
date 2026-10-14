import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { NavIcon, type NavIconName } from '../common/NavIcon'
import { SearchIcon } from '../common/Icons'
import { useDemo } from '../../state/store'
import { Avatar } from '../common/Avatar'

export function MainNavigation({
  mobile = false,
  onOpenMenu,
}: {
  mobile?: boolean
  onOpenMenu?: () => void
}) {
  const { state } = useDemo()
  const items: { to: string; label: string; icon: NavIconName }[] = [
    { to: '/', label: 'Accueil', icon: 'home' },
    { to: '/decouvrir', label: 'Découvrir', icon: 'communities' },
    ...(state.signedIn
      ? [
          { to: '/messages', label: 'Messages', icon: 'messages' as const },
          { to: '/enregistres', label: 'Enregistrés', icon: 'saved' as const },
          {
            to: '/notifications',
            label: 'Notifications',
            icon: 'notifications' as const,
          },
        ]
      : []),
    { to: '/evenements', label: 'Événements', icon: 'events' },
  ]
  return (
    <nav
      className={mobile ? 'mobile-links' : 'main-navigation'}
      aria-label={mobile ? 'Navigation mobile' : 'Navigation principale'}
    >
      {items
        .filter((item) =>
          mobile
            ? !['/messages', '/enregistres'].includes(item.to)
            : !['/evenements', '/enregistres'].includes(item.to),
        )
        .map(({ to, label, icon }) => (
          <NavLink
            key={to}
            end={to === '/'}
            to={to}
            className={({ isActive }) =>
              'nav-link ' + (isActive ? 'active' : '')
            }
          >
            <NavIcon name={icon} />
            <span>{label}</span>
            {icon === 'notifications' && !state.readNotifications && (
              <span className="notification-dot" />
            )}
          </NavLink>
        ))}
      {mobile && (
        <button
          className="nav-link"
          onClick={onOpenMenu}
          aria-label="Ouvrir le menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
          <span>Plus</span>
        </button>
      )}
    </nav>
  )
}
export function TopNav({
  onToggleMobileMenu,
}: {
  onToggleMobileMenu: () => void
}) {
  const { state, openAuth, requireAuth } = useDemo()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <button
          className="icon-button menu-toggle"
          onClick={onToggleMobileMenu}
          aria-label="Ouvrir mon espace et mes communautés"
        >
          <Avatar
            initials={state.signedIn ? state.profile.avatarInitials : 'OD'}
            imageUrl={state.signedIn ? state.profile.avatarUrl : undefined}
            size="sm"
          />
        </button>
        <Link to="/" className="brand" aria-label="OpenDev, accueil">
          <svg
            className="brand-symbol"
            width="30"
            height="30"
            viewBox="0 0 64 64"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
          >
            <path d="M33 15c-9-9-24-2-24 10v14c0 13 15 20 24 10" />
            <path d="M31 15c9-9 24-2 24 10v14c0 13-15 20-24 10" />
            <path d="M24 32h16" />
          </svg>
          OpenDev
        </Link>
        <form
          className="global-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/recherche?q=' + encodeURIComponent(query.trim()))
          }}
        >
          <SearchIcon aria-hidden="true" size={18} />
          <input
            aria-label="Rechercher sur OpenDev"
            placeholder="Rechercher…"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="submit"
            className="search-submit"
            aria-label="Lancer la recherche"
          >
            ↵
          </button>
        </form>
        <MainNavigation />
        <div className="account-nav">
          {state.signedIn && (
            <Link
              className="desktop-profile"
              to="/profil"
              aria-label="Mon profil"
              title="Mon profil"
            >
              <Avatar
                initials={state.profile.avatarInitials}
                imageUrl={state.profile.avatarUrl}
                size="sm"
              />
              <span>Moi</span>
            </Link>
          )}
          <nav className="account-shortcuts" aria-label="Raccourcis personnels">
            <NavLink
              to="/evenements"
              className={({ isActive }) =>
                'nav-link ' + (isActive ? 'active' : '')
              }
            >
              <NavIcon name="events" />
              <span>Événements</span>
            </NavLink>
            {state.signedIn && (
              <NavLink
                to="/enregistres"
                className={({ isActive }) =>
                  'nav-link ' + (isActive ? 'active' : '')
                }
              >
                <NavIcon name="saved" />
                <span>Enregistrés</span>
              </NavLink>
            )}
          </nav>
          <button
            className="icon-button mobile-publish"
            aria-label="Créer une publication"
            onClick={() => {
              if (requireAuth()) navigate('/?publier=1')
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M13 4H4v16h16v-9M15 3l6 6M10 14l-1 1 1-5L19 1l4 4-9 9Z" />
            </svg>
          </button>
          <Link
            className="icon-button mobile-messages"
            to="/messages"
            aria-label="Messages"
          >
            <NavIcon name="messages" />
          </Link>
          {!state.signedIn && (
            <button className="button compact" onClick={openAuth}>
              Se connecter
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
