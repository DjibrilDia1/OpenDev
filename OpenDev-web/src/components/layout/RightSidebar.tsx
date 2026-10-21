import { usePeople } from '../../state/store'
import { Link } from 'react-router-dom'
import { Avatar } from '../common/Avatar'
import { FollowButton } from '../common/FollowButton'
import { profilePath } from '../../state/catalog'
import { useDemo, toggleItem, useCommunityEvents } from '../../state/store'

export function RightSidebar() {
  const people = usePeople()
  const upcomingEvents = useCommunityEvents()
  const { state, update, requireAuth, notify, allPosts, remote } = useDemo()
  const contributionCount = allPosts.filter(
    (post) => post.author.handle === state.profile.handle,
  ).length
  return (
    <aside className="right-sidebar" aria-label="À découvrir">
      {state.signedIn && (
        <section className="sidebar-profile" aria-label="Mon profil en résumé">
          <Link
            to="/profil"
            className="sidebar-profile-banner"
            aria-label="Voir mon profil"
          >
            <span aria-hidden="true">&lt;build together /&gt;</span>
          </Link>
          <Link
            to="/profil"
            className="sidebar-profile-identity"
            aria-label="Voir mon profil"
          >
            <Avatar
              initials={state.profile.avatarInitials}
              imageUrl={state.profile.avatarUrl}
              size="lg"
            />
            <div className="grow">
              <h2>{state.profile.name}</h2>
              <p className="muted">{state.profile.roleTitle}</p>
            </div>
          </Link>
          <div className="sidebar-profile-stats">
            <Link to="/profil">{contributionCount} contributions</Link>
            <span>{state.joined.length} communautés</span>
            <Link to="/profil/me/abonnements">
              {state.following.length} suivis
            </Link>
          </div>
        </section>
      )}
      <section>
        <div className="section-heading">
          <h2>Des devs à suivre</h2>
          <Link to="/developpeurs">Voir tout</Link>
        </div>
        <div className="suggestion-list">
          {people
            .filter((user) => !user.isSelf)
            .slice(0, 3)
            .map((user) => (
              <div className="person-row" key={user.id}>
                <Link
                  to={profilePath(user.handle)}
                  aria-label={'Voir le profil de ' + user.name}
                >
                  <Avatar initials={user.avatarInitials} />
                </Link>
                <Link
                  className="grow person-name"
                  to={profilePath(user.handle)}
                >
                  <strong>{user.name}</strong>
                  <span>{user.roleTitle}</span>
                </Link>
                <FollowButton user={user} />
              </div>
            ))}
        </div>
      </section>
      {!remote && (
        <section className="sidebar-topics">
          <h2>Dans les conversations</h2>
          {[
            { tag: 'React', label: 'Composants & bonnes pratiques' },
            { tag: 'TypeScript', label: 'Des types qui font la différence' },
            { tag: 'open-source', label: 'Construire ensemble' },
          ].map((topic) => (
            <Link
              to={'/recherche?q=' + encodeURIComponent(topic.tag)}
              className="topic-row"
              key={topic.tag}
            >
              <span>
                <strong>#{topic.tag}</strong>
                <small>{topic.label}</small>
              </span>
            </Link>
          ))}
        </section>
      )}
      <section>
        <div className="section-heading">
          <h2>On se retrouve ?</h2>
          <Link to="/evenements">Calendrier</Link>
        </div>
        {upcomingEvents.map((event) => (
          <div className="event-row" key={event.id}>
            <div className="date-tile">
              <span>{event.month}</span>
              <strong>{event.day}</strong>
            </div>
            <div className="grow">
              <strong>{event.title}</strong>
              <p className="muted small">
                {event.location} · {event.time}
              </p>
              <button
                className="text-button small"
                aria-pressed={state.eventIds.includes(event.id)}
                onClick={() => {
                  if (!requireAuth()) return
                  if (remote) {
                    void remote
                      .rsvp(event.id, state.eventIds.includes(event.id))
                      .catch((cause) => notify(cause.message))
                    return
                  }
                  update((previous) => ({
                    ...previous,
                    eventIds: toggleItem(previous.eventIds, event.id),
                  }))
                  notify(
                    state.eventIds.includes(event.id)
                      ? 'Participation annulée.'
                      : 'Participation enregistrée dans la démo.',
                  )
                }}
              >
                {state.eventIds.includes(event.id)
                  ? '✓ Je participe'
                  : 'Participer'}
              </button>
            </div>
          </div>
        ))}
      </section>
      <div className="sidebar-footer">
        <Link to="/a-propos">À propos</Link>
        <Link to="/regles">Règles</Link>
        <Link to="/confidentialite">Confidentialité</Link>
        <p>Fait pour celles et ceux qui construisent.</p>
        <p>© OpenDev 2026{!remote && ' · Démonstration'}</p>
      </div>
    </aside>
  )
}
