import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Post, PostMedia } from '../../types'
import { Avatar } from '../common/Avatar'
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  BookmarkIcon,
  PinIcon,
  FilePdfIcon,
} from '../common/Icons'
import { Modal } from '../common/Modal'
import { ActionDropdown } from '../common/ActionDropdown'
import { people, profilePath } from '../../state/catalog'
import { useCommunities, useDemo } from '../../state/store'

export function PostCard({
  post,
  expanded = false,
}: {
  post: Post
  expanded?: boolean
}) {
  const {
    state,
    update,
    toggleLike,
    toggleSave,
    toggleFollow,
    requireAuth,
    notify,
  } = useDemo()
  const communities = useCommunities()
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('Spam ou publicité abusive')
  const [moderationOpen, setModerationOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.content)
  const [editError, setEditError] = useState('')
  const [commentsOpen, setCommentsOpen] = useState(expanded)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [image, setImage] = useState<PostMedia | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const liked = state.signedIn && state.liked.includes(post.id)
  const saved = state.signedIn && state.saved.includes(post.id)
  const comments = state.comments[post.id] ?? []
  const own = state.signedIn && state.posts.some((item) => item.id === post.id)
  const author = people.find((person) => person.handle === post.author.handle)
  const community = communities.find((item) => item.slug === post.communitySlug)
  const canModerate =
    state.signedIn &&
    !!community &&
    (community.ownerId === state.profile.id ||
      community.staff?.some((member) => member.userId === state.profile.id))
  const canManageHelp =
    state.signedIn && post.author.handle === state.profile.handle
  const help = state.helpRequests[post.id]
  const solution = help?.requested
    ? comments.find((reply) => reply.id === help.solutionId)
    : undefined
  function changeHelp(requested: boolean, solutionId?: string) {
    if (!canManageHelp) return
    if (solutionId && !comments.some((reply) => reply.id === solutionId)) return
    update((previous) => ({
      ...previous,
      helpRequests: {
        ...previous.helpRequests,
        [post.id]: { requested, solutionId },
      },
    }))
    notify(
      solutionId
        ? 'Problème résolu : la réponse utile est mise en avant.'
        : requested
          ? 'Appel à l’aide activé.'
          : 'Appel à l’aide retiré.',
    )
  }
  const shareUrl = window.location.origin + '/publication/' + post.id
  async function share() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      notify('Lien de la publication copié.')
    } catch {
      setShareOpen(true)
    }
  }
  function addComment(event: FormEvent) {
    event.preventDefault()
    if (!requireAuth()) return
    if (!comment.trim()) {
      setCommentError('Écris une réponse avant de l’envoyer.')
      return
    }
    const reply = {
      id: crypto.randomUUID(),
      author: state.profile.name,
      initials: state.profile.avatarInitials,
      text: comment.trim(),
    }
    update((previous) => ({
      ...previous,
      comments: {
        ...previous.comments,
        [post.id]: [...(previous.comments[post.id] ?? []), reply],
      },
    }))
    setComment('')
    setCommentError('')
    notify('Réponse ajoutée.')
  }
  if (state.moderatedPosts.includes(post.id))
    return (
      <div className="post-placeholder">
        <p>Publication retirée de cette communauté dans la démo.</p>
        {canModerate && (
          <button
            className="text-button"
            onClick={() =>
              update((previous) => ({
                ...previous,
                moderatedPosts: previous.moderatedPosts.filter(
                  (id) => id !== post.id,
                ),
              }))
            }
          >
            Rétablir la publication
          </button>
        )}
      </div>
    )
  if (
    state.signedIn &&
    (state.hiddenPosts.includes(post.id) ||
      state.mutedAuthors.includes(post.author.handle))
  )
    return (
      <div className="post-placeholder">
        <p>Publication masquée de ton affichage.</p>
        <button
          className="text-button"
          onClick={() =>
            update((previous) => ({
              ...previous,
              hiddenPosts: previous.hiddenPosts.filter((id) => id !== post.id),
              mutedAuthors: previous.mutedAuthors.filter(
                (handle) => handle !== post.author.handle,
              ),
            }))
          }
        >
          Annuler le masquage
        </button>
      </div>
    )
  return (
    <article className="post-card" id={post.id}>
      {post.isPinned && (
        <p className="post-pinned">
          <PinIcon size={14} aria-hidden="true" /> Publication épinglée
        </p>
      )}
      <header className="post-header">
        <Link
          to={profilePath(post.author.handle)}
          aria-label={'Profil de ' + post.author.name}
        >
          <Avatar
            initials={post.author.initials}
            imageUrl={post.author.avatarUrl}
          />
        </Link>
        <div className="grow">
          <div className="post-author-line">
            <Link to={profilePath(post.author.handle)} className="post-author">
              {post.author.name}
            </Link>
            <Link className="post-time" to={'/publication/' + post.id}>
              {post.timeAgo}
            </Link>
          </div>
          <div className="post-context">
            <span>{post.author.handle}</span>
            {post.communitySlug && (
              <>
                <span aria-hidden="true"> / </span>
                <Link to={'/communaute/' + post.communitySlug}>
                  {post.communityName}
                </Link>
              </>
            )}
          </div>
        </div>
        <button
          className={'icon-button ' + (saved ? 'selected' : '')}
          aria-label={
            saved ? 'Retirer des enregistrements' : 'Enregistrer la publication'
          }
          aria-pressed={saved}
          onClick={() => toggleSave(post.id)}
        >
          <BookmarkIcon size={19} className={saved ? 'fill-current' : ''} />
        </button>
        <ActionDropdown
          label={'Actions de la publication de ' + post.author.name}
        >
          <button onClick={() => toggleSave(post.id)}>
            <span aria-hidden="true">🔖 </span>
            {saved ? 'Retirer des favoris' : 'Enregistrer la publication'}
          </button>
          <button onClick={() => void share()}>
            <span aria-hidden="true">🔗 </span>Copier le lien
          </button>
          {canManageHelp && (
            <button onClick={() => changeHelp(!help?.requested)}>
              <span aria-hidden="true">🙋 </span>
              {help?.requested ? 'Retirer le tag d’aide' : 'Demander de l’aide'}
            </button>
          )}
          {own && (
            <button
              onClick={() => {
                setEditText(post.content)
                setEditError('')
                setEditing(true)
              }}
            >
              <span aria-hidden="true">✏️ </span>Modifier la publication
            </button>
          )}
          {own && (
            <button
              className="danger-action"
              onClick={() => setConfirmDelete(true)}
            >
              <span aria-hidden="true">🗑️ </span>Supprimer la publication
            </button>
          )}
          {!canManageHelp && (
            <>
              {author && (
                <button onClick={() => toggleFollow(author.id)}>
                  <span aria-hidden="true">👤 </span>
                  {state.signedIn && state.following.includes(author.id)
                    ? 'Ne plus suivre '
                    : 'Suivre '}
                  {post.author.name}
                </button>
              )}
              <button
                onClick={() => {
                  if (requireAuth())
                    update((previous) => ({
                      ...previous,
                      hiddenPosts: [
                        ...new Set([...previous.hiddenPosts, post.id]),
                      ],
                    }))
                }}
              >
                <span aria-hidden="true">🙈 </span>Cette publication ne
                m’intéresse pas
              </button>
              <button
                onClick={() => {
                  if (requireAuth())
                    update((previous) => ({
                      ...previous,
                      mutedAuthors: [
                        ...new Set([
                          ...previous.mutedAuthors,
                          post.author.handle,
                        ]),
                      ],
                    }))
                }}
              >
                <span aria-hidden="true">🔇 </span>Masquer les publications de
                cet auteur
              </button>
              <button
                onClick={() => {
                  if (requireAuth()) {
                    setReason(
                      state.reports[post.id] ?? 'Spam ou publicité abusive',
                    )
                    setReportOpen(true)
                  }
                }}
              >
                <span aria-hidden="true">🚩 </span>
                {state.reports[post.id]
                  ? 'Modifier mon signalement'
                  : 'Signaler la publication'}
              </button>
            </>
          )}
          {canModerate && (
            <button
              className="danger-action"
              onClick={() => setModerationOpen(true)}
            >
              <span aria-hidden="true">🛡️ </span>Modérer · Retirer de la
              communauté
            </button>
          )}
        </ActionDropdown>
      </header>
      {(help?.requested || canManageHelp) && (
        <div className="post-help-toolbar">
          {help?.requested && (
            <span className={'help-status ' + (solution ? 'resolved' : '')}>
              {solution ? '✓ Résolu' : 'Besoin d’aide'}
            </span>
          )}
          {canManageHelp && (
            <button
              className="text-button small"
              aria-pressed={help?.requested ?? false}
              onClick={() => changeHelp(!help?.requested)}
            >
              {help?.requested
                ? 'Retirer le tag d’aide'
                : '+ Demander de l’aide'}
            </button>
          )}
          {canManageHelp && solution && (
            <button
              className="text-button small"
              onClick={() => changeHelp(true)}
            >
              Rouvrir la demande
            </button>
          )}
        </div>
      )}
      {solution && (
        <div className="accepted-summary">
          <strong>Réponse retenue · {solution.author}</strong>
          <p>{solution.text}</p>
          <button
            className="text-button small"
            onClick={() => setCommentsOpen(true)}
          >
            Voir les réponses
          </button>
        </div>
      )}
      {post.category && post.category !== 'Discussion' && (
        <span className="post-category">{post.category}</span>
      )}
      {post.title && (
        <h2 className="post-title">
          <Link to={'/publication/' + post.id}>{post.title}</Link>
        </h2>
      )}
      <p className="post-content">{post.content}</p>
      {post.media?.length ? (
        <div className={'post-media media-' + post.media.length}>
          {post.media.map((item) => (
            <button
              key={item.id}
              onClick={() => setImage(item)}
              aria-label={'Agrandir ' + item.name}
            >
              <img
                src={item.url}
                alt={item.name}
                width={720}
                height={440}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
      {post.codeSnippet && (
        <div className="code-block">
          <span>Extrait partagé</span>
          <pre
            tabIndex={0}
            aria-label="Extrait de code, défilement horizontal au clavier"
          >
            <code>{post.codeSnippet}</code>
          </pre>
        </div>
      )}
      {post.attachment && (
        <button className="attachment" onClick={() => setAttachmentOpen(true)}>
          <FilePdfIcon size={25} aria-hidden="true" />
          <span className="grow">
            <strong>{post.attachment.name}</strong>
            <small>{post.attachment.details}</small>
          </span>
          <span>Consulter</span>
        </button>
      )}
      {post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag) => (
            <Link key={tag} to={'/recherche?q=' + encodeURIComponent(tag)}>
              #{tag}
            </Link>
          ))}
        </div>
      )}
      <footer className="post-actions">
        <button
          aria-label={
            (liked ? 'Ne plus aimer' : 'Aimer') +
            ' la publication de ' +
            post.author.name
          }
          aria-pressed={liked}
          onClick={() => toggleLike(post.id)}
        >
          <HeartIcon size={19} className={liked ? 'fill-current' : ''} />
          <span>{post.likesCount + Number(liked)}</span>
        </button>
        <button
          aria-label={`${comments.length} réponses à la publication`}
          aria-expanded={commentsOpen}
          onClick={() => setCommentsOpen(!commentsOpen)}
        >
          <MessageCircleIcon size={19} />
          <span>
            {comments.length}{' '}
            <span className="action-label">
              réponse{comments.length > 1 ? 's' : ''}
            </span>
          </span>
        </button>
        <button
          aria-label="Partager la publication"
          onClick={() => void share()}
        >
          <ShareIcon size={18} />
          <span className="action-label">Partager</span>
        </button>
        {own && (
          <button
            className="delete-post"
            onClick={() => setConfirmDelete(true)}
          >
            Supprimer
          </button>
        )}
      </footer>
      {commentsOpen && (
        <section className="comments" aria-label="Réponses">
          {!comments.length && (
            <p className="muted small">
              Ouvre la discussion : partage ton expérience ou pose une question.
            </p>
          )}
          {comments.map((reply) => (
            <div
              className={
                'comment ' +
                (solution?.id === reply.id ? 'accepted-comment' : '')
              }
              key={reply.id}
            >
              <Avatar initials={reply.initials} size="sm" />
              <div>
                <strong>{reply.author}</strong>
                <p>{reply.text}</p>
                {solution?.id === reply.id && (
                  <span className="help-status resolved">
                    ✓ Solution retenue par l’auteur
                  </span>
                )}
                {canManageHelp && help?.requested && (
                  <button
                    className="text-button small"
                    aria-pressed={solution?.id === reply.id}
                    onClick={() =>
                      changeHelp(
                        true,
                        solution?.id === reply.id ? undefined : reply.id,
                      )
                    }
                  >
                    {solution?.id === reply.id
                      ? 'Annuler la résolution'
                      : 'Cette réponse m’a aidé · Marquer résolu'}
                  </button>
                )}
              </div>
            </div>
          ))}
          <form onSubmit={addComment}>
            <label className="sr-only" htmlFor={'comment-' + post.id}>
              Ta réponse
            </label>
            <input
              id={'comment-' + post.id}
              name="comment"
              value={comment}
              maxLength={1000}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Apporte ta pierre à la discussion…"
            />
            <button className="button compact" type="submit">
              Répondre
            </button>
          </form>
          {commentError && (
            <p className="field-error" role="alert">
              {commentError}
            </p>
          )}
        </section>
      )}
      {editing && (
        <Modal
          title="Modifier ma publication"
          onClose={() => setEditing(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!own) return
              if (
                !editText.trim() &&
                !post.media?.length &&
                !post.codeSnippet
              ) {
                setEditError('Ajoute du texte avant d’enregistrer.')
                return
              }
              update((previous) => ({
                ...previous,
                posts: previous.posts.map((item) =>
                  item.id === post.id
                    ? {
                        ...item,
                        content: editText.trim(),
                        tags: [
                          ...new Set(
                            editText
                              .match(/#[\p{L}\p{N}_-]+/gu)
                              ?.map((tag) => tag.slice(1)) ?? [],
                          ),
                        ],
                      }
                    : item,
                ),
              }))
              setEditing(false)
              notify('Publication mise à jour.')
            }}
          >
            <label className="field">
              Texte
              <textarea
                rows={6}
                maxLength={3000}
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
              />
            </label>
            {editError && (
              <p role="alert" className="field-error">
                {editError}
              </p>
            )}
            <button className="button mt-4">Enregistrer</button>
          </form>
        </Modal>
      )}
      {reportOpen && (
        <Modal
          title="Signaler cette publication"
          onClose={() => setReportOpen(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!requireAuth()) return
              update((previous) => ({
                ...previous,
                reports: { ...previous.reports, [post.id]: reason },
              }))
              setReportOpen(false)
              notify(
                'Signalement enregistré localement. Aucun envoi réel à la modération.',
              )
            }}
          >
            <label className="field">
              Motif
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                {[
                  'Spam ou publicité abusive',
                  'Harcèlement ou propos haineux',
                  'Contenu inapproprié',
                  'Autre problème',
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <p className="small muted mt-3">
              Démonstration : ce signalement reste dans ton navigateur.
            </p>
            <button className="button mt-4">Enregistrer le signalement</button>
          </form>
        </Modal>
      )}
      {moderationOpen && (
        <Modal
          title="Retirer cette publication ?"
          onClose={() => setModerationOpen(false)}
        >
          <p>
            Elle sera masquée de la communauté dans cette démonstration.
            L’équipe pourra la rétablir.
          </p>
          <button
            className="button mt-4"
            onClick={() => {
              if (!canModerate) return
              update((previous) => ({
                ...previous,
                moderatedPosts: [
                  ...new Set([...previous.moderatedPosts, post.id]),
                ],
              }))
              setModerationOpen(false)
              notify('Publication retirée dans la démo.')
            }}
          >
            Confirmer le retrait
          </button>
        </Modal>
      )}
      {shareOpen && (
        <Modal
          title="Partager la publication"
          onClose={() => setShareOpen(false)}
        >
          <label className="field">
            Copie ce lien
            <input
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <p className="demo-note">
            Les publications créées dans cette démo sont visibles uniquement
            dans ton navigateur.
          </p>
        </Modal>
      )}
      {image && (
        <Modal title={image.name} wide onClose={() => setImage(null)}>
          <img className="full-image" src={image.url} alt={image.name} />
        </Modal>
      )}
      {attachmentOpen && (
        <Modal
          title={post.attachment?.name ?? 'Ressource'}
          onClose={() => setAttachmentOpen(false)}
        >
          <p>
            Cette pièce jointe fait partie des données de démonstration. Le
            fichier complet sera disponible une fois la plateforme connectée.
          </p>
          <a
            className="button secondary mt-5"
            href="https://react.dev/reference/rsc/server-components"
            target="_blank"
            rel="noreferrer"
          >
            Lire la documentation React
          </a>
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title="Supprimer cette publication ?"
          onClose={() => setConfirmDelete(false)}
        >
          <p>La publication et ses réponses locales seront supprimées.</p>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </button>
            <button
              className="button"
              onClick={() => {
                update((previous) => {
                  const comments = { ...previous.comments }
                  const helpRequests = { ...previous.helpRequests }
                  delete helpRequests[post.id]
                  delete comments[post.id]
                  return {
                    ...previous,
                    posts: previous.posts.filter((item) => item.id !== post.id),
                    comments,
                    helpRequests,
                    saved: previous.saved.filter((id) => id !== post.id),
                    liked: previous.liked.filter((id) => id !== post.id),
                  }
                })
                notify('Publication supprimée.')
                setConfirmDelete(false)
              }}
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </article>
  )
}
