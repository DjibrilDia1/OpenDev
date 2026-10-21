import { Link } from 'react-router-dom'
import { initials } from '../../lib/adapters'
import { profilePath } from '../../state/catalog'
import { useDemo } from '../../state/store'
import { Avatar } from '../common/Avatar'
import type { Community } from '../../types'
import { CommunityCalendar } from './CommunityCalendar'
import type { CommunityMemberRow } from './communityAccess'
import './community-management.css'

export function LiveCommunitySidebar({
  community,
  members,
  staff,
  error,
  onMembers,
}: {
  community: Community
  members: CommunityMemberRow[]
  staff: CommunityMemberRow[]
  error: string
  onMembers: () => void
}) {
  const { state } = useDemo()
  const team = staff
  const contact =
    team.find((member) => member.user_id !== state.profile.id) ?? team[0]
  return (
    <aside className="right-sidebar live-community-sidebar">
      <section>
        <h2>À propos</h2>
        <p className="muted mt-3">{community.description}</p>
        <div className="community-real-stats">
          <button onClick={onMembers}>
            <strong>
              {community.memberCountValue ?? community.memberCount}
            </strong>
            {community.memberCountValue != null && <span>Membres</span>}
          </button>
          {community.postCount != null && (
            <div>
              <strong>{community.postCount}</strong>
              <span>Publications</span>
            </div>
          )}
        </div>
      </section>
      <section>
        <h2>Pour bien démarrer</h2>
        {community.resources?.length ? (
          <div className="community-resource-links">
            {community.resources.map((resource) => (
              <a
                key={resource.url + resource.title}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{resource.title} ↗</strong>
                {resource.description && (
                  <span className="muted small">{resource.description}</span>
                )}
              </a>
            ))}
          </div>
        ) : (
          <p className="muted small mt-3">
            Les ressources de la communauté apparaîtront ici.
          </p>
        )}
      </section>
      <CommunityCalendar community={community} />
      <section>
        <div className="section-heading">
          <h2>La communauté</h2>
          <button className="text-button small" onClick={onMembers}>
            Tous les membres
          </button>
        </div>
        {error && (
          <p className="muted small" role="status">
            {error}
          </p>
        )}
        {team.length > 0 && (
          <>
            <h3 className="community-sidebar-subtitle">Modération</h3>
            {team.map((member) =>
              member.profile ? (
                <Link
                  className="community-sidebar-person"
                  key={member.user_id}
                  to={profilePath('@' + member.profile.username)}
                >
                  <Avatar
                    initials={initials(
                      member.profile.full_name || member.profile.username,
                    )}
                    imageUrl={member.profile.avatar_url}
                    size="sm"
                  />
                  <span>
                    <strong>
                      {member.profile.full_name || member.profile.username}
                    </strong>
                    <small className="muted">
                      {member.role === 'owner'
                        ? 'Administrateur'
                        : 'Modérateur'}
                    </small>
                  </span>
                </Link>
              ) : null,
            )}
          </>
        )}
        {members.length > 0 && (
          <>
            <h3 className="community-sidebar-subtitle">Membres</h3>
            <div className="community-member-avatars">
              {members.map((member) =>
                member.profile ? (
                  <Link
                    key={member.user_id}
                    to={profilePath('@' + member.profile.username)}
                    title={member.profile.full_name || member.profile.username}
                  >
                    <Avatar
                      initials={initials(
                        member.profile.full_name || member.profile.username,
                      )}
                      imageUrl={member.profile.avatar_url}
                      size="sm"
                    />
                  </Link>
                ) : null,
              )}
            </div>
          </>
        )}
        {contact?.profile && (
          <Link
            className="button secondary compact community-contact"
            to={
              contact.user_id === state.profile.id
                ? profilePath('@' + contact.profile.username)
                : `/messages?to=${contact.user_id}`
            }
          >
            Contacter la modération
          </Link>
        )}
      </section>
      <section className="community-charter">
        <h2>La charte de {community.name}</h2>
        {community.rules?.trim() ? (
          <details>
            <summary>Lire la charte de la communauté</summary>
            <ul>
              {community.rules
                .split('\n')
                .filter((rule) => rule.trim())
                .map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
            </ul>
          </details>
        ) : (
          <p className="small muted mt-3">
            Les règles OpenDev s’appliquent à cet espace.
          </p>
        )}
        <Link className="text-button small" to="/regles">
          Règles de la plateforme
        </Link>
      </section>
    </aside>
  )
}
