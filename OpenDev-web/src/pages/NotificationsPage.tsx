import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Avatar } from '../components/common/Avatar'
import { EmptyState } from '../components/common/EmptyState'
import { initials } from '../lib/adapters'
import {
  communicationTime,
  notificationDestination,
  notificationTimestamp,
  useCommunicationsApi,
} from '../lib/communications'
import { useDemo } from '../state/store'
import type { ActivityNotification } from '../types/communications'
import './communications.css'

const PAGE_SIZE = 50
const activityText: Record<ActivityNotification['kind'], string> = {
  message: 't’a envoyé un message.',
  follow: 'suit ton profil.',
  comment: 'a répondu à une discussion.',
  reaction: 'a aimé ta publication.',
  event_created: 'a ajouté un événement au calendrier.',
  event_updated: 'a modifié un événement du calendrier.',
  event_cancelled: 'a annulé un événement.',
}
function mergeNotifications(
  previous: ActivityNotification[],
  incoming: ActivityNotification[],
) {
  const byId = new Map(previous.map((item) => [item.id, item]))
  incoming.forEach((item) => byId.set(item.id, item))
  return [...byId.values()].sort(
    (a, b) =>
      notificationTimestamp(b.created_at).localeCompare(
        notificationTimestamp(a.created_at),
      ) || b.id.localeCompare(a.id),
  )
}

export function NotificationsPage() {
  const { state } = useDemo()
  return <LiveNotifications key={state.profile.id} />
}

function LiveNotifications() {
  const { request, refreshCounts } = useCommunicationsApi()
  const { notify } = useDemo()
  const navigate = useNavigate()
  const [items, setItems] = useState<ActivityNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paging, setPaging] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [marking, setMarking] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [kind, setKind] = useState<
    ActivityNotification['kind'] | 'all' | 'events'
  >('all')
  const [reading, setReading] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const alive = useRef(true)
  const readIds = useRef(new Set<string>())
  const readBefore = useRef('')
  const newestLoaded = useRef<ActivityNotification | null>(null)
  const historyVersion = useRef(0)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  function preserveRead(rows: ActivityNotification[]) {
    return rows.map((item) =>
      !item.read_at &&
      (readIds.current.has(item.id) ||
        (readBefore.current &&
          notificationTimestamp(item.created_at) <=
            notificationTimestamp(readBefore.current)))
        ? { ...item, read_at: new Date().toISOString() }
        : item,
    )
  }

  useEffect(() => {
    let cancelled = false
    let busy = false
    const load = async (initial = false) => {
      if (busy || (!initial && document.visibilityState !== 'visible')) return
      busy = true
      try {
        const rows = await request<ActivityNotification[]>(
          `/notifications?limit=${PAGE_SIZE}`,
        )
        if (cancelled) return
        const previousNewest = newestLoaded.current
        const oldestIncoming = rows[rows.length - 1]
        const resetHistory =
          rows.length === PAGE_SIZE &&
          previousNewest !== null &&
          !rows.some((item) => item.id === previousNewest.id) &&
          (notificationTimestamp(oldestIncoming.created_at) >
            notificationTimestamp(previousNewest.created_at) ||
            (notificationTimestamp(oldestIncoming.created_at) ===
              notificationTimestamp(previousNewest.created_at) &&
              oldestIncoming.id > previousNewest.id))
        if (resetHistory) {
          // Keep the pagination cursor contiguous after a long absence.
          historyVersion.current += 1
          setItems(preserveRead(rows))
          setHasMore(true)
        } else {
          setItems((previous) =>
            mergeNotifications(previous, preserveRead(rows)),
          )
        }
        if (rows.length) newestLoaded.current = rows[0]
        if (initial) setHasMore(rows.length === PAGE_SIZE)
        setError('')
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Impossible de charger tes notifications.',
          )
      } finally {
        busy = false
        if (!cancelled) setLoading(false)
      }
    }
    void load(true)
    const timer = window.setInterval(() => {
      void load()
    }, 8000)
    const visible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', visible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [request, retry])

  async function loadMore() {
    const last = items[items.length - 1]
    if (!last || paging) return
    setPaging(true)
    const version = historyVersion.current
    try {
      const cursor = new URLSearchParams({
        limit: String(PAGE_SIZE),
        before: last.created_at,
        before_id: last.id,
      })
      const rows = await request<ActivityNotification[]>(
        `/notifications?${cursor}`,
      )
      if (!alive.current || historyVersion.current !== version) return
      setItems((previous) => mergeNotifications(previous, preserveRead(rows)))
      setHasMore(rows.length === PAGE_SIZE)
      setError('')
    } catch (reason) {
      if (alive.current && historyVersion.current === version)
        setError(
          reason instanceof Error
            ? reason.message
            : 'Impossible de charger la suite.',
        )
    } finally {
      if (alive.current) setPaging(false)
    }
  }

  async function markAll() {
    const before = items[0]?.created_at
    if (!before || marking) return
    setMarking(true)
    setActionError('')
    try {
      await request('/notifications/read-all', 'POST', { before })
      if (!alive.current) return
      readBefore.current = before
      setItems((previous) => preserveRead(previous))
      setError('')
      await refreshCounts().catch(() => {})
    } catch (reason) {
      if (alive.current)
        setActionError(
          reason instanceof Error
            ? reason.message
            : 'Impossible de marquer les notifications comme lues.',
        )
    } finally {
      if (alive.current) setMarking(false)
    }
  }

  async function markOne(item: ActivityNotification) {
    if (reading || marking || item.read_at) return
    setReading(item.id)
    setActionError('')
    try {
      await request(
        `/notifications/${encodeURIComponent(item.id)}/read`,
        'POST',
      )
      if (!alive.current) return
      readIds.current.add(item.id)
      setItems((previous) => preserveRead(previous))
      await refreshCounts().catch(() => {})
    } catch (cause) {
      if (alive.current)
        setActionError(
          cause instanceof Error
            ? cause.message
            : 'Impossible de marquer cette notification comme lue. Réessaie.',
        )
    } finally {
      if (alive.current) setReading(null)
    }
  }

  async function open(item: ActivityNotification) {
    if (opening) return
    setOpening(item.id)
    if (!item.read_at) {
      try {
        await request(
          `/notifications/${encodeURIComponent(item.id)}/read`,
          'POST',
        )
        if (!alive.current) return
        readIds.current.add(item.id)
        setItems((previous) => preserveRead(previous))
        await refreshCounts().catch(() => {})
      } catch {
        if (alive.current)
          notify(
            'Le statut de lecture n’a pas pu être enregistré. Réessaie depuis tes notifications.',
          )
      }
    }
    if (!alive.current) return
    setOpening(null)
    navigate(notificationDestination(item))
  }

  const visible = items.filter(
    (item) =>
      (!unreadOnly || !item.read_at) &&
      (kind === 'all' ||
        (kind === 'events'
          ? item.kind.startsWith('event_')
          : item.kind === kind)),
  )
  return (
    <AppLayout sidebarVariant="none">
      <div className="page-heading communication-heading">
        <div>
          <h1>Notifications</h1>
          <p>Les nouvelles de ton réseau.</p>
        </div>
        <button
          className="text-button"
          disabled={
            marking ||
            reading !== null ||
            opening !== null ||
            !items.some((item) => !item.read_at)
          }
          onClick={() => void markAll()}
        >
          {marking ? 'Enregistrement…' : 'Tout marquer comme lu'}
        </button>
      </div>
      <section className="surface live-notifications" aria-label="Ton activité">
        <div
          className="category-filters notification-kind-filters"
          role="group"
          aria-label="Type de notification"
        >
          {(
            [
              ['all', 'Toutes'],
              ['message', 'Messages'],
              ['follow', 'Abonnements'],
              ['comment', 'Commentaires'],
              ['reaction', 'Réactions'],
              ['events', 'Événements'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={kind === value ? 'active' : ''}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="notification-unread-filter">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => setUnreadOnly(event.target.checked)}
          />
          Non lues uniquement
        </label>
        {actionError && (
          <p className="field-error communication-status" role="alert">
            {actionError}
          </p>
        )}
        {loading && (
          <div
            role="status"
            aria-label="Chargement des notifications"
            className="communication-status communication-loading"
          >
            <span className="loading-spinner" aria-hidden="true" />
          </div>
        )}
        {error && (
          <div role="alert" className="communication-status field-error">
            {error}
            <button
              className="text-button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Réessayer
            </button>
          </div>
        )}
        {!loading && !error && !visible.length && (
          <EmptyState
            title={
              kind !== 'all'
                ? 'Aucune notification de ce type'
                : unreadOnly
                  ? 'Tu es à jour'
                  : 'Aucune notification pour le moment'
            }
            description={
              kind !== 'all'
                ? 'Change de filtre ou affiche les notifications précédentes pour parcourir ton activité.'
                : unreadOnly
                  ? 'Tes prochaines notifications apparaîtront ici.'
                  : 'Les messages, abonnements et réactions à tes publications apparaîtront ici.'
            }
          />
        )}
        {visible.map((item) => (
          <article
            key={item.id}
            className={`notification-row communication-notification ${!item.read_at ? 'unread' : ''}`}
          >
            <button
              className="communication-notification-open"
              onClick={() => void open(item)}
              disabled={opening !== null || reading !== null || marking}
              aria-busy={opening === item.id}
            >
              {item.actor ? (
                <Avatar
                  initials={initials(
                    item.actor.full_name || item.actor.username,
                  )}
                  imageUrl={item.actor.avatar_url ?? undefined}
                />
              ) : (
                <span
                  className="communication-activity-symbol"
                  aria-hidden="true"
                >
                  ✳
                </span>
              )}
              <span className="grow">
                <span>
                  <strong>
                    {item.actor?.full_name ||
                      item.actor?.username ||
                      'Un membre'}
                  </strong>{' '}
                  {activityText[item.kind]}
                  {item.event_title && (
                    <span className="notification-event-title">
                      {item.event_title}
                    </span>
                  )}
                </span>
                <small className="muted">
                  <time dateTime={item.created_at}>
                    {communicationTime(item.created_at, true)}
                  </time>
                  {!item.read_at ? ' · Non lue' : ''}
                </small>
              </span>
              {!item.read_at && (
                <span className="communication-unread-dot" aria-hidden="true" />
              )}
            </button>
            {!item.read_at && (
              <button
                className="text-button communication-mark-read"
                disabled={reading !== null || marking || opening !== null}
                aria-busy={reading === item.id}
                onClick={() => void markOne(item)}
              >
                {reading === item.id ? 'Enregistrement…' : 'Marquer comme lue'}
              </button>
            )}
          </article>
        ))}
        {hasMore && (
          <button
            className="text-button communication-more"
            disabled={paging}
            onClick={() => void loadMore()}
          >
            {paging ? 'Chargement…' : 'Voir les notifications précédentes'}
          </button>
        )}
      </section>
    </AppLayout>
  )
}
