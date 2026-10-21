import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Avatar } from '../components/common/Avatar'
import { EmptyState } from '../components/common/EmptyState'
import { Modal } from '../components/common/Modal'
import { SendIcon } from '../components/common/Icons'
import { useDemo } from '../state/store'
import { matches, profilePath } from '../state/catalog'
import { initials } from '../lib/adapters'
import {
  communicationTime,
  mergeMessages,
  useCommunicationsApi,
} from '../lib/communications'
import type {
  CommunicationProfile,
  InboxConversation,
  PrivateMessage,
} from '../types/communications'
import './communications.css'

const PAGE_SIZE = 50
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'La connexion a échoué. Réessaie.'

export function LiveMessagesPage() {
  const { state } = useDemo()
  const { request, refreshCounts } = useCommunicationsApi()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('conversation')
  const recipient = params.get('to')
  const [inbox, setInbox] = useState<InboxConversation[]>([])
  const [inboxLoading, setInboxLoading] = useState(true)
  const [inboxError, setInboxError] = useState('')
  const [moreInbox, setMoreInbox] = useState(false)
  const [inboxPaging, setInboxPaging] = useState(false)
  const [conversation, setConversation] = useState<InboxConversation | null>(
    null,
  )
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [threadError, setThreadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [older, setOlder] = useState(false)
  const [paging, setPaging] = useState(false)
  const [sending, setSending] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [retry, setRetry] = useState(0)
  const [startingError, setStartingError] = useState('')
  const scroll = useRef<HTMLDivElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const autoScroll = useRef(true)
  const lastRead = useRef<Record<string, number>>({})
  const pending = useRef<
    Record<
      string,
      {
        body: string
        id: string
      }
    >
  >({})
  const activeConversation = useRef(selectedId)
  const alive = useRef(true)
  useEffect(() => {
    activeConversation.current = selectedId
  }, [selectedId])
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const updateInbox = useCallback((items: InboxConversation[]) => {
    setInbox((previous) => {
      const byId = new Map(previous.map((item) => [item.id, item]))
      items.forEach((item) => byId.set(item.id, item))
      return [...byId.values()].sort(
        (a, b) =>
          (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '') ||
          a.id.localeCompare(b.id),
      )
    })
  }, [])

  useEffect(() => {
    if (!recipient) return
    let cancelled = false
    setStartingError('')
    request<InboxConversation>('/conversations', 'POST', {
      recipient_id: recipient,
    })
      .then((item) => {
        if (cancelled) return
        updateInbox([item])
        setParams({ conversation: item.id }, { replace: true })
      })
      .catch((error) => {
        if (!cancelled) setStartingError(errorText(error))
      })
    return () => {
      cancelled = true
    }
  }, [recipient, retry, request, setParams, updateInbox])

  useEffect(() => {
    let cancelled = false
    let busy = false
    const load = async (initial = false) => {
      if (busy || (!initial && document.visibilityState !== 'visible')) return
      busy = true
      try {
        const rows = await request<InboxConversation[]>(
          `/conversations?limit=${PAGE_SIZE}&offset=0`,
        )
        if (cancelled) return
        updateInbox(rows)
        if (initial) setMoreInbox(rows.length === PAGE_SIZE)
        setInboxError('')
      } catch (error) {
        if (!cancelled) setInboxError(errorText(error))
      } finally {
        busy = false
        if (!cancelled) setInboxLoading(false)
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
  }, [request, retry, updateInbox])

  useEffect(() => {
    setConversation(null)
    setMessages([])
    setThreadError('')
    setSendError('')
    setOlder(false)
    if (!selectedId) {
      setLoading(false)
      return
    }
    let cancelled = false
    let busy = false
    setLoading(true)
    autoScroll.current = true
    let seenSequence = 0
    const load = async (initial = false) => {
      if (busy || (!initial && document.visibilityState !== 'visible')) return
      busy = true
      try {
        const [item, latest] = await Promise.all([
          request<InboxConversation>(
            `/conversations/${encodeURIComponent(selectedId)}`,
          ),
          request<PrivateMessage[]>(
            `/conversations/${encodeURIComponent(selectedId)}/messages?limit=${PAGE_SIZE}`,
          ),
        ])
        if (cancelled) return
        let rows = latest
        // Catch up after a hidden tab without leaving an invisible gap in the thread.
        for (
          let page = 0;
          page < 3 &&
          seenSequence > 0 &&
          rows.length &&
          rows[0].sequence > seenSequence &&
          latest.length === PAGE_SIZE;
          page++
        ) {
          const earlier = await request<PrivateMessage[]>(
            `/conversations/${encodeURIComponent(selectedId)}/messages?limit=${PAGE_SIZE}&before=${rows[0].sequence}`,
          )
          if (cancelled) return
          if (!earlier.length) break
          rows = mergeMessages(earlier, rows)
        }
        const resetHistory =
          seenSequence > 0 &&
          latest.length === PAGE_SIZE &&
          rows[0]?.sequence > seenSequence
        const container = scroll.current
        autoScroll.current =
          initial ||
          !container ||
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
            100
        setConversation(item)
        setMessages((previous) =>
          resetHistory ? latest : mergeMessages(previous, rows),
        )
        if (initial) setOlder(rows.length === PAGE_SIZE)
        if (resetHistory) setOlder(true)
        if (latest.length) seenSequence = latest[latest.length - 1].sequence
        setThreadError('')
        if (document.visibilityState === 'visible' && rows.length) {
          const sequence = rows[rows.length - 1].sequence
          if ((lastRead.current[selectedId] ?? 0) < sequence) {
            await request(
              `/conversations/${encodeURIComponent(selectedId)}/read`,
              'POST',
              { sequence },
            )
            if (cancelled) return
            lastRead.current[selectedId] = sequence
            updateInbox([{ ...item, unread_count: 0 }])
            await refreshCounts().catch(() => {})
          }
        }
      } catch (error) {
        if (!cancelled) setThreadError(errorText(error))
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
  }, [selectedId, retry, request, refreshCounts, updateInbox])

  useEffect(() => {
    if (autoScroll.current) end.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  async function loadInboxPage() {
    setInboxPaging(true)
    try {
      const rows = await request<InboxConversation[]>(
        `/conversations?limit=${PAGE_SIZE}&offset=${inbox.length}`,
      )
      if (!alive.current) return
      updateInbox(rows)
      setMoreInbox(rows.length === PAGE_SIZE)
      setInboxError('')
    } catch (error) {
      if (alive.current) setInboxError(errorText(error))
    } finally {
      if (alive.current) setInboxPaging(false)
    }
  }

  async function loadOlder() {
    if (!selectedId || !messages.length || paging) return
    const id = selectedId
    setPaging(true)
    const height = scroll.current?.scrollHeight ?? 0
    const position = scroll.current?.scrollTop ?? 0
    try {
      const rows = await request<PrivateMessage[]>(
        `/conversations/${encodeURIComponent(id)}/messages?limit=${PAGE_SIZE}&before=${messages[0].sequence}`,
      )
      if (!alive.current || activeConversation.current !== id) return
      autoScroll.current = false
      setMessages((previous) => mergeMessages(rows, previous))
      setOlder(rows.length === PAGE_SIZE)
      window.requestAnimationFrame(() => {
        if (scroll.current && activeConversation.current === id)
          scroll.current.scrollTop =
            position + scroll.current.scrollHeight - height
      })
    } catch (error) {
      if (alive.current && activeConversation.current === id)
        setThreadError(errorText(error))
    } finally {
      if (alive.current) setPaging(false)
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || sending) return
    const id = selectedId
    const body = (drafts[id] ?? '').trim()
    if (!body) return
    if (!pending.current[id] || pending.current[id].body !== body)
      pending.current[id] = { body, id: crypto.randomUUID() }
    const clientId = pending.current[id].id
    setSending(true)
    setSendError('')
    try {
      const message = await request<PrivateMessage>(
        `/conversations/${encodeURIComponent(id)}/messages`,
        'POST',
        { body, client_id: clientId },
      )
      if (!alive.current) return
      delete pending.current[id]
      setDrafts((previous) =>
        previous[id]?.trim() === body ? { ...previous, [id]: '' } : previous,
      )
      if (activeConversation.current === id) {
        autoScroll.current = true
        setMessages((previous) => mergeMessages(previous, [message]))
      }
      await request<InboxConversation>(
        `/conversations/${encodeURIComponent(id)}`,
      )
        .then((item) => {
          if (alive.current) updateInbox([item])
        })
        .catch(() => {})
      await refreshCounts().catch(() => {})
    } catch (error) {
      if (alive.current && activeConversation.current === id)
        setSendError(errorText(error))
    } finally {
      if (alive.current) setSending(false)
    }
  }

  const filtered = inbox.filter(
    (item) =>
      (!unreadOnly || item.unread_count > 0) &&
      matches(
        `${item.participant.full_name} ${item.participant.username} ${item.last_message ?? ''}`,
        query,
      ),
  )
  const text = selectedId ? (drafts[selectedId] ?? '') : ''
  return (
    <AppLayout sidebarVariant="none">
      <div className="messages-heading communication-heading">
        <h1>Messages</h1>
        <button className="button compact" onClick={() => setNewOpen(true)}>
          Nouveau message
        </button>
      </div>
      {recipient && (
        <p
          role={startingError ? 'alert' : 'status'}
          className={startingError ? 'field-error' : 'muted'}
        >
          {startingError || 'Ouverture de la conversation…'}
          {startingError && (
            <button
              className="text-button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Réessayer
            </button>
          )}
        </p>
      )}
      <div
        className={`messenger live-messenger ${selectedId ? 'has-selection' : ''}`}
      >
        <section className="conversation-list" aria-label="Conversations">
          <div className="conversation-tools">
            <input
              type="search"
              aria-label="Rechercher une conversation"
              placeholder="Rechercher une conversation…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="category-filters">
              <button
                className={!unreadOnly ? 'active' : ''}
                aria-pressed={!unreadOnly}
                onClick={() => setUnreadOnly(false)}
              >
                Toutes
              </button>
              <button
                className={unreadOnly ? 'active' : ''}
                aria-pressed={unreadOnly}
                onClick={() => setUnreadOnly(true)}
              >
                Non lues
              </button>
            </div>
          </div>
          <div className="conversation-items">
            {inboxLoading && (
              <div
                role="status"
                aria-label="Chargement des conversations"
                className="communication-status communication-loading"
              >
                <span className="loading-spinner" aria-hidden="true" />
              </div>
            )}
            {inboxError && (
              <div role="alert" className="communication-status field-error">
                {inboxError}
                <button
                  className="text-button"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Réessayer
                </button>
              </div>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                className={`conversation-item ${selectedId === item.id ? 'active' : ''}`}
                aria-pressed={selectedId === item.id}
                onClick={() => setParams({ conversation: item.id })}
              >
                <Avatar
                  initials={initials(
                    item.participant.full_name || item.participant.username,
                  )}
                  imageUrl={item.participant.avatar_url ?? undefined}
                />
                <span className="grow">
                  <span className="conversation-name">
                    <strong>
                      {item.participant.full_name || item.participant.username}
                    </strong>
                    <small>{communicationTime(item.last_message_at)}</small>
                  </span>
                  <span className="last-message">
                    {item.last_message || 'Commence la conversation'}
                  </span>
                </span>
                {item.unread_count > 0 && (
                  <span
                    className="unread-count"
                    aria-label={`${item.unread_count} messages non lus`}
                  >
                    {item.unread_count}
                  </span>
                )}
              </button>
            ))}
            {!inboxLoading && !inboxError && !filtered.length && (
              <EmptyState
                title="Aucune conversation"
                description={
                  query || unreadOnly
                    ? 'Essaie un autre filtre.'
                    : 'Échange avec un membre depuis son profil ou crée un nouveau message.'
                }
              />
            )}
            {moreInbox && (
              <button
                className="text-button communication-more"
                disabled={inboxPaging}
                onClick={() => void loadInboxPage()}
              >
                {inboxPaging ? 'Chargement…' : 'Voir plus de conversations'}
              </button>
            )}
          </div>
        </section>
        <section className="chat-panel" aria-label="Conversation active">
          {selectedId && (
            <button
              className="text-button communication-mobile-back"
              onClick={() => setParams({})}
            >
              ← Conversations
            </button>
          )}
          {loading && (
            <div
              role="status"
              aria-label="Chargement des messages"
              className="communication-status communication-loading"
            >
              <span className="loading-spinner" aria-hidden="true" />
            </div>
          )}
          {threadError && (
            <div className="communication-status field-error" role="alert">
              {threadError}
              <button
                className="text-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Réessayer
              </button>
            </div>
          )}
          {!selectedId && (
            <EmptyState
              title="Tes échanges, ici"
              description="Sélectionne une conversation ou crée un nouveau message."
            />
          )}
          {conversation && (
            <>
              <header className="chat-header">
                <Avatar
                  initials={initials(
                    conversation.participant.full_name ||
                      conversation.participant.username,
                  )}
                  imageUrl={conversation.participant.avatar_url ?? undefined}
                />
                <Link
                  className="grow"
                  to={profilePath('@' + conversation.participant.username)}
                >
                  <strong>
                    {conversation.participant.full_name ||
                      conversation.participant.username}
                  </strong>
                  <p className="muted small">
                    @{conversation.participant.username}
                  </p>
                </Link>
              </header>
              <div
                className="chat-messages"
                ref={scroll}
                aria-label="Historique des messages"
                aria-busy={loading}
              >
                {older && (
                  <button
                    className="text-button communication-more"
                    disabled={paging}
                    onClick={() => void loadOlder()}
                  >
                    {paging ? 'Chargement…' : 'Messages précédents'}
                  </button>
                )}
                {!messages.length && !loading && (
                  <EmptyState
                    title="Dis bonjour !"
                    description="Présente ton idée ou ce qui t’amène ici."
                  />
                )}
                {messages.map((message) => {
                  const outgoing = message.sender_id === state.profile.id
                  return (
                    <div
                      key={message.id}
                      className={`message ${outgoing ? 'outgoing' : ''}`}
                    >
                      <div>
                        <div className="message-bubble">
                          <p>{message.body}</p>
                        </div>
                        <p className="message-time">
                          <time dateTime={message.created_at}>
                            {communicationTime(message.created_at, true)}
                          </time>
                          {outgoing
                            ? message.sequence <=
                              conversation.peer_read_sequence
                              ? ' · Lu'
                              : ' · Envoyé'
                            : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={end} />
              </div>
              <form
                className="chat-compose"
                onSubmit={(event) => void send(event)}
              >
                <textarea
                  name="message"
                  aria-label="Ton message"
                  placeholder="Écris ton message…"
                  rows={2}
                  maxLength={5000}
                  value={text}
                  onChange={(event) => {
                    setDrafts((previous) => ({
                      ...previous,
                      [conversation.id]: event.target.value,
                    }))
                    setSendError('')
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      (event.ctrlKey || event.metaKey)
                    ) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                />
                <div className="row justify-between">
                  <small className="muted">{text.length}/5000</small>
                  <button
                    className="button compact"
                    type="submit"
                    disabled={sending || !text.trim()}
                  >
                    <SendIcon />
                    {sending ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
                {sendError && (
                  <p className="field-error" role="alert">
                    {sendError} Tu peux réessayer l’envoi.
                  </p>
                )}
              </form>
            </>
          )}
        </section>
      </div>
      {newOpen && (
        <NewConversation
          selfId={state.profile.id}
          onClose={() => setNewOpen(false)}
          onSelect={(id) => {
            setNewOpen(false)
            setParams({ to: id })
          }}
        />
      )}
    </AppLayout>
  )
}

function NewConversation({
  selfId,
  onClose,
  onSelect,
}: {
  selfId: string
  onClose: () => void
  onSelect: (id: string) => void
}) {
  const { request } = useCommunicationsApi()
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<CommunicationProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    setPeople([])
    setError('')
    if (!query.trim()) {
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = window.setTimeout(() => {
      request<CommunicationProfile[]>(
        `/discover/people?q=${encodeURIComponent(query.trim())}&limit=20`,
      )
        .then((rows) => {
          if (!cancelled)
            setPeople(rows.filter((person) => person.id !== selfId))
        })
        .catch((reason) => {
          if (!cancelled) setError(errorText(reason))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, retry, request, selfId])
  return (
    <Modal title="Nouveau message" onClose={onClose}>
      <label className="field">
        À qui souhaites-tu écrire ?
        <input
          type="search"
          placeholder="Un nom ou un nom d’utilisateur…"
          maxLength={80}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="communication-people">
        {loading && <p role="status">Recherche…</p>}
        {error && (
          <p role="alert" className="field-error">
            {error}
            <button
              className="text-button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Réessayer
            </button>
          </p>
        )}
        {!loading && !error && query.trim() && !people.length && (
          <p className="muted">Aucun membre trouvé.</p>
        )}
        {people.map((person) => (
          <button
            className="communication-person"
            key={person.id}
            onClick={() => onSelect(person.id)}
          >
            <Avatar
              initials={initials(person.full_name || person.username)}
              imageUrl={person.avatar_url ?? undefined}
            />
            <span>
              <strong>{person.full_name || person.username}</strong>
              <small className="muted">@{person.username}</small>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
