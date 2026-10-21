import './contribution.css'
import { contributionLevel } from '../../lib/contribution-level'

export function ContributionBadge({ score }: { score?: number }) {
  if (score === undefined || !Number.isFinite(score)) return null
  const { current } = contributionLevel(score)
  return (
    <span
      className="contribution-badge"
      title={`${score.toLocaleString('fr-FR')} points de contribution · ${current.name}`}
      aria-label={`${score.toLocaleString('fr-FR')} points de contribution, niveau ${current.name}`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
      </svg>
      {score.toLocaleString('fr-FR')} <span>pts</span>
    </span>
  )
}
