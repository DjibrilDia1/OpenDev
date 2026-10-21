import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDemo } from '../../state/store'
import type { CommunityEvent } from '../../types/event'
import './community-management.css'

export function EventRsvpButton({ event }: { event: CommunityEvent }) {
  const { state, remote, requireAuth } = useDemo()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const registered = state.signedIn && state.eventIds.includes(event.id)
  const started = event.startsAt
    ? new Date(event.startsAt) <= new Date()
    : new Date(`${event.date}T${event.time}`) <= new Date()
  const full =
    event.capacity != null &&
    (event.availableSeats === 0 ||
      (event.attendeeCount != null && event.attendeeCount >= event.capacity))
  async function toggle() {
    if (!requireAuth() || !remote || pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await remote.rsvp(event.id, registered)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Inscription impossible. Réessaie.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <div>
      <button
        className={`button compact ${registered ? 'secondary' : ''}`}
        aria-pressed={registered}
        disabled={busy || (!registered && (started || full))}
        onClick={() => void toggle()}
      >
        {busy
          ? 'Enregistrement…'
          : registered
            ? 'Annuler mon inscription'
            : started
              ? 'Événement commencé'
              : full
                ? 'Complet'
                : 'Participer'}
      </button>
      {error && (
        <p className="field-error small mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function LiveEventCard({
  event,
  selected = false,
  compact = false,
}: {
  event: CommunityEvent
  selected?: boolean
  compact?: boolean
}) {
  const detail = `/evenements?${new URLSearchParams({ ...(event.communitySlug ? { communaute: event.communitySlug } : {}), evenement: event.id })}`
  const date = event.startsAt
    ? new Date(event.startsAt)
    : new Date(`${event.date}T${event.time}`)
  return (
    <article
      id={'event-' + event.id}
      className={`${compact ? 'community-event' : 'surface event-card'} ${selected ? 'community-event-selected' : ''}`}
    >
      {!compact && (
        <div className="date-tile">
          <span>{event.month}</span>
          <strong>{event.day}</strong>
        </div>
      )}
      <div className="grow">
        <p className="small muted">
          {event.community}
          {event.community && ' · '}
          {event.format === 'in_person' ? 'En présentiel' : 'En ligne'}
        </p>
        <h3>
          <Link to={detail}>{event.title}</Link>
        </h3>
        <p className="small muted mt-2">
          <time dateTime={event.startsAt}>
            {new Intl.DateTimeFormat('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
            }).format(date)}
          </time>
          {event.endsAt &&
            ` – ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.endsAt))}`}
        </p>
        <p className="small muted">
          {event.location ||
            (event.format === 'in_person' ? 'Lieu à préciser' : 'En ligne')}
        </p>
        {!compact && event.description && (
          <p className="community-event-description mt-3">
            {event.description}
          </p>
        )}
        {event.attendeeCount != null && (
          <p className="small muted mt-2">
            {event.attendeeCount} inscrit{event.attendeeCount > 1 ? 's' : ''}
            {event.capacity != null
              ? ` · ${event.availableSeats ?? Math.max(0, event.capacity - event.attendeeCount)} place${event.availableSeats === 1 ? '' : 's'} disponible${event.availableSeats === 1 ? '' : 's'} sur ${event.capacity}`
              : ''}
          </p>
        )}
        <div className="row wrap mt-3">
          <EventRsvpButton event={event} />
          {!compact && event.registrationUrl && (
            <a
              className="text-button small"
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Informations et lien externe ↗
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
