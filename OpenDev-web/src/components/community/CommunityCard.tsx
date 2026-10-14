import { Link } from 'react-router-dom'
import type { Community } from '../../types'
import { CommunityEmblem } from '../common/CommunityEmblem'
import { CommunityVisibility } from '../common/CommunityVisibility'
import { communityArt } from '../../state/catalog'
import { useDemo, isCommunityMember } from '../../state/store'
export function CommunityCard({ community }: { community: Community }) {
  const { state, toggleJoin } = useDemo()
  const joined = isCommunityMember(state, community)
  const isOwner = state.signedIn && community.ownerId === state.profile.id
  return (
    <article className="community-card">
      <Link
        className="community-cover"
        to={'/communaute/' + community.slug}
        tabIndex={-1}
        aria-hidden="true"
      >
        <img
          src={community.coverUrl || communityArt(community.category)}
          alt=""
          width={440}
          height={170}
          loading="lazy"
        />
        <span className="cover-category">{community.category}</span>
      </Link>
      <div className="community-card-body">
        <CommunityEmblem name={community.name} size={48} />
        <h2>
          <Link to={'/communaute/' + community.slug}>{community.name}</Link>
        </h2>
        <span
          className={
            'community-kind ' + (community.kind === 'member' ? 'member' : '')
          }
        >
          {community.kind === 'member'
            ? 'Communauté de membre'
            : 'Officielle OpenDev'}
        </span>
        <p className="small muted">{community.memberCount}</p>
        <p className="small muted">
          <CommunityVisibility visibility={community.visibility}/>
        </p>
        <p className="community-description">{community.description}</p>
        {community.kind === 'member' && (
          <p className="small muted">Créée par {community.ownerName}</p>
        )}
        <div className="community-card-footer">
          <span className="small muted">
            {community.weeklyDiscussionsCount} discussions / semaine
          </span>
          <button
            disabled={isOwner}
            className={'button compact ' + (joined ? 'secondary' : '')}
            aria-label={
              (isOwner
                ? 'Administrateur de '
                : joined
                  ? 'Quitter '
                  : 'Rejoindre ') + community.name
            }
            aria-pressed={joined}
            onClick={() => toggleJoin(community.slug)}
          >
            {isOwner
              ? 'Administrateur'
              : joined
                ? '✓ Membre'
                : state.signedIn &&
                    state.joinRequests[community.slug]?.includes(
                      state.profile.id,
                    )
                  ? 'Annuler la demande'
                  : community.visibility === 'private'
                    ? 'Demander à rejoindre'
                    : 'Rejoindre'}
          </button>
        </div>
      </div>
    </article>
  )
}
