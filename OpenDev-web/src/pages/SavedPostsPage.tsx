import { useEffect, useRef, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { EmptyState } from '../components/common/EmptyState'
import { PostCard } from '../components/feed/PostCard'
import { toPost, type PostRow } from '../lib/adapters'
import { notificationTimestamp } from '../lib/communications'
import { useDemo } from '../state/store'
import './saved-posts.css'

interface SavedPostRow {
  post_id: string
  saved_at: string
  post: PostRow
}

const PAGE_SIZE = 20

export function SavedPostsPage() {
  const { state } = useDemo()
  return <SavedPosts key={state.profile.id} />
}

function SavedPosts() {
  const { state, remote, savedRevision } = useDemo()
  const request = remote?.request
  const rememberSavedPosts = remote?.rememberSavedPosts
  const [rows, setRows] = useState<SavedPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [paging, setPaging] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const generation = useRef(0)
  const pagingBusy = useRef(false)
  const alive = useRef(true)
  const loaded = useRef(false)
  const newestLoaded = useRef<SavedPostRow | null>(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!request) return
    let cancelled = false
    generation.current += 1
    setLoading(true)
    setError('')
    request<SavedPostRow[]>(`/me/saved-posts?limit=${PAGE_SIZE}`)
      .then((result) => {
        if (cancelled) return
        rememberSavedPosts?.(
          result.map((row) => row.post_id),
          savedRevision ?? 0,
        )
        const oldest = result[result.length - 1]
        const previousNewest = newestLoaded.current
        const reset =
          result.length === PAGE_SIZE &&
          previousNewest !== null &&
          (notificationTimestamp(oldest.saved_at) >
            notificationTimestamp(previousNewest.saved_at) ||
            (notificationTimestamp(oldest.saved_at) ===
              notificationTimestamp(previousNewest.saved_at) &&
              oldest.post_id > previousNewest.post_id))
        setRows((previous) => {
          if (reset) return result
          const byId = new Map(previous.map((row) => [row.post_id, row]))
          result.forEach((row) => byId.set(row.post_id, row))
          return [...byId.values()].sort(
            (a, b) =>
              notificationTimestamp(b.saved_at).localeCompare(
                notificationTimestamp(a.saved_at),
              ) || b.post_id.localeCompare(a.post_id),
          )
        })
        if (!loaded.current || reset) setHasMore(result.length === PAGE_SIZE)
        loaded.current = true
        if (result.length) newestLoaded.current = result[0]
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Impossible de charger tes enregistrements.',
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [request, rememberSavedPosts, savedRevision, retry])

  async function loadMore() {
    const last = rows[rows.length - 1]
    if (!request || !last || loading || pagingBusy.current) return
    pagingBusy.current = true
    setPaging(true)
    const revision = generation.current
    try {
      const cursor = new URLSearchParams({
        limit: String(PAGE_SIZE),
        before: last.saved_at,
        before_id: last.post_id,
      })
      const result = await request<SavedPostRow[]>(`/me/saved-posts?${cursor}`)
      if (!alive.current || generation.current !== revision) return
      rememberSavedPosts?.(
        result.map((row) => row.post_id),
        savedRevision ?? 0,
      )
      setRows((previous) => {
        const ids = new Set(previous.map((row) => row.post_id))
        return [...previous, ...result.filter((row) => !ids.has(row.post_id))]
      })
      setHasMore(result.length === PAGE_SIZE)
      setError('')
    } catch (cause) {
      if (alive.current && generation.current === revision)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Impossible de charger la suite.',
        )
    } finally {
      pagingBusy.current = false
      if (alive.current) setPaging(false)
    }
  }

  const visible = rows.filter((row) => state.saved.includes(row.post_id))
  return (
    <AppLayout sidebarVariant="none">
      <div className="page-heading">
        <h1>Publications enregistrées</h1>
        <p>Retrouve les idées et les ressources que tu souhaites garder.</p>
      </div>
      <div className="saved-posts" aria-busy={loading}>
        {loading && !visible.length && (
          <div
            className="saved-posts-loading"
            role="status"
            aria-label="Chargement des enregistrements"
          >
            <span className="loading-spinner" aria-hidden="true" />
          </div>
        )}
        {error && (
          <div className="surface saved-posts-error" role="alert">
            <p>{error}</p>
            <button
              className="button secondary compact"
              onClick={() => setRetry((value) => value + 1)}
            >
              Réessayer
            </button>
          </div>
        )}
        {!loading && !error && !visible.length && (
          <EmptyState
            title={
              hasMore
                ? 'Continue à parcourir tes enregistrements'
                : 'Aucune publication enregistrée'
            }
            description={
              hasMore
                ? 'D’autres publications sont disponibles dans les pages suivantes.'
                : 'Utilise le marque-page d’une publication pour la retrouver ici.'
            }
            to={hasMore ? undefined : '/'}
            label={hasMore ? undefined : 'Parcourir le fil'}
          />
        )}
        <div className="post-list">
          {visible.map((row) => (
            <PostCard key={row.post_id} post={toPost(row.post)} />
          ))}
        </div>
        {hasMore && (
          <button
            className="button secondary saved-posts-more"
            disabled={paging || loading}
            onClick={() => void loadMore()}
          >
            {paging ? 'Chargement…' : 'Voir plus d’enregistrements'}
          </button>
        )}
      </div>
    </AppLayout>
  )
}
