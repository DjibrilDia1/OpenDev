import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Avatar } from '../components/common/Avatar'
import { EmptyState } from '../components/common/EmptyState'
import { Modal } from '../components/common/Modal'
import {
  SendIcon,
  CodeIcon,
  SmileIcon,
  PaperclipIcon,
} from '../components/common/Icons'
import { useDemo } from '../state/store'
import { matches, profilePath } from '../state/catalog'
import type { DirectMessage } from '../types'
export function MessagesPage() {
  const { state, update, openAuth, notify } = useDemo()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [file, setFile] = useState<{
    conversationId: string
    name: string
    size: string
  } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const selectedId = params.get('conversation')
  const conversation =
    state.conversations.find((item) => item.id === selectedId) ??
    (!selectedId ? state.conversations[0] : undefined)
  const conversationId = conversation?.id
  const text = conversationId ? (drafts[conversationId] ?? '') : ''
  const attachment = file?.conversationId === conversationId ? file : null
  const messageCount = conversation?.messages.length
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [conversationId, messageCount])
  useEffect(() => {
    if (
      state.signedIn &&
      selectedId &&
      state.conversations.some(
        (item) => item.id === selectedId && item.unreadCount,
      )
    )
      update((previous) => ({
        ...previous,
        conversations: previous.conversations.map((item) =>
          item.id === selectedId ? { ...item, unreadCount: 0 } : item,
        ),
      }))
  }, [selectedId, state.signedIn, state.conversations, update])
  if (!state.signedIn)
    return (
      <AppLayout sidebarVariant="none">
        <EmptyState
          title="Des conversations qui font avancer"
          description="Connecte-toi pour échanger avec les membres de la communauté."
        />
        <div className="centered">
          <button className="button" onClick={openAuth}>
            Se connecter
          </button>
        </div>
      </AppLayout>
    )
  const conversations = state.conversations.filter(
    (item) =>
      (!unreadOnly || !!item.unreadCount) &&
      matches(item.participant.name + ' ' + item.lastMessage, query),
  )
  function setText(value: string) {
    if (conversationId)
      setDrafts((previous) => ({ ...previous, [conversationId]: value }))
  }
  function send(event: FormEvent) {
    event.preventDefault()
    if (!conversation) return
    if (!text.trim() && !attachment) {
      setError('Écris un message ou ajoute une pièce jointe.')
      return
    }
    const time = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())
    const message: DirectMessage = {
      id: crypto.randomUUID(),
      senderId: state.profile.id,
      senderName: state.profile.name,
      senderInitials: state.profile.avatarInitials,
      text: text.trim(),
      time,
      isOutgoing: true,
      isRead: false,
      attachment: attachment
        ? { name: attachment.name, size: attachment.size, type: 'demo' }
        : undefined,
    }
    update((previous) => ({
      ...previous,
      conversations: previous.conversations.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              unreadCount: 0,
              lastMessage: text.trim() || attachment?.name || '',
              time,
              messages: [...item.messages, message],
            }
          : item,
      ),
    }))
    setText('')
    setFile(null)
    setError('')
    notify('Message ajouté à la conversation de démonstration.')
  }
  return (
    <AppLayout sidebarVariant="none">
      <div className="messages-heading">
        <h1>Messages</h1>
      </div>
      <div className={'messenger ' + (selectedId ? 'has-selection' : '')}>
        <section className="conversation-list" aria-label="Conversations">
          <div className="conversation-tools">
            <input
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
                Non lues ·{' '}
                {state.conversations.filter((item) => item.unreadCount).length}
              </button>
            </div>
          </div>
          <div className="conversation-items">
            {conversations.map((item) => (
              <button
                key={item.id}
                className={
                  'conversation-item ' +
                  (conversation?.id === item.id ? 'active' : '')
                }
                aria-pressed={conversation?.id === item.id}
                onClick={() => {
                  setParams({ conversation: item.id })
                  setError('')
                }}
              >
                <Avatar initials={item.participant.initials} />
                <span className="grow">
                  <span className="conversation-name">
                    <strong>{item.participant.name}</strong>
                    <small>{item.time}</small>
                  </span>
                  <span className="last-message">
                    {item.lastMessage || 'Commence la conversation'}
                  </span>
                </span>
                {!!item.unreadCount && (
                  <span className="unread-count">{item.unreadCount}</span>
                )}
              </button>
            ))}
            {!conversations.length && (
              <EmptyState
                title="Aucune conversation"
                description="Essaie un autre filtre ou contacte un développeur depuis son profil."
                to="/developpeurs"
                label="Voir les développeurs"
              />
            )}
          </div>
        </section>
        <section className="chat-panel" aria-label="Conversation active">
          {conversation ? (
            <>
              <header className="chat-header">
                <button
                  className="icon-button chat-back"
                  aria-label="Retour aux conversations"
                  onClick={() => setParams({})}
                >
                  ←
                </button>
                <Avatar initials={conversation.participant.initials} />
                <Link
                  className="grow"
                  to={profilePath(conversation.participant.handle)}
                >
                  <strong>{conversation.participant.name}</strong>
                  <p className="muted small">{conversation.participant.tag}</p>
                </Link>
              </header>
              <p className="chat-demo">
                Conversation de démonstration · Aucun message n’est envoyé à une
                personne réelle.
              </p>
              <div className="chat-messages">
                <p className="chat-date">Vos échanges</p>
                {!conversation.messages.length && (
                  <EmptyState
                    title="Dis bonjour !"
                    description="Présente ton idée ou partage ce qui t’amène ici."
                  />
                )}
                {conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      'message ' + (message.isOutgoing ? 'outgoing' : '')
                    }
                  >
                    {!message.isOutgoing && (
                      <Avatar initials={message.senderInitials} size="sm" />
                    )}
                    <div>
                      <div className="message-bubble">
                        {message.text && <p>{message.text}</p>}
                        {message.attachment && (
                          <button
                            className="chat-attachment"
                            onClick={() => setPreview(message.attachment!.name)}
                          >
                            <PaperclipIcon />
                            {message.attachment.name}
                            <small>{message.attachment.size}</small>
                          </button>
                        )}
                      </div>
                      <p className="message-time">
                        {message.time}
                        {message.isOutgoing ? ' · Démo locale' : ''}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={end} />
              </div>
              <form className="chat-compose" onSubmit={send}>
                {attachment && (
                  <div className="attachment-preview">
                    <span>{attachment.name}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Retirer la pièce jointe"
                      onClick={() => setFile(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <textarea
                  name="message"
                  aria-label="Ton message"
                  placeholder="Écris ton message…"
                  rows={2}
                  maxLength={3000}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value)
                    setError('')
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
                  <div className="row">
                    <input
                      type="file"
                      ref={picker}
                      className="sr-only"
                      tabIndex={-1}
                      aria-label="Pièce jointe de démonstration"
                      onChange={(event) => {
                        const picked = event.target.files?.[0]
                        if (picked && conversationId) {
                          if (picked.size > 10 * 1024 * 1024)
                            setError('Choisis un fichier de moins de 10 Mo.')
                          else
                            setFile({
                              conversationId,
                              name: picked.name,
                              size:
                                new Intl.NumberFormat('fr-FR', {
                                  maximumFractionDigits: 1,
                                }).format(picked.size / 1024) + ' Ko',
                            })
                        }
                        event.target.value = ''
                      }}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Ajouter une pièce jointe simulée"
                      onClick={() => picker.current?.click()}
                    >
                      <PaperclipIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Ajouter un sourire"
                      onClick={() => setText(text + ' 🙂')}
                    >
                      <SmileIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Ajouter un bloc de code"
                      onClick={() =>
                        setText(text + '\n```\n// Ton code ici\n```')
                      }
                    >
                      <CodeIcon />
                    </button>
                  </div>
                  <button type="submit" className="button compact">
                    <SendIcon />
                    Envoyer
                  </button>
                </div>
                {error && (
                  <p className="field-error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </>
          ) : (
            <EmptyState
              title="Conversation introuvable"
              description="Sélectionne une conversation dans la liste."
            />
          )}
        </section>
      </div>
      {preview && (
        <Modal title={preview} onClose={() => setPreview(null)}>
          <p>
            Pièce jointe de démonstration : seul le nom du fichier est conservé,
            son contenu n’est ni envoyé ni enregistré.
          </p>
        </Modal>
      )}
    </AppLayout>
  )
}
