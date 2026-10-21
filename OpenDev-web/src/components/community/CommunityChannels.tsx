import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CommunityChannel } from '../../types/channel'
import type { Post } from '../../types'
import { toPost, type PostRow } from '../../lib/adapters'
import { useDemo } from '../../state/store'
import { CreatePost } from '../feed/CreatePost'
import { PostCard } from '../feed/PostCard'
import { EmptyState } from '../common/EmptyState'
import { ChannelManager } from './ChannelManager'
import './community-channels.css'

export function CommunityChannels({
  communityId,
  communitySlug,
  joined,
  canEdit,
  canPublishRestricted,
  tab,
  query,
  onQueryChange,
  onJoin,
  tabs,
  members,
}: {
  communityId: string
  communitySlug: string
  joined: boolean
  canEdit: boolean
  canPublishRestricted: boolean
  tab: string
  query: string
  onQueryChange: (value: string) => void
  onJoin: () => void
  tabs: ReactNode
  members: ReactNode
}) {
  const { remote } = useDemo()
  const request = remote!.request
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('canal')
  const [channels, setChannels] = useState<CommunityChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [managing, setManaging] = useState(false)
  const current = channels.find((channel) =>
    selectedId ? channel.id === selectedId : channel.is_default,
  )
  const reload = useCallback(async () => {
    const rows = await request<CommunityChannel[]>(
      `/communities/${communityId}/channels?include_archived=true`,
    )
    setChannels(rows)
    setError('')
  }, [request, communityId])
  useEffect(() => {
    let active = true
    setLoading(true)
    void request<CommunityChannel[]>(
      `/communities/${communityId}/channels?include_archived=true`,
    )
      .then((rows) => {
        if (active) {
          setChannels(rows)
          setError('')
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Chargement des canaux impossible.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [request, communityId])
  const select = (id: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set('canal', id)
        return next
      },
      { replace: true },
    )
  return (
    <>
      <section
        className="community-channel-navigation"
        aria-label="Canaux de la communauté"
      >
        <div className="community-channel-toolbar">
          <h2>Canaux</h2>
          <div className="row">
            <label className="checkbox-label small">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Voir les archives
            </label>
            {canEdit && (
              <button
                className="button secondary compact"
                disabled={loading}
                onClick={() => {
                  setManaging(true)
                  void reload().catch(() =>
                    setError(
                      'Les canaux n’ont pas pu être actualisés. Réessaie.',
                    ),
                  )
                }}
              >
                Gérer les canaux
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <p className="muted" role="status">
            Chargement des canaux…
          </p>
        ) : error ? (
          <div role="alert">
            <p className="field-error">{error}</p>
            <button
              className="text-button"
              onClick={() =>
                void reload().catch((cause) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : 'Chargement impossible.',
                  ),
                )
              }
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            <nav
              className="community-channel-list"
              aria-label="Choisir un canal"
            >
              {channels
                .filter(
                  (channel) =>
                    !channel.archived_at ||
                    showArchived ||
                    channel.id === current?.id,
                )
                .map((channel) => (
                  <button
                    key={channel.id}
                    className={
                      'community-channel-button' +
                      (channel.id === current?.id ? ' active' : '')
                    }
                    aria-pressed={channel.id === current?.id}
                    onClick={() => select(channel.id)}
                  >
                    <span aria-hidden="true">#</span> {channel.name}
                    {channel.archived_at ? (
                      <span className="channel-badge">Archivé</span>
                    ) : (
                      channel.is_read_only && (
                        <span className="channel-badge">Lecture seule</span>
                      )
                    )}
                  </button>
                ))}
            </nav>
            {current ? (
              <div className="community-channel-heading">
                <h3># {current.name}</h3>
                {!!current.description && (
                  <p className="muted">{current.description}</p>
                )}
                {current.archived_at ? (
                  <p className="muted small">
                    Canal archivé : les échanges restent consultables. Restaure
                    le canal pour publier à nouveau.
                  </p>
                ) : (
                  current.is_read_only && (
                    <p className="muted small">
                      Canal en lecture seule. L’équipe autorisée peut y publier.
                    </p>
                  )
                )}
              </div>
            ) : (
              <p className="muted" role="status">
                Ce canal est introuvable. Choisis un canal disponible.
              </p>
            )}
          </>
        )}
      </section>
      {tabs}
      {tab === 'membres' ? (
        members
      ) : current && !loading && !error ? (
        <CommunityChannelFeed
          key={[
            current.id,
            current.name,
            current.is_read_only,
            current.archived_at,
            tab,
          ].join(':')}
          channel={current}
          communityId={communityId}
          communitySlug={communitySlug}
          joined={joined}
          canPublishRestricted={canPublishRestricted}
          tab={tab}
          query={query}
          onQueryChange={onQueryChange}
          onJoin={onJoin}
        />
      ) : null}
      {managing && (
        <ChannelManager
          communityId={communityId}
          channels={channels}
          onClose={() => setManaging(false)}
          onChanged={async (deletedId) => {
            if (deletedId && deletedId === current?.id)
              setParams(
                (previous) => {
                  const next = new URLSearchParams(previous)
                  next.delete('canal')
                  return next
                },
                { replace: true },
              )
            await reload()
          }}
        />
      )}
    </>
  )
}

function CommunityChannelFeed({
  channel,
  communityId,
  communitySlug,
  joined,
  canPublishRestricted,
  tab,
  query,
  onQueryChange,
  onJoin,
}: {
  channel: CommunityChannel
  communityId: string
  communitySlug: string
  joined: boolean
  canPublishRestricted: boolean
  tab: string
  query: string
  onQueryChange: (value: string) => void
  onJoin: () => void
}) {
  const { remote, allPosts } = useDemo()
  const request = remote!.request
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState(query.slice(0, 80))
  const [error, setError] = useState('')
  const [reloadError, setReloadError] = useState(false)
  const busy = useRef(false)
  const revision = useRef({ active: true })
  const loaded = useRef({ endpoint: '', count: 0 })
  const postType = (
    {
      discussions: 'discussion',
      questions: 'question',
      projets: 'showcase',
      ressources: 'resource',
    } as Record<string, string>
  )[tab]
  const endpoint = `/posts?community_id=${encodeURIComponent(communityId)}&channel_id=${encodeURIComponent(channel.id)}${postType ? '&post_type=' + postType : ''}${debouncedQuery.trim() ? '&q=' + encodeURIComponent(debouncedQuery.trim()) : ''}`
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(query.slice(0, 80)),
      300,
    )
    return () => window.clearTimeout(timer)
  }, [query])
  useEffect(() => {
    let active = true
    const currentRequest = { active: true }
    revision.current = currentRequest
    busy.current = false
    setLoadingMore(false)
    const sameFilter = loaded.current.endpoint === endpoint
    setLoading(!sameFilter)
    setRefreshing(sameFilter)
    const targetCount = sameFilter ? Math.max(20, loaded.current.count) : 20
    if (!sameFilter) {
      setPosts([])
      setNextOffset(0)
      setHasMore(false)
    }
    setError('')
    setReloadError(false)
    async function reloadPosts() {
      const rows: PostRow[] = []
      let more = true
      while (active && more && rows.length < targetCount) {
        const limit = Math.min(100, targetCount - rows.length)
        const page = await request<PostRow[]>(
          `${endpoint}&limit=${limit}&offset=${rows.length}`,
        )
        rows.push(...page)
        more = page.length === limit
      }
      return { rows, more }
    }
    void reloadPosts()
      .then(({ rows, more }) => {
        if (active) {
          setPosts(rows.map(toPost))
          setNextOffset(rows.length)
          setHasMore(more)
          loaded.current = { endpoint, count: rows.length }
        }
      })
      .catch((cause) => {
        if (active) {
          setReloadError(true)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Chargement des publications impossible.',
          )
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      })
    return () => {
      active = false
      currentRequest.active = false
    }
  }, [request, endpoint, allPosts, retry])
  async function loadMore() {
    if (busy.current || loading || refreshing || !hasMore) return
    busy.current = true
    setLoadingMore(true)
    setError('')
    setReloadError(false)
    const expected = revision.current
    try {
      const rows = await request<PostRow[]>(
        endpoint + '&limit=20&offset=' + nextOffset,
      )
      if (!expected.active || expected !== revision.current) return
      setPosts((previous) => [
        ...previous,
        ...rows
          .map(toPost)
          .filter((post) => !previous.some((item) => item.id === post.id)),
      ])
      setNextOffset((previous) => previous + rows.length)
      loaded.current = { endpoint, count: nextOffset + rows.length }
      setHasMore(rows.length === 20)
    } catch (cause) {
      if (expected.active && expected === revision.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'La suite du fil n’a pas pu être chargée.',
        )
    } finally {
      if (expected.active && expected === revision.current) {
        busy.current = false
        setLoadingMore(false)
      }
    }
  }
  const canPublish =
    !channel.archived_at && (!channel.is_read_only || canPublishRestricted)
  return (
    <>
      <div className="community-composer">
        {joined && canPublish ? (
          <CreatePost
            key={channel.id}
            communitySlug={communitySlug}
            channelId={channel.id}
          />
        ) : !joined && !channel.archived_at ? (
          <div className="join-prompt">
            <p>Rejoins la communauté pour participer aux échanges.</p>
            <button className="button compact" onClick={onJoin}>
              Rejoindre la communauté
            </button>
          </div>
        ) : null}
      </div>
      <input
        className="standalone-search"
        aria-label={'Rechercher dans le canal ' + channel.name}
        maxLength={80}
        value={query.slice(0, 80)}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={'Rechercher dans #' + channel.name + '…'}
      />
      {query && (
        <p className="muted small">
          Recherche dans toutes les publications de ce canal.
        </p>
      )}
      <div
        className="post-list"
        aria-busy={loading || loadingMore || refreshing}
      >
        {refreshing && (
          <p className="muted small" role="status">
            Actualisation des publications…
          </p>
        )}
        {loading ? (
          <p className="muted" role="status">
            Chargement des publications…
          </p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              commentsReadOnly={
                !!channel.archived_at ||
                (channel.is_read_only && !canPublishRestricted)
              }
              variant={tab === 'general' ? 'overview' : undefined}
            />
          ))
        )}
        {!loading && !error && !posts.length && (
          <EmptyState
            title={
              query
                ? 'Aucun résultat dans ce canal'
                : 'Aucune publication dans ce canal'
            }
            description={
              channel.archived_at ||
              (channel.is_read_only && !canPublishRestricted)
                ? 'Les échanges de ce canal apparaîtront ici.'
                : 'Partage une découverte ou lance la conversation.'
            }
          />
        )}
        {error && (
          <div role="alert" className="surface">
            <p className="field-error">{error}</p>
            <button
              className="button secondary mt-3"
              onClick={() =>
                !reloadError && hasMore && posts.length
                  ? void loadMore()
                  : setRetry((value) => value + 1)
              }
            >
              Réessayer
            </button>
          </div>
        )}
        {!loading && hasMore && (
          <button
            className="button secondary"
            disabled={loadingMore || refreshing}
            onClick={() => void loadMore()}
          >
            {loadingMore ? 'Chargement…' : 'Charger plus de publications'}
          </button>
        )}
      </div>
    </>
  )
}
