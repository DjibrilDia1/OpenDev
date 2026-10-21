import { Link, NavLink } from 'react-router-dom'
import { CommunityEmblem } from '../common/CommunityEmblem'
import { PlusIcon } from '../common/Icons'
import { useCommunities, useDemo, isCommunityMember } from '../../state/store'
import { useTheme } from '../../state/theme'
export function LeftSidebar({
  expanded = false,
  onCloseMobile,
}: {
  expanded?: boolean
  onCloseMobile?: () => void
}) {
  const communityCatalog = useCommunities()
  const { theme, toggleTheme } = useTheme()
  const { state, update, openAuth } = useDemo()
  const joined = state.signedIn
    ? communityCatalog.filter((community) =>
        isCommunityMember(state, community),
      )
    : []
  return (
    <aside
      className={'rail-inner ' + (expanded ? 'expanded' : '')}
      aria-label="Mes communautés"
    >
      <span className="rail-caption">
        {expanded ? 'Mes communautés' : 'Mes espaces'}
      </span>
      <div className="rail-links">
        {joined.slice(0, expanded ? undefined : 5).map((community) => (
          <NavLink
            className={({ isActive }) =>
              'rail-link ' + (isActive ? 'active' : '')
            }
            key={community.id}
            to={'/communaute/' + community.slug}
            title={community.name}
            aria-label={
              community.name +
              ((community.unreadCount || community.badgeCount) &&
              !state.readCommunities.includes(community.slug) &&
              !state.mutedCommunities.includes(community.slug)
                ? ', nouvelles activités'
                : '')
            }
            onClick={() => {
              update((previous) => ({
                ...previous,
                readCommunities: [
                  ...new Set([...previous.readCommunities, community.slug]),
                ],
              }))
              onCloseMobile?.()
            }}
          >
            <CommunityEmblem name={community.name} size={expanded ? 44 : 56} />
            <span className="rail-community-name">{community.name}</span>
            {!!(community.unreadCount || community.badgeCount) &&
              !state.readCommunities.includes(community.slug) &&
              !state.mutedCommunities.includes(community.slug) && (
                <span className="community-unread-dot" aria-hidden="true" />
              )}
          </NavLink>
        ))}
        <Link
          className="rail-add"
          to="/decouvrir"
          title="Rejoindre des communautés"
          aria-label="Rejoindre des communautés"
          onClick={onCloseMobile}
        >
          <PlusIcon size={24} />
          {expanded && <span>Découvrir les communautés</span>}
        </Link>
      </div>
      {expanded && !joined.length && (
        <p className="muted">
          Tes communautés apparaîtront ici après les avoir rejointes.
        </p>
      )}
      {!state.signedIn && expanded && (
        <button
          className="button"
          onClick={() => {
            onCloseMobile?.()
            openAuth()
          }}
        >
          Se connecter
        </button>
      )}
      <div className="rail-bottom rail-controls">
        <button
          type="button"
          className="rail-theme-toggle"
          onClick={toggleTheme}
          aria-label={
            theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'
          }
          title={
            theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'
          }
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {theme === 'dark' ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
              </>
            ) : (
              <path d="M20.6 14.3A9 9 0 0 1 9.7 3.4a9 9 0 1 0 10.9 10.9Z" />
            )}
          </svg>
          {expanded && (
            <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
          )}
        </button>
        <Link
          className="rail-settings"
          to="/parametres"
          aria-label="Paramètres"
          title="Paramètres"
          onClick={onCloseMobile}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="m9 3-.6 2.3-2 .9-2.1-.6-2 3.4 1.6 1.7v2.6L2.3 15l2 3.4 2.1-.6 2 .9L9 21h4l.6-2.3 2-.9 2.1.6 2-3.4-1.6-1.7v-2.6L19.7 9l-2-3.4-2.1.6-2-.9L13 3Z" />
            <circle cx="11" cy="12" r="3" />
          </svg>
          {expanded && <span>Paramètres</span>}
        </Link>
      </div>
    </aside>
  )
}
