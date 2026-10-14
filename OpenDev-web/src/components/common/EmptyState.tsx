import { Link } from 'react-router-dom'
export function EmptyState({
  title,
  description,
  to,
  label,
}: {
  title: string
  description: string
  to?: string
  label?: string
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        ⌘
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {to && (
        <Link className="button secondary" to={to}>
          {label ?? 'Découvrir les communautés'}
        </Link>
      )}
    </div>
  )
}
