import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Community } from '../../types'
import type { CommunityEvent } from '../../types/event'
import {
  canAdministerCommunity,
  canReadCommunity,
  useCommunityEvents,
  useDemo,
  toggleItem,
} from '../../state/store'
import { Modal } from '../common/Modal'
import { LiveEventCard } from './LiveEventCard'
import { CommunityEventEditor } from './CommunityEventEditor'
import { api } from '../../lib/api'
import { toEvent, type EventRow } from '../../lib/adapters'

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export function CommunityCalendar({ community }: { community: Community }) {
  const { remote } = useDemo()
  return remote ? (
    <LiveCommunityCalendar community={community} />
  ) : (
    <DemoCommunityCalendar community={community} />
  )
}
function LiveCommunityCalendar({ community }: { community: Community }) {
  const { state, liveEvents } = useDemo()
  const [creating, setCreating] = useState(false)
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    api<EventRow[]>(
      `/events?community_id=${community.id}&starts_after=${encodeURIComponent(new Date().toISOString())}&limit=2`,
    )
      .then((rows) => {
        if (!cancelled) {
          setEvents(rows.map(toEvent))
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled)
          setError('Le calendrier ne peut pas être chargé pour le moment.')
      })
    return () => {
      cancelled = true
    }
  }, [community.id, liveEvents])
  const allowed =
    state.signedIn &&
    (community.ownerId === state.profile.id ||
      community.myPermissions?.includes('manage_events'))
  return (
    <section className="community-calendar">
      <div className="section-heading">
        <h2>À venir</h2>
        {allowed && (
          <button
            className="text-button small"
            onClick={() => setCreating(true)}
          >
            Organiser
          </button>
        )}
      </div>
      {events.map((event) => (
        <LiveEventCard key={event.id} event={event} compact />
      ))}
      {error && (
        <p className="small field-error" role="status">
          {error}
        </p>
      )}
      {!error && !events.length && (
        <p className="small muted mt-3">
          Aucun événement à venir pour le moment.
        </p>
      )}
      <Link
        className="text-button calendar-page-link"
        to={'/evenements?communaute=' + encodeURIComponent(community.slug)}
      >
        Voir le calendrier complet
      </Link>
      {creating && (
        <CommunityEventEditor
          community={community}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  )
}
function DemoCommunityCalendar({ community }: { community: Community }) {
  const { state, update, requireAuth, notify, remote } = useDemo()
  const events = useCommunityEvents().filter(
    (event) =>
      event.communitySlug === community.slug ||
      (!event.communitySlug && event.community === community.name),
  )
  const [editing, setEditing] = useState<CommunityEvent | 'new' | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const admin = !remote && canAdministerCommunity(state, community)
  if (!canReadCommunity(state, community)) return null
  const today = dayKey(new Date())
  const visible = events
    .filter(
      (event) =>
        event.date > today ||
        (event.date === today &&
          event.time >= new Date().toTimeString().slice(0, 5)),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3)
  return (
    <section
      className="community-calendar"
      aria-label={'Événements à venir de ' + community.name}
    >
      <h2>Les prochains rendez-vous</h2>
      <p className="muted small">
        Organisés par l’administration de {community.name}
      </p>
      {visible.map((event) => (
        <article className="community-event" key={event.id}>
          <p className="small muted">
            {new Date(event.date + 'T12:00:00').toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}{' '}
            · {event.time}
          </p>
          <h3>{event.title}</h3>
          <p className="small muted">{event.location}</p>
          <button
            className="text-button"
            onClick={() => {
              if (remote) {
                void remote
                  .rsvp(event.id, state.eventIds.includes(event.id))
                  .catch((cause) => notify(cause.message))
                return
              }
              if (requireAuth())
                update((previous) => ({
                  ...previous,
                  eventIds: toggleItem(previous.eventIds, event.id),
                }))
            }}
          >
            {state.signedIn && state.eventIds.includes(event.id)
              ? 'Annuler mon inscription'
              : 'Participer'}
          </button>
          {admin && event.organizerId && (
            <div className="row wrap">
              <button
                className="text-button small"
                onClick={() => {
                  setError('')
                  setEditing(event)
                }}
              >
                Modifier
              </button>
              <button
                className="text-button small"
                onClick={() => setRemoving(event.id)}
              >
                Supprimer
              </button>
            </div>
          )}
        </article>
      ))}
      {!visible.length && (
        <p className="small muted mt-3">
          Aucun événement à venir pour le moment.
        </p>
      )}
      <Link
        className="text-button calendar-page-link"
        to={'/evenements?communaute=' + encodeURIComponent(community.slug)}
      >
        Voir le calendrier complet
      </Link>
      {admin && (
        <button
          className="button compact mt-3"
          onClick={() => {
            setError('')
            setEditing('new')
          }}
        >
          ＋ Organiser un événement
        </button>
      )}
      {editing && admin && (
        <Modal
          title={
            editing === 'new'
              ? 'Organiser un événement'
              : 'Modifier l’événement'
          }
          onClose={() => setEditing(null)}
        >
          <form
            className="community-editor"
            onSubmit={(event) => {
              event.preventDefault()
              if (!canAdministerCommunity(state, community)) return
              const form = new FormData(event.currentTarget)
              const date = String(form.get('date'))
              const time = String(form.get('time'))
              if (new Date(date + 'T' + time) <= new Date()) {
                setError('Choisis une date et une heure futures.')
                return
              }
              const title = String(form.get('title')).trim()
              const location = String(form.get('location')).trim()
              if (!title || !location) {
                setError('Renseigne le titre et le lieu.')
                return
              }
              const next: CommunityEvent = {
                id: editing === 'new' ? crypto.randomUUID() : editing.id,
                title,
                date,
                time,
                location,
                community: community.name,
                communitySlug: community.slug,
                organizerId: state.profile.id,
                day: date.slice(-2),
                month: new Date(date + 'T12:00:00').toLocaleDateString(
                  'fr-FR',
                  { month: 'short' },
                ),
              }
              update((previous) => ({
                ...previous,
                communityEvents: [
                  ...previous.communityEvents.filter(
                    (item) => item.id !== next.id,
                  ),
                  next,
                ],
              }))
              setEditing(null)
              notify('Événement enregistré dans la démo.')
            }}
          >
            <label>
              Titre
              <input
                name="title"
                required
                maxLength={100}
                defaultValue={editing === 'new' ? '' : editing.title}
              />
            </label>
            <label>
              Date
              <input
                name="date"
                type="date"
                required
                min={today}
                defaultValue={editing === 'new' ? today : editing.date}
              />
            </label>
            <label>
              Heure
              <input
                name="time"
                type="time"
                required
                defaultValue={editing === 'new' ? '18:00' : editing.time}
              />
            </label>
            <label>
              Lieu ou lien de visioconférence
              <input
                name="location"
                required
                maxLength={200}
                defaultValue={editing === 'new' ? 'En ligne' : editing.location}
              />
            </label>
            <p className="small muted">
              Horaires selon le lieu indiqué. Les événements privés sont
              réservés aux membres.
            </p>
            {error && <p role="alert">{error}</p>}
            <button className="button">Enregistrer</button>
          </form>
        </Modal>
      )}
      {removing && admin && (
        <Modal
          title="Supprimer cet événement ?"
          onClose={() => setRemoving(null)}
        >
          <p>Il sera retiré du calendrier et des inscriptions.</p>
          <div className="row mt-4">
            <button
              className="button secondary"
              onClick={() => setRemoving(null)}
            >
              Annuler
            </button>
            <button
              className="button"
              onClick={() => {
                update((previous) => ({
                  ...previous,
                  communityEvents: previous.communityEvents.filter(
                    (event) => event.id !== removing,
                  ),
                  eventIds: previous.eventIds.filter((id) => id !== removing),
                }))
                setRemoving(null)
              }}
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
