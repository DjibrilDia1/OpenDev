import { Link } from 'react-router-dom'
import type { User } from '../../types'
import { profilePath } from '../../state/catalog'
import { Avatar } from '../common/Avatar'
import { FollowButton } from '../common/FollowButton'
import { ContributionBadge } from './ContributionBadge'
export function PersonRow({ user }: { user: User }) {
  return (
    <div className="developer-row">
      <Link to={profilePath(user.handle)} aria-label={'Profil de ' + user.name}>
        <Avatar initials={user.avatarInitials} size="lg" />
      </Link>
      <div className="grow">
        <div className="person-contribution-heading">
          <Link className="post-author" to={profilePath(user.handle)}>
            {user.name}
          </Link>
          <ContributionBadge score={user.contributionScore} />
        </div>
        <p className="muted small">
          {user.handle} · {user.roleTitle}
        </p>
        <p className="developer-bio">{user.bio}</p>
        <div className="tags">
          {user.tags?.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <FollowButton user={user} />
    </div>
  )
}
