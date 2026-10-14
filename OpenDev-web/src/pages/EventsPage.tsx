import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import {
  toggleItem,
  useDemo,
  useCommunityEvents,
  useCommunities,
} from '../state/store'

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export function EventsPage() {
  const [params] = useSearchParams()
  const community = useCommunities().find(
    (item) => item.slug === params.get('communaute'),
  )
  const upcomingEvents = useCommunityEvents().filter(
    (event) =>
      !community ||
      event.communitySlug === community.slug ||
      (!event.communitySlug && event.community === community.name),
  )
  const { state, update, requireAuth, notify } = useDemo()
  const today = new Date()
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [mine, setMine] = useState(false)
  const monthLabel = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(month)
  const offset = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const prefix = dateKey(month).slice(0, 7)
  const events = upcomingEvents.filter(
    (event) =>
      event.date.startsWith(prefix) &&
      (!selected || event.date === selected) &&
      (!mine || (state.signedIn && state.eventIds.includes(event.id))),
  )
  function changeMonth(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))
    setSelected(null)
  }
  return (
    <AppLayout sidebarVariant="none">
      <div className="page-heading">
        <h1>Événements</h1>
        <p>Ateliers, rencontres et occasions de construire ensemble.</p>
        {community && (
          <p className="mt-3">
            Calendrier de {community.name} ·{' '}
            <Link className="text-button" to="/evenements">
              Toutes les communautés
            </Link>
          </p>
        )}
      </div>
      <div className="events-layout">
        <section
          className="surface calendar"
          aria-label="Calendrier des événements"
        >
          <div className="calendar-heading">
            <button
              className="icon-button"
              aria-label="Mois précédent"
              onClick={() => changeMonth(-1)}
            >
              ‹
            </button>
            <h2 aria-live="polite">{monthLabel}</h2>
            <button
              className="icon-button"
              aria-label="Mois suivant"
              onClick={() => changeMonth(1)}
            >
              ›
            </button>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: offset }, (_, index) => (
              <span key={'empty-' + index} />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const date = new Date(
                month.getFullYear(),
                month.getMonth(),
                index + 1,
              )
              const key = dateKey(date)
              const count = upcomingEvents.filter(
                (event) => event.date === key,
              ).length
              return (
                <button
                  key={key}
                  className={
                    (selected === key ? 'selected ' : '') +
                    (key === dateKey(today) ? 'today' : '')
                  }
                  aria-label={
                    new Intl.DateTimeFormat('fr-FR', {
                      dateStyle: 'full',
                    }).format(date) +
                    (count ? `, ${count} événement` : ', aucun événement')
                  }
                  aria-pressed={selected === key}
                  aria-current={key === dateKey(today) ? 'date' : undefined}
                  onClick={() => setSelected(selected === key ? null : key)}
                >
                  {index + 1}
                  {count > 0 && (
                    <span className="calendar-event-dot" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>
          <div className="row wrap mt-4">
            <button
              className="text-button"
              onClick={() => {
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                setSelected(null)
              }}
            >
              Aujourd’hui
            </button>
            <button className="text-button" onClick={() => setSelected(null)}>
              Tout le mois
            </button>
          </div>
          <p className="muted small mt-3">
            Le point bleu indique un événement. Horaires affichés selon le lieu
            indiqué.
          </p>
        </section>
        <section aria-label="Liste des événements">
          <div className="section-heading">
            <h2>{selected ? 'Ce jour-là' : 'Au programme'}</h2>
            {state.signedIn && (
              <label className="checkbox-label small">
                <input
                  type="checkbox"
                  checked={mine}
                  onChange={(event) => setMine(event.target.checked)}
                />
                Mes inscriptions
              </label>
            )}
          </div>
          <p className="small muted mb-4">
            Événements de démonstration · inscriptions locales
          </p>
          <div className="events-list">
            {events.map((event) => {
              const registered =
                state.signedIn && state.eventIds.includes(event.id)
              const past = event.date < dateKey(today)
              return (
                <article className="surface event-card" key={event.id}>
                  <div className="date-tile">
                    <span>{event.month}</span>
                    <strong>{event.day}</strong>
                  </div>
                  <div className="grow">
                    <p className="small muted">
                      {event.community} · {past ? 'Passé' : 'À venir'}
                    </p>
                    <h3>{event.title}</h3>
                    <p className="muted small">
                      {event.location} · {event.time}
                    </p>
                    <button
                      className={
                        'button compact mt-3 ' + (registered ? 'secondary' : '')
                      }
                      disabled={past && !registered}
                      aria-pressed={registered}
                      onClick={() => {
                        if (!requireAuth()) return
                        update((previous) => ({
                          ...previous,
                          eventIds: toggleItem(previous.eventIds, event.id),
                        }))
                        notify(
                          registered
                            ? 'Inscription annulée.'
                            : 'Inscription enregistrée dans la démo.',
                        )
                      }}
                    >
                      {registered
                        ? 'Annuler mon inscription'
                        : past
                          ? 'Événement terminé'
                          : 'Participer'}
                    </button>
                  </div>
                </article>
              )
            })}
            {!events.length && (
              <div className="surface">
                <h3>Aucun événement sur cette période</h3>
                <p className="muted mt-2">
                  Choisis un autre jour, un autre mois ou retire le filtre des
                  inscriptions.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
