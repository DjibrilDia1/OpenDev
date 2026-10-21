import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { LiveEventCard } from '../components/community/LiveEventCard'
import { CommunityEventEditor } from '../components/community/CommunityEventEditor'
import { api } from '../lib/api'
import { toEvent, type EventRow } from '../lib/adapters'
import { useCommunities, useDemo } from '../state/store'
import type { CommunityEvent } from '../types/event'

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export function LiveEventsPage() {
  const [params] = useSearchParams()
  const { state, liveEvents } = useDemo()
  const communities = useCommunities()
  const community = communities.find(
    (item) => item.slug === params.get('communaute'),
  )
  const selectedEventId = params.get('evenement')
  const today = new Date()
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [mine, setMine] = useState(false)
  const [rows, setRows] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [more, setMore] = useState(false)
  const [paging, setPaging] = useState(false)
  const [retry, setRetry] = useState(0)
  const [creating, setCreating] = useState(false)
  const [focused, setFocused] = useState<CommunityEvent | null>(null)
  const generation = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const after = month.toISOString()
  const before = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    1,
  ).toISOString()
  const query = new URLSearchParams({
    limit: '100',
    include_past: 'true',
    starts_after: after,
    starts_before: before,
    ...(community ? { community_id: community.id } : {}),
  }).toString()
  const allowed =
    community &&
    state.signedIn &&
    (community.ownerId === state.profile.id ||
      community.myPermissions?.includes('manage_events'))
  useEffect(() => {
    if (!selectedEventId) {
      setFocused(null)
      return
    }
    let cancelled = false
    api<EventRow>(`/events/${encodeURIComponent(selectedEventId)}`)
      .then((row) => {
        if (cancelled) return
        const event = toEvent(row)
        setFocused(event)
        const date = new Date(event.startsAt ?? `${event.date}T${event.time}`)
        setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
        setSelected(event.date)
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : 'Événement introuvable.',
          )
      })
    return () => {
      cancelled = true
    }
  }, [selectedEventId, retry])
  useEffect(() => {
    let cancelled = false
    generation.current += 1
    setLoading(true)
    setError('')
    api<EventRow[]>(`/events?${query}`)
      .then((result) => {
        if (!cancelled) {
          setRows(result.map(toEvent))
          setMore(result.length === 100)
        }
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Impossible de charger les événements.',
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query, retry, liveEvents])
  useEffect(() => {
    if (focused && rows.some((row) => row.id === focused.id))
      document
        .getElementById('event-' + focused.id)
        ?.scrollIntoView({ block: 'nearest' })
  }, [focused, rows])
  async function loadMore() {
    if (paging) return
    setPaging(true)
    const version = generation.current
    try {
      const result = await api<EventRow[]>(
        `/events?${query}&offset=${rows.length}`,
      )
      if (!alive.current || generation.current !== version) return
      setRows((previous) => [
        ...previous,
        ...result
          .map(toEvent)
          .filter((event) => !previous.some((item) => item.id === event.id)),
      ])
      setMore(result.length === 100)
    } catch (cause) {
      if (alive.current && generation.current === version)
        setError(
          cause instanceof Error ? cause.message : 'Chargement impossible.',
        )
    } finally {
      if (alive.current) setPaging(false)
    }
  }
  const offset = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const shown = rows.filter(
    (event) =>
      event.date.startsWith(dateKey(month).slice(0, 7)) &&
      (!selected || event.date === selected) &&
      (!mine || state.eventIds.includes(event.id)),
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
            Calendrier de{' '}
            <Link to={'/communaute/' + community.slug}>{community.name}</Link> ·{' '}
            <Link className="text-button" to="/evenements">
              Toutes les communautés
            </Link>
          </p>
        )}
        {allowed && (
          <button
            className="button compact mt-3"
            onClick={() => setCreating(true)}
          >
            Organiser un événement
          </button>
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
            <h2 aria-live="polite">
              {new Intl.DateTimeFormat('fr-FR', {
                month: 'long',
                year: 'numeric',
              }).format(month)}
            </h2>
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
              <span key={'blank' + index} />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const date = new Date(
                month.getFullYear(),
                month.getMonth(),
                index + 1,
              )
              const key = dateKey(date)
              const count = rows.filter((event) => event.date === key).length
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
                    (count
                      ? `, ${count} événement${count > 1 ? 's' : ''}`
                      : ', aucun événement')
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
          <p className="small muted mt-3">
            Horaires dans ton fuseau :{' '}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}.
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
          {loading && (
            <div
              className="community-loading"
              role="status"
              aria-label="Chargement des événements"
            >
              <span className="loading-spinner" aria-hidden="true" />
            </div>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
              <button
                className="text-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Réessayer
              </button>
            </p>
          )}
          <div className="events-list">
            {shown.map((event) => (
              <LiveEventCard
                key={event.id}
                event={event}
                selected={event.id === selectedEventId}
              />
            ))}
            {!loading && !error && !shown.length && (
              <div className="surface">
                <h3>Aucun événement sur cette période</h3>
                <p className="muted mt-2">
                  Choisis un autre jour, un autre mois ou retire le filtre des
                  inscriptions.
                </p>
              </div>
            )}
          </div>
          {more && (
            <button
              className="button secondary mt-4"
              disabled={paging || loading}
              onClick={() => void loadMore()}
            >
              {paging ? 'Chargement…' : 'Afficher plus d’événements'}
            </button>
          )}
        </section>
      </div>
      {creating && community && (
        <CommunityEventEditor
          community={community}
          onClose={() => setCreating(false)}
        />
      )}
    </AppLayout>
  )
}
