import { usePeople } from '../../state/store'
import { useEffect, useRef, useState, type FormEvent } from 'react'
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
import { PostActionIcon } from '../common/PostActionIcon'
import { profilePath } from '../../state/catalog'
import { isCommunityMember, useCommunities, useDemo } from '../../state/store'
import './post-overview.css'
import { PostResources } from './PostResources'
import { ContributionBadge } from '../profile/ContributionBadge'
import { api } from '../../lib/api'
import type { ThanksTag } from '../../types/contribution'

export function PostCard({
  post,
  expanded = false,
  variant = 'default',
  commentsReadOnly = false,
}: {
  post: Post
  expanded?: boolean
  variant?: 'default' | 'overview'
  commentsReadOnly?: boolean
}) {
  const people = usePeople()
  const {
    state,
    update,
    toggleLike,
    toggleSave,
    toggleFollow,
    requireAuth,
    notify,
    remote,
    savingPostIds,
  } = useDemo()
  const communities = useCommunities()
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('Spam ou publicité abusive')
  const [moderationOpen, setModerationOpen] = useState(false)
  const [moderationError, setModerationError] = useState('')
  const [moderating, setModerating] = useState(false)
  const [removingComment, setRemovingComment] = useState<string | null>(null)
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
  const [recognitionState, setRecognitionState] = useState<{
    owner: string
    postId: string
    commentId: string
  } | null>(null)
  const recognizing =
    state.signedIn &&
    recognitionState?.owner === state.profile.id &&
    recognitionState.postId === post.id
      ? recognitionState.commentId
      : null
  const [recognitionError, setRecognitionError] = useState('')
  const [solutionOverride, setSolutionOverride] = useState<{
    postId: string
    owner: string
    baseId: string | null | undefined
    commentId: string | null
  } | null>(null)
  const recognitionBusy = useRef(false)
  const identityGeneration = useRef(0)
  useEffect(() => {
    identityGeneration.current += 1
    recognitionBusy.current = false
    return () => {
      identityGeneration.current += 1
    }
  }, [state.profile.id, state.signedIn, post.id])
  const liked = state.signedIn && state.liked.includes(post.id)
  const saved = state.signedIn && state.saved.includes(post.id)
  const saving = savingPostIds?.includes(post.id) ?? false
  const comments = state.comments[post.id] ?? []
  const loadComments = remote?.loadComments
  useEffect(() => {
    if (loadComments && commentsOpen)
      void loadComments(post.id).catch((cause) =>
        setCommentError(cause.message),
      )
  }, [loadComments, commentsOpen, post.id])
  const own =
    state.signedIn &&
    (post.author.id
      ? post.author.id === state.profile.id
      : post.author.handle === state.profile.handle)
  const author = people.find((person) => person.handle === post.author.handle)
  const community = communities.find((item) => item.slug === post.communitySlug)
  const canManageChannel =
    state.signedIn &&
    !!community &&
    (community.ownerId === state.profile.id ||
      community.myPermissions?.includes('edit_community') ||
      community.myPermissions?.includes('moderate_posts'))
  const canWriteChannel =
    !remote ||
    (!post.channelReadOnly && !post.channelArchivedAt) ||
    canManageChannel
  const channelRestriction = post.channelArchivedAt
    ? 'Ce canal est archivé. Son historique reste consultable ; seuls les responsables peuvent modifier les publications existantes.'
    : 'Ce canal est en lecture seule. Seuls les responsables autorisés peuvent publier et répondre.'
  const canReplyChannel =
    canWriteChannel && !post.channelArchivedAt && !commentsReadOnly
  const recognitionMembership =
    !post.communitySlug || (!!community && isCommunityMember(state, community))
  const canRecognize = canReplyChannel && recognitionMembership
  const replyRestriction = post.channelArchivedAt
    ? 'Ce canal est archivé. L’historique reste consultable ; les nouvelles réponses sont fermées.'
    : commentsReadOnly
      ? 'Les nouvelles réponses sont fermées dans ce canal.'
      : channelRestriction
  const canModerate =
    state.signedIn &&
    !!community &&
    (community.ownerId === state.profile.id ||
      community.myPermissions?.includes('moderate_posts') ||
      community.staff?.some((member) => member.userId === state.profile.id))
  const canManageHelp =
    state.signedIn && post.author.handle === state.profile.handle
  const help = remote
    ? {
        requested: post.category === 'Question · Entraide',
        solutionId: post.solutionCommentId,
      }
    : state.helpRequests[post.id]
  const currentSolutionOverride =
    solutionOverride?.postId === post.id &&
    solutionOverride.owner === state.profile.id &&
    (post.solutionCommentId === solutionOverride.baseId ||
      post.solutionCommentId === solutionOverride.commentId)
      ? solutionOverride
      : null
  const solutionId = remote
    ? currentSolutionOverride
      ? currentSolutionOverride.commentId
      : (comments.find((reply) => reply.isSolution)?.id ?? help?.solutionId)
    : help?.solutionId
  const solution = help?.requested
    ? comments.find((reply) => reply.id === solutionId)
    : undefined
  async function recognize(commentId: string | null, tag?: ThanksTag | null) {
    if (!remote || !requireAuth() || recognitionBusy.current) return
    if (!canRecognize) {
      setRecognitionError(
        !recognitionMembership
          ? 'Rejoins la communauté pour remercier une réponse ou retenir une solution.'
          : replyRestriction,
      )
      return
    }
    const generation = identityGeneration.current
    const userId = state.profile.id
    recognitionBusy.current = true
    setRecognitionState({
      owner: userId,
      postId: post.id,
      commentId: commentId ?? 'solution',
    })
    setRecognitionError('')
    let persisted = false
    try {
      if (tag !== undefined && commentId) {
        await api(
          `/posts/${post.id}/comments/${commentId}/thanks`,
          tag === null ? 'DELETE' : 'PUT',
          tag === null ? undefined : { tag },
          userId,
        )
      } else {
        const result = await api<{
          post_id: string
          accepted_comment_id: string | null
        }>(
          `/posts/${post.id}/solution`,
          'PUT',
          { comment_id: commentId },
          userId,
        )
        if (generation === identityGeneration.current)
          setSolutionOverride({
            postId: post.id,
            owner: userId,
            baseId: post.solutionCommentId,
            commentId: result.accepted_comment_id,
          })
      }
      persisted = true
      if (generation !== identityGeneration.current) return
      await remote.refresh()
      if (generation !== identityGeneration.current) return
      await remote.loadComments(post.id)
      if (generation !== identityGeneration.current) return
      notify(
        tag !== undefined
          ? tag === null
            ? 'Remerciement retiré.'
            : 'Remerciement envoyé.'
          : commentId
            ? 'Solution retenue.'
            : 'Question rouverte.',
      )
    } catch (cause) {
      if (generation === identityGeneration.current)
        setRecognitionError(
          persisted
            ? 'Modification enregistrée. Actualise la page pour retrouver les derniers scores.'
            : cause instanceof Error
              ? cause.message
              : 'Impossible d’enregistrer cette action. Réessaie.',
        )
    } finally {
      if (generation === identityGeneration.current) {
        recognitionBusy.current = false
        setRecognitionState(null)
      }
    }
  }
  function changeHelp(requested: boolean, solutionId?: string) {
    if (remote) return
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
  async function addComment(event: FormEvent) {
    event.preventDefault()
    if (!requireAuth()) return
    if (!canReplyChannel) {
      setCommentError(replyRestriction)
      return
    }
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
    if (remote) {
      try {
        await remote.request('/posts/' + post.id + '/comments', 'POST', {
          body: comment.trim(),
        })
        await remote.refresh()
        await remote.loadComments(post.id)
      } catch (cause) {
        setCommentError(
          cause instanceof Error ? cause.message : 'Réponse non envoyée.',
        )
        return
      }
    } else
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
    <article
      className={'post-card' + (variant === 'overview' ? ' post-overview' : '')}
      id={post.id}
    >
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
            <ContributionBadge
              score={author?.contributionScore ?? post.author.contributionScore}
            />
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
                {post.channelId && post.channelName && (
                  <>
                    <span aria-hidden="true"> / </span>
                    <Link
                      className="post-channel-context"
                      to={
                        '/communaute/' +
                        post.communitySlug +
                        '?canal=' +
                        encodeURIComponent(post.channelId)
                      }
                    >
                      #{post.channelName}
                      {post.channelArchivedAt
                        ? ' · Archivé'
                        : post.channelReadOnly
                          ? ' · Lecture seule'
                          : ''}
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        {variant === 'overview' && (
          <span
            className={
              'overview-category' +
              (post.category?.includes('Entraide')
                ? ' overview-category-help'
                : post.category?.includes('Projet')
                  ? ' overview-category-project'
                  : post.category?.includes('Ressource')
                    ? ' overview-category-resource'
                    : '')
            }
          >
            {post.category ?? 'Discussion'}
          </span>
        )}
        <button
          className={'icon-button ' + (saved ? 'selected' : '')}
          aria-label={
            saved ? 'Retirer des enregistrements' : 'Enregistrer la publication'
          }
          aria-pressed={saved}
          aria-busy={saving}
          disabled={saving}
          onClick={() => void toggleSave(post.id)}
        >
          {saving ? (
            <span
              className="loading-spinner"
              aria-hidden="true"
              style={{ width: 18, height: 18, borderWidth: 2 }}
            />
          ) : (
            <BookmarkIcon size={19} className={saved ? 'fill-current' : ''} />
          )}
        </button>
        <ActionDropdown
          label={'Actions de la publication de ' + post.author.name}
        >
          <button
            disabled={saving}
            aria-busy={saving}
            onClick={() => void toggleSave(post.id)}
          >
            <PostActionIcon name="bookmark" />
            {saving
              ? 'Enregistrement…'
              : saved
                ? 'Retirer des enregistrements'
                : 'Enregistrer la publication'}
          </button>
          <button onClick={() => void share()}>
            <PostActionIcon name="link" />
            Copier le lien
          </button>
          {!remote && canManageHelp && (
            <button onClick={() => changeHelp(!help?.requested)}>
              <PostActionIcon name="help" />
              {help?.requested ? 'Retirer le tag d’aide' : 'Demander de l’aide'}
            </button>
          )}
          {own && canWriteChannel && (
            <button
              onClick={() => {
                setEditText(post.content)
                setEditError('')
                setEditing(true)
              }}
            >
              <PostActionIcon name="edit" />
              Modifier la publication
            </button>
          )}
          {own && (
            <button
              className="danger-action"
              onClick={() => setConfirmDelete(true)}
            >
              <PostActionIcon name="trash" />
              Supprimer la publication
            </button>
          )}
          {!canManageHelp && (
            <>
              {author && (
                <button onClick={() => toggleFollow(author.id)}>
                  <PostActionIcon name="user" />
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
                <PostActionIcon name="hide" />
                Cette publication ne m’intéresse pas
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
                <PostActionIcon name="mute" />
                Masquer les publications de cet auteur
              </button>
              <button
                onClick={() => {
                  if (requireAuth()) {
                    if (remote) {
                      notify(
                        'Le signalement sera disponible dans une prochaine étape.',
                      )
                      return
                    }
                    setReason(
                      state.reports[post.id] ?? 'Spam ou publicité abusive',
                    )
                    setReportOpen(true)
                  }
                }}
              >
                <PostActionIcon name="flag" />
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
              <PostActionIcon name="shield" />
              Modérer · Retirer de la communauté
            </button>
          )}
        </ActionDropdown>
      </header>
      {(help?.requested || (!remote && canManageHelp)) && (
        <div className="post-help-toolbar">
          {help?.requested && (
            <span className={'help-status ' + (solutionId ? 'resolved' : '')}>
              {solutionId ? '✓ Résolu' : 'Besoin d’aide'}
            </span>
          )}
          {!remote && canManageHelp && (
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
          {canManageHelp && solutionId && (!remote || canRecognize) && (
            <button
              className="text-button small"
              disabled={recognizing !== null}
              onClick={() => (remote ? void recognize(null) : changeHelp(true))}
            >
              Rouvrir la demande
            </button>
          )}
        </div>
      )}
      {recognitionError && (
        <p className="field-error" role="alert">
          {recognitionError}
        </p>
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
      {variant !== 'overview' &&
        post.category &&
        post.category !== 'Discussion' && (
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
      {!!post.resources?.length && <PostResources resources={post.resources} />}
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
      {variant !== 'overview' && post.tags.length > 0 && (
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
          <span>{post.likesCount + (remote ? 0 : Number(liked))}</span>
        </button>
        <button
          aria-label={`${remote ? post.repliesCount : comments.length} réponses à la publication`}
          aria-expanded={commentsOpen}
          onClick={() => setCommentsOpen(!commentsOpen)}
        >
          <MessageCircleIcon size={19} />
          <span>
            {remote ? post.repliesCount : comments.length}{' '}
            <span className="action-label">
              réponse
              {(remote ? post.repliesCount : comments.length) > 1 ? 's' : ''}
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
        {variant === 'overview' && post.tags.length > 0 && (
          <div className="overview-tags">
            {post.tags.map((tag) => (
              <Link key={tag} to={'/recherche?q=' + encodeURIComponent(tag)}>
                {tag}
              </Link>
            ))}
          </div>
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
                'comment ' + (solutionId === reply.id ? 'accepted-comment' : '')
              }
              key={reply.id}
            >
              <Avatar initials={reply.initials} size="sm" />
              <div>
                <div className="comment-author-line">
                  <strong>{reply.author}</strong>
                  <ContributionBadge
                    score={
                      people.find((person) => person.id === reply.authorId)
                        ?.contributionScore ?? reply.contributionScore
                    }
                  />
                </div>
                <p>{reply.text}</p>
                {remote && help?.requested && (
                  <div className="comment-contribution-actions">
                    {reply.thanksCount !== undefined &&
                      reply.thanksCount > 0 && (
                        <span className="small muted">
                          {reply.thanksCount} remerciement
                          {reply.thanksCount > 1 ? 's' : ''}
                        </span>
                      )}
                    {canRecognize &&
                      reply.authorId &&
                      reply.authorId !== state.profile.id && (
                        <details className="comment-thanks">
                          <summary>
                            {reply.myThanksTag === 'thanks'
                              ? 'Merci envoyé'
                              : reply.myThanksTag === 'helpful'
                                ? 'Utile'
                                : reply.myThanksTag === 'clear'
                                  ? 'Très clair'
                                  : 'Remercier'}
                          </summary>
                          <div
                            className="comment-thanks-options"
                            role="group"
                            aria-label={'Remercier ' + reply.author}
                          >
                            {(
                              [
                                ['thanks', 'Merci'],
                                ['helpful', 'Utile'],
                                ['clear', 'Très clair'],
                              ] as const
                            ).map(([tag, label]) => (
                              <button
                                key={tag}
                                type="button"
                                aria-pressed={reply.myThanksTag === tag}
                                disabled={recognizing !== null}
                                onClick={() =>
                                  void recognize(
                                    reply.id,
                                    reply.myThanksTag === tag ? null : tag,
                                  )
                                }
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </details>
                      )}
                    {canRecognize &&
                      canManageHelp &&
                      reply.authorId &&
                      reply.authorId !== state.profile.id && (
                        <button
                          type="button"
                          className="text-button small"
                          disabled={recognizing !== null}
                          aria-pressed={solutionId === reply.id}
                          onClick={() =>
                            void recognize(
                              solutionId === reply.id ? null : reply.id,
                            )
                          }
                        >
                          {recognizing === reply.id
                            ? 'Enregistrement…'
                            : solutionId === reply.id
                              ? 'Retirer la solution'
                              : 'Retenir comme solution'}
                        </button>
                      )}
                  </div>
                )}
                {remote &&
                  state.signedIn &&
                  (canModerate || reply.authorId === state.profile.id) && (
                    <button
                      className="text-button small"
                      onClick={() => {
                        setModerationError('')
                        setRemovingComment(reply.id)
                      }}
                    >
                      Supprimer la réponse
                    </button>
                  )}
                {solutionId === reply.id && (
                  <span className="help-status resolved">
                    ✓ Solution retenue par l’auteur
                  </span>
                )}
                {!remote && canManageHelp && help?.requested && (
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
          {remote &&
            help?.requested &&
            !recognitionMembership &&
            canReplyChannel && (
              <p className="post-channel-notice">
                {state.signedIn ? (
                  <>
                    Rejoins la communauté pour remercier une réponse ou retenir
                    une solution.{' '}
                    <Link to={'/communaute/' + post.communitySlug}>
                      Voir la communauté
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-button small"
                    onClick={requireAuth}
                  >
                    Connecte-toi pour remercier une réponse.
                  </button>
                )}
              </p>
            )}
          {canReplyChannel ? (
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
          ) : (
            <p className="post-channel-notice" role="status">
              {replyRestriction}
            </p>
          )}
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
            onSubmit={async (event) => {
              event.preventDefault()
              if (!own) return
              if (!canWriteChannel) {
                setEditError(channelRestriction)
                return
              }
              if (
                !editText.trim() &&
                !post.media?.length &&
                !post.resources?.length &&
                !post.codeSnippet
              ) {
                setEditError('Ajoute du texte avant d’enregistrer.')
                return
              }
              if (remote) {
                try {
                  const firstResource = post.resources?.[0]
                  const resourceCaption =
                    firstResource?.kind === 'link'
                      ? firstResource.title
                      : firstResource?.name
                  await remote.request('/posts/' + post.id, 'PATCH', {
                    body:
                      editText.trim() ||
                      resourceCaption ||
                      'Extrait de code partagé',
                  })
                  await remote.refresh()
                } catch (cause) {
                  setEditError(
                    cause instanceof Error
                      ? cause.message
                      : 'Modification impossible.',
                  )
                  return
                }
              } else
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
            {remote
              ? 'La publication et ses réponses seront supprimées de la communauté. Cette action est définitive.'
              : 'Elle sera masquée de la communauté dans cette démonstration. L’équipe pourra la rétablir.'}
          </p>
          {moderationError && (
            <p className="field-error mt-3" role="alert">
              {moderationError}
            </p>
          )}
          <button
            className="button mt-4"
            disabled={moderating}
            onClick={async () => {
              if (!canModerate) return
              if (remote) {
                setModerating(true)
                setModerationError('')
                try {
                  await remote.request('/posts/' + post.id, 'DELETE')
                  await remote.refresh()
                  setModerationOpen(false)
                  notify('Publication supprimée de la communauté.')
                } catch (cause) {
                  setModerationError(
                    cause instanceof Error
                      ? cause.message
                      : 'Suppression impossible.',
                  )
                } finally {
                  setModerating(false)
                }
                return
              }
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
            {moderating ? 'Suppression…' : 'Confirmer le retrait'}
          </button>
        </Modal>
      )}
      {removingComment && remote && (
        <Modal
          title="Supprimer cette réponse ?"
          onClose={() => {
            if (!moderating) setRemovingComment(null)
          }}
        >
          <p>La réponse sera supprimée définitivement.</p>
          {moderationError && (
            <p className="field-error mt-3" role="alert">
              {moderationError}
            </p>
          )}
          <div className="modal-footer">
            <button
              className="button secondary"
              disabled={moderating}
              onClick={() => setRemovingComment(null)}
            >
              Annuler
            </button>
            <button
              className="button"
              disabled={moderating}
              onClick={async () => {
                setModerating(true)
                setModerationError('')
                try {
                  await remote.request(
                    `/posts/${post.id}/comments/${removingComment}`,
                    'DELETE',
                  )
                  if (solutionId === removingComment)
                    setSolutionOverride({
                      postId: post.id,
                      owner: state.profile.id,
                      baseId: post.solutionCommentId,
                      commentId: null,
                    })
                  await remote.refresh()
                  await remote.loadComments(post.id)
                  setRemovingComment(null)
                  notify('Réponse supprimée.')
                } catch (cause) {
                  setModerationError(
                    cause instanceof Error
                      ? cause.message
                      : 'Suppression impossible.',
                  )
                } finally {
                  setModerating(false)
                }
              }}
            >
              {moderating ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
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
          <p>La publication et ses réponses seront supprimées.</p>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </button>
            <button
              className="button"
              onClick={async () => {
                if (remote) {
                  try {
                    await remote.request('/posts/' + post.id, 'DELETE')
                    await remote.refresh()
                    setConfirmDelete(false)
                    notify('Publication supprimée.')
                  } catch (cause) {
                    notify(
                      cause instanceof Error
                        ? cause.message
                        : 'Suppression impossible.',
                    )
                  }
                  return
                }
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
