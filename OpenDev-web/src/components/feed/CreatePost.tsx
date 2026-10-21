import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Avatar } from '../common/Avatar'
import { Modal } from '../common/Modal'
import { useSearchParams } from 'react-router-dom'
import { PaperclipIcon, CodeIcon, FilePdfIcon } from '../common/Icons'
import { api } from '../../lib/api'
import type { PostResource } from '../../types/post'
import type { CommunityChannel } from '../../types/channel'
import {
  prepareResource,
  requireResourceIdentity,
  uploadPostResource,
  type DraftFileResource,
  type FileResource,
} from './post-resource-upload'
import { useCommunities, useDemo, isCommunityMember } from '../../state/store'
import type { Post, PostMedia } from '../../types'
import './post-composer.css'

async function prepareImage(file: File): Promise<PostMedia> {
  if (
    !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
  )
    throw new Error('Choisis une image JPG, PNG, WebP ou GIF.')
  if (file.size > 5 * 1024 * 1024)
    throw new Error('Chaque image doit peser moins de 5 Mo.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    const scale = Math.min(
      1,
      1280 / Math.max(image.naturalWidth, image.naturalHeight),
    )
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('Cet aperçu ne peut pas être créé dans ton navigateur.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return {
      id: crypto.randomUUID(),
      url: canvas.toDataURL('image/jpeg', 0.75),
      name: file.name,
      type: 'image',
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
export function CreatePost({
  communitySlug,
  channelId,
}: {
  communitySlug?: string
  channelId?: string
}) {
  const { state } = useDemo()
  return (
    <PostComposer
      key={state.profile.id + ':' + (communitySlug ?? 'general')}
      communitySlug={communitySlug}
      channelId={channelId}
    />
  )
}
function PostComposer({
  communitySlug,
  channelId,
}: {
  communitySlug?: string
  channelId?: string
}) {
  const [params, setParams] = useSearchParams()
  function closeEditor() {
    if (publishingRef.current) return
    setEditorOpen(false)
    if (params.has('publier'))
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete('publier')
          return next
        },
        { replace: true },
      )
  }
  const communityCatalog = useCommunities()
  const { state, update, notify, openAuth, remote } = useDemo()
  const [publishing, setPublishing] = useState(false)
  const publishingRef = useRef(false)
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<PostMedia[]>([])
  const [files, setFiles] = useState<DraftFileResource[]>([])
  const [links, setLinks] = useState<
    (Extract<PostResource, { kind: 'link' }> & { id: string })[]
  >([])
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const [progress, setProgress] = useState('')
  const uploadedResources = useRef(new Map<string, FileResource>())
  const previewUrls = useRef(new Set<string>())
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [needsHelp, setNeedsHelp] = useState(false)
  const [target, setTarget] = useState(communitySlug ?? '')
  const [channelChoice, setChannelChoice] = useState<{
    communityId: string
    id: string
    suppliedId?: string
  } | null>(null)
  const [channelLoad, setChannelLoad] = useState<{
    communityId: string
    status: 'loading' | 'ready' | 'error'
    channels: CommunityChannel[]
    error: string
  }>({ communityId: '', status: 'loading', channels: [], error: '' })
  const [channelReload, setChannelReload] = useState(0)
  const [category, setCategory] = useState<Post['category']>('Discussion')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const documentInput = useRef<HTMLInputElement>(null)
  const launcherInput = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const targetCommunity = communityCatalog.find(
    (community) => community.slug === target,
  )
  const targetCommunityId = targetCommunity?.id ?? ''
  const live = Boolean(remote)
  const editorVisible = editorOpen || params.get('publier') === '1'
  const channels =
    channelLoad.communityId === targetCommunityId
      ? channelLoad.channels.filter((channel) => !channel.archived_at)
      : []
  const suppliedChannelId = communitySlug === target ? channelId : undefined
  const selectedChannelId =
    channelChoice?.communityId === targetCommunityId &&
    channelChoice.suppliedId === suppliedChannelId
      ? channelChoice.id
      : (suppliedChannelId ??
        channels.find((channel) => channel.is_default)?.id ??
        '')
  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChannelId,
  )
  const canPublishReadOnly =
    !!targetCommunity &&
    (targetCommunity.ownerId === state.profile.id ||
      targetCommunity.myPermissions?.includes('edit_community') ||
      targetCommunity.myPermissions?.includes('moderate_posts'))
  const channelsLoading =
    channelLoad.communityId !== targetCommunityId ||
    channelLoad.status === 'loading'
  const channelIssue =
    !live || !target
      ? ''
      : channelsLoading
        ? 'Chargement des canaux…'
        : channelLoad.status === 'error'
          ? channelLoad.error
          : !selectedChannel || selectedChannel.archived_at
            ? 'Ce canal n’est plus disponible. Choisis un canal actif.'
            : selectedChannel.is_read_only && !canPublishReadOnly
              ? 'Ce canal est en lecture seule. Seule l’équipe autorisée peut y publier.'
              : ''
  const publicationDestination = useRef({
    communityId: targetCommunityId,
    channelId: selectedChannelId,
  })
  useEffect(() => {
    publicationDestination.current = {
      communityId: targetCommunityId,
      channelId: selectedChannelId,
    }
  }, [targetCommunityId, selectedChannelId])
  useEffect(() => {
    if (!live || !editorVisible || !targetCommunityId) return
    let cancelled = false
    setChannelLoad({
      communityId: targetCommunityId,
      status: 'loading',
      channels: [],
      error: '',
    })
    void api<CommunityChannel[]>(`/communities/${targetCommunityId}/channels`)
      .then((channels) => {
        if (!cancelled)
          setChannelLoad({
            communityId: targetCommunityId,
            status: 'ready',
            channels,
            error: '',
          })
      })
      .catch((cause) => {
        if (!cancelled)
          setChannelLoad({
            communityId: targetCommunityId,
            status: 'error',
            channels: [],
            error:
              cause instanceof Error
                ? cause.message
                : 'Impossible de charger les canaux. Réessaie.',
          })
      })
    return () => {
      cancelled = true
    }
  }, [live, editorVisible, targetCommunityId, channelReload])
  useEffect(() => {
    mounted.current = true
    const urls = previewUrls.current
    return () => {
      mounted.current = false
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])
  useEffect(() => {
    if (
      !content &&
      !media.length &&
      !files.length &&
      !links.length &&
      !linkTitle &&
      !linkUrl &&
      !code
    )
      return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [
    content,
    media.length,
    files.length,
    links.length,
    linkTitle,
    linkUrl,
    code,
  ])
  function addLiveFiles(
    selected: FileList | null,
    kind: DraftFileResource['kind'],
  ) {
    if (!selected || publishingRef.current) return
    const maximum = kind === 'image' ? 4 : 2
    if (
      selected.length + files.filter((file) => file.kind === kind).length >
        maximum ||
      selected.length + files.length + links.length > 6
    ) {
      setError(
        `Ajoute au maximum ${maximum} ${kind === 'image' ? 'images' : 'documents'}, et 6 ressources au total.`,
      )
      return
    }
    const additions: DraftFileResource[] = []
    try {
      for (const file of Array.from(selected))
        additions.push(prepareResource(file, kind))
      additions.forEach((file) => previewUrls.current.add(file.previewUrl))
      setFiles((previous) => [...previous, ...additions])
      setError('')
    } catch (cause) {
      additions.forEach((file) => URL.revokeObjectURL(file.previewUrl))
      setError(
        cause instanceof Error
          ? cause.message
          : 'Ce fichier ne peut pas être ajouté.',
      )
    }
  }
  function removeFile(id: string) {
    const file = files.find((file) => file.id === id)
    if (file) {
      URL.revokeObjectURL(file.previewUrl)
      previewUrls.current.delete(file.previewUrl)
    }
    uploadedResources.current.delete(id)
    setFiles((previous) => previous.filter((file) => file.id !== id))
  }
  function addLink() {
    if (publishingRef.current) return
    try {
      const url = new URL(linkUrl.trim())
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.href.length > 2048
      )
        throw new Error(
          'Saisis une adresse HTTP ou HTTPS valide, sans identifiants, de 2 048 caractères maximum.',
        )
      if (!linkTitle.trim() || linkTitle.trim().length > 180)
        throw new Error('Ajoute un titre de 1 à 180 caractères pour ce lien.')
      if (files.length + links.length >= 6)
        throw new Error('Tu peux joindre jusqu’à 6 ressources par publication.')
      setLinks((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          kind: 'link',
          url: url.href,
          title: linkTitle.trim(),
        },
      ])
      setLinkTitle('')
      setLinkUrl('')
      setLinkError('')
      setLinkOpen(false)
      setError('')
    } catch (cause) {
      setLinkError(
        cause instanceof Error && cause.name !== 'TypeError'
          ? cause.message
          : 'Saisis une adresse HTTP ou HTTPS valide.',
      )
    }
  }
  async function addImages(files: FileList | null) {
    if (!files || remote || busy || publishingRef.current) return
    if (files.length + media.length > 4) {
      setError('Tu peux ajouter jusqu’à 4 images par publication.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const images = await Promise.all(Array.from(files).map(prepareImage))
      if (mounted.current) setMedia((previous) => [...previous, ...images])
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof Error
            ? error.message
            : 'Impossible de lire ces images. Réessaie avec une autre image.',
        )
    } finally {
      if (mounted.current) setBusy(false)
      if (input.current) input.current.value = ''
      if (launcherInput.current) launcherInput.current.value = ''
    }
  }
  async function publish(event: FormEvent) {
    event.preventDefault()
    if (busy || publishingRef.current) return
    if (channelIssue) {
      setError(channelIssue)
      return
    }
    if (remote && (linkTitle.trim() || linkUrl.trim())) {
      setError(
        'Ajoute le lien à ta publication ou efface les champs du lien avant de publier.',
      )
      return
    }
    if (
      !content.trim() &&
      !media.length &&
      !files.length &&
      !links.length &&
      !code.trim()
    ) {
      setError(
        remote
          ? 'Écris un texte ou ajoute du code, une image, un document ou un lien avant de publier.'
          : 'Écris quelques mots ou ajoute une image avant de publier.',
      )
      return
    }
    const community = communityCatalog.find((item) => item.slug === target)
    if (target && !community) {
      setError(
        'Cette communauté n’est plus disponible. Choisis une autre destination pour ta publication.',
      )
      return
    }
    if (
      !state.signedIn ||
      (community && !isCommunityMember(state, community))
    ) {
      setError('Rejoins cette communauté avant de publier.')
      return
    }
    const post: Post = {
      id: crypto.randomUUID(),
      author: {
        name: state.profile.name,
        handle: state.profile.handle,
        initials: state.profile.avatarInitials,
      },
      timeAgo: 'À l’instant',
      createdAt: Date.now(),
      title: '',
      content: content.trim(),
      media,
      codeSnippet: code.trim() || undefined,
      tags: [
        ...new Set(
          content.match(/#[\p{L}\p{N}_-]+/gu)?.map((tag) => tag.slice(1)) ?? [],
        ),
      ],
      likesCount: 0,
      repliesCount: 0,
      communitySlug: community?.slug,
      communityName: community?.name,
      category,
    }
    if (remote) {
      publishingRef.current = true
      setPublishing(true)
      setError('')
      try {
        const authorId = state.profile.id
        await requireResourceIdentity(authorId)
        if (community) {
          const currentChannels = await api<CommunityChannel[]>(
            `/communities/${community.id}/channels`,
            'GET',
            undefined,
            authorId,
          )
          const currentChannel = currentChannels.find(
            (channel) => channel.id === selectedChannelId,
          )
          if (!currentChannel || currentChannel.archived_at)
            throw new Error(
              'Ce canal n’est plus disponible. Choisis un autre canal avant de publier.',
            )
          if (currentChannel.is_read_only && !canPublishReadOnly)
            throw new Error(
              'Ce canal est désormais en lecture seule. Choisis un autre canal pour publier.',
            )
        }
        const resources: PostResource[] = []
        for (const [index, file] of files.entries()) {
          if (!mounted.current) return
          setProgress(`Envoi des fichiers : ${index + 1} / ${files.length}…`)
          let uploaded = uploadedResources.current.get(file.id)
          if (!uploaded) {
            uploaded = await uploadPostResource(file, authorId)
            uploadedResources.current.set(file.id, uploaded)
          }
          resources.push(uploaded)
        }
        resources.push(
          ...links.map(({ url, title }) => ({
            kind: 'link' as const,
            url,
            title,
          })),
        )
        if (!mounted.current) return
        if (
          publicationDestination.current.communityId !==
            (community?.id ?? '') ||
          publicationDestination.current.channelId !== selectedChannelId
        )
          throw new Error(
            'La destination a changé pendant l’envoi. Vérifie le canal puis relance la publication.',
          )
        setProgress('Publication en cours…')
        const fallback = code.trim()
          ? 'Extrait de code partagé'
          : links[0]?.title || files[0]?.name || 'Ressources partagées'
        await api(
          '/posts',
          'POST',
          {
            title: (content.trim() || fallback).slice(0, 120),
            body: content.trim() || fallback,
            resources,
            post_type:
              needsHelp || category === 'Question · Entraide'
                ? 'question'
                : category === 'Projet · Collaboration'
                  ? 'showcase'
                  : category === 'Ressource'
                    ? 'resource'
                    : 'discussion',
            community_id: community?.id ?? null,
            channel_id: community ? selectedChannelId : null,
            code_snippet: code.trim() || null,
            tags: post.tags
              .map((tag) => tag.toLowerCase())
              .filter((tag) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(tag))
              .slice(0, 8),
          },
          authorId,
        )
      } catch (cause) {
        if (mounted.current)
          setError(
            cause instanceof Error ? cause.message : 'La publication a échoué.',
          )
        return
      } finally {
        publishingRef.current = false
        if (mounted.current) {
          setPublishing(false)
          setProgress('')
        }
      }
    } else
      update((previous) => ({
        ...previous,
        posts: [post, ...previous.posts],
        helpRequests: {
          ...previous.helpRequests,
          [post.id]: { requested: needsHelp },
        },
      }))
    if (mounted.current) {
      setNeedsHelp(false)
      setContent('')
      setMedia([])
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
      previewUrls.current.clear()
      uploadedResources.current.clear()
      setFiles([])
      setLinks([])
      setLinkTitle('')
      setLinkUrl('')
      setLinkError('')
      setLinkOpen(false)
      setCode('')
      setShowCode(false)
      setError('')
      notify('Publication publiée.')
      closeEditor()
    }
    if (remote)
      void remote.refresh().catch(() => {
        if (mounted.current)
          notify(
            'Ta publication est enregistrée. Actualise le fil pour la voir.',
          )
      })
  }
  if (!state.signedIn)
    return (
      <div className="guest-composer">
        <div>
          <strong>Ta prochaine idée commence ici.</strong>
          <p className="muted">
            Rejoins la conversation avec d’autres développeurs.
          </p>
        </div>
        <button className="button" onClick={openAuth}>
          Rejoindre OpenDev
        </button>
      </div>
    )
  return (
    <>
      <input
        ref={launcherInput}
        type="file"
        accept={
          remote
            ? 'image/jpeg,image/png,image/webp'
            : 'image/jpeg,image/png,image/webp,image/gif'
        }
        multiple
        hidden
        aria-label="Sélectionner des images"
        onChange={(event) => {
          if (remote) {
            addLiveFiles(event.target.files, 'image')
            event.target.value = ''
          } else void addImages(event.target.files)
        }}
      />
      {remote && (
        <input
          ref={documentInput}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          multiple
          hidden
          aria-label="Ajouter des documents à la publication"
          onChange={(event) => {
            addLiveFiles(event.target.files, 'document')
            event.target.value = ''
          }}
        />
      )}
      <section className="composer-launcher" aria-label="Créer une publication">
        <div className="composer-launcher-top">
          <Avatar
            initials={state.profile.avatarInitials}
            imageUrl={state.profile.avatarUrl}
            size="lg"
          />
          <button
            className="composer-start"
            onClick={() => setEditorOpen(true)}
          >
            {content || media.length || files.length || links.length || code
              ? 'Reprendre ma publication'
              : 'Commencer une publication'}
          </button>
        </div>
        <div className="composer-shortcuts">
          <button
            disabled={
              busy ||
              publishing ||
              (remote
                ? files.filter((file) => file.kind === 'image').length >= 4 ||
                  files.length + links.length >= 6
                : media.length === 4)
            }
            onClick={() => {
              launcherInput.current?.click()
              setEditorOpen(true)
            }}
          >
            <svg
              className="shortcut-photo"
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-3 14h16l-6-8-4 5-3-3-3 6Z"
              />
            </svg>
            Photo
          </button>
          <button
            onClick={() => {
              setShowCode(true)
              setEditorOpen(true)
            }}
          >
            <CodeIcon className="shortcut-code" size={23} />
            Partager du code
          </button>
          <button
            onClick={() => {
              setNeedsHelp(true)
              setCategory('Question · Entraide')
              setEditorOpen(true)
            }}
          >
            <span className="shortcut-help" aria-hidden="true">
              ?
            </span>
            Demander de l’aide
          </button>
        </div>
      </section>
      {(editorOpen || params.get('publier') === '1') && (
        <Modal
          title="Créer une publication"
          className={
            'post-composer-modal' + (publishing ? ' is-publishing' : '')
          }
          onClose={closeEditor}
        >
          <form className="composer" onSubmit={publish}>
            {!remote && (
              <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                hidden
                aria-label="Ajouter des images à la publication"
                onChange={(event) => void addImages(event.target.files)}
              />
            )}
            <div className="post-composer-header">
              <div className="post-composer-author">
                <Avatar
                  initials={state.profile.avatarInitials}
                  imageUrl={state.profile.avatarUrl}
                  size="lg"
                />
                <div>
                  <strong>{state.profile.name}</strong>
                  <span>{state.profile.handle}</span>
                </div>
              </div>
              <div className="post-composer-selects">
                <label className="field">
                  Publier dans
                  <select
                    aria-label="Publier dans"
                    value={target}
                    disabled={publishing || !!communitySlug}
                    onChange={(event) => {
                      setTarget(event.target.value)
                      setChannelChoice(null)
                      setError('')
                    }}
                  >
                    {!communitySlug && <option value="">Fil général</option>}
                    {target &&
                      !communityCatalog.some(
                        (community) => community.slug === target,
                      ) && (
                        <option value={target}>Communauté indisponible</option>
                      )}
                    {communityCatalog
                      .filter(
                        (community) =>
                          isCommunityMember(state, community) ||
                          community.slug === target,
                      )
                      .map((community) => (
                        <option key={community.id} value={community.slug}>
                          {community.name}
                        </option>
                      ))}
                  </select>
                </label>
                {remote && target && (
                  <label className="field composer-channel-field">
                    Canal
                    <select
                      value={selectedChannelId}
                      disabled={
                        publishing ||
                        channelsLoading ||
                        channelLoad.status === 'error'
                      }
                      onChange={(event) => {
                        setChannelChoice({
                          communityId: targetCommunityId,
                          id: event.target.value,
                          suppliedId: suppliedChannelId,
                        })
                        setError('')
                      }}
                    >
                      {!selectedChannelId && (
                        <option value="">
                          {channelsLoading ? 'Chargement…' : 'Choisir un canal'}
                        </option>
                      )}
                      {selectedChannelId && !selectedChannel && (
                        <option value={selectedChannelId}>
                          Canal indisponible
                        </option>
                      )}
                      {channels.map((channel) => (
                        <option
                          value={channel.id}
                          key={channel.id}
                          disabled={channel.is_read_only && !canPublishReadOnly}
                        >
                          # {channel.name}
                          {channel.is_read_only ? ' · Lecture seule' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  Type de publication
                  <select
                    aria-label="Type de publication"
                    value={category}
                    disabled={publishing}
                    onChange={(event) => {
                      setCategory(event.target.value as Post['category'])
                      setNeedsHelp(event.target.value === 'Question · Entraide')
                    }}
                  >
                    <option>Discussion</option>
                    <option>Question · Entraide</option>
                    <option>Projet · Collaboration</option>
                    <option>Ressource</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="post-composer-body">
              {remote && target && channelIssue && (
                <div
                  className="composer-channel-notice"
                  role={channelsLoading ? 'status' : 'alert'}
                >
                  <p>{channelIssue}</p>
                  {!channelsLoading && (
                    <button
                      type="button"
                      className="text-button small"
                      disabled={publishing}
                      onClick={() =>
                        setChannelReload((revision) => revision + 1)
                      }
                    >
                      Actualiser les canaux
                    </button>
                  )}
                </div>
              )}
              <label
                htmlFor={'post-' + (communitySlug ?? 'home')}
                className="sr-only"
              >
                Ta publication
              </label>
              <textarea
                autoFocus
                id={'post-' + (communitySlug ?? 'home')}
                className="post-composer-writing"
                name="publication"
                placeholder={
                  needsHelp
                    ? 'Décris ton problème, ce que tu as essayé et ce qui te bloque…'
                    : 'Une découverte, un projet, une idée à partager…'
                }
                maxLength={3000}
                rows={10}
                value={content}
                disabled={publishing}
                onChange={(event) => {
                  setContent(event.target.value)
                  setError('')
                }}
              />
              <label className="checkbox-label composer-help">
                <input
                  type="checkbox"
                  checked={needsHelp}
                  disabled={publishing}
                  onChange={(event) => {
                    setNeedsHelp(event.target.checked)
                    if (event.target.checked) setCategory('Question · Entraide')
                    else if (category === 'Question · Entraide')
                      setCategory('Discussion')
                  }}
                />
                Besoin d’aide pour résoudre un problème
              </label>
              {showCode && (
                <label
                  className="field post-composer-code"
                  id="post-composer-code"
                >
                  <span className="post-composer-code-heading">
                    Extrait de code{' '}
                    <small>{code.length.toLocaleString('fr-FR')} / 5 000</small>
                  </span>
                  <textarea
                    className="code-input"
                    name="code"
                    rows={7}
                    maxLength={5000}
                    value={code}
                    disabled={publishing}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Partage un extrait de code…"
                    spellCheck={false}
                  />
                </label>
              )}
              {!remote && media.length > 0 && (
                <div className="media-previews">
                  {media.map((item) => (
                    <div key={item.id}>
                      <img
                        src={item.url}
                        alt={item.name}
                        width={200}
                        height={140}
                      />
                      <button
                        type="button"
                        aria-label={'Retirer ' + item.name}
                        disabled={publishing}
                        onClick={() =>
                          setMedia((previous) =>
                            previous.filter((image) => image.id !== item.id),
                          )
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {remote && (files.length > 0 || links.length > 0) && (
                <section
                  className="composer-resources"
                  aria-label="Ressources jointes"
                >
                  <div className="composer-resources-heading">
                    <strong>Ressources jointes</strong>
                    <span>{files.length + links.length} / 6</span>
                  </div>
                  {files.map((file) => (
                    <div className="composer-resource" key={file.id}>
                      {file.kind === 'image' ? (
                        <img
                          src={file.previewUrl}
                          alt={'Aperçu de ' + file.name}
                          width={80}
                          height={60}
                        />
                      ) : (
                        <FilePdfIcon size={24} />
                      )}
                      <div className="grow">
                        <strong>{file.name}</strong>
                        <small>
                          {file.kind === 'image' ? 'Image' : 'Document'} ·{' '}
                          {(file.file.size / 1024 / 1024).toLocaleString(
                            'fr-FR',
                            { maximumFractionDigits: 2 },
                          )}{' '}
                          Mo
                        </small>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={publishing}
                        aria-label={'Retirer ' + file.name}
                        onClick={() => removeFile(file.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {links.map((link) => (
                    <div className="composer-resource" key={link.id}>
                      <span className="composer-link-symbol" aria-hidden="true">
                        ↗
                      </span>
                      <div className="grow">
                        <strong>{link.title}</strong>
                        <small>{link.url}</small>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={publishing}
                        aria-label={'Retirer le lien ' + link.title}
                        onClick={() =>
                          setLinks((previous) =>
                            previous.filter((item) => item.id !== link.id),
                          )
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </section>
              )}
              {remote && linkOpen && (
                <section
                  className="composer-link-editor"
                  aria-label="Ajouter un lien"
                >
                  <label className="field">
                    Titre du lien
                    <input
                      value={linkTitle}
                      maxLength={180}
                      disabled={publishing}
                      onChange={(event) => {
                        setLinkTitle(event.target.value)
                        setLinkError('')
                      }}
                      placeholder="Documentation, projet, article…"
                    />
                  </label>
                  <label className="field">
                    Adresse du lien
                    <input
                      type="url"
                      value={linkUrl}
                      maxLength={2048}
                      disabled={publishing}
                      onChange={(event) => {
                        setLinkUrl(event.target.value)
                        setLinkError('')
                      }}
                      placeholder="https://…"
                    />
                  </label>
                  {linkError && (
                    <p role="alert" className="field-error">
                      {linkError}
                    </p>
                  )}
                  <div className="row">
                    <button
                      type="button"
                      className="button compact"
                      disabled={publishing}
                      onClick={addLink}
                    >
                      Ajouter le lien
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={publishing}
                      onClick={() => {
                        setLinkTitle('')
                        setLinkUrl('')
                        setLinkError('')
                        setLinkOpen(false)
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </section>
              )}
            </div>
            <div className="post-composer-footer">
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <div className="composer-footer">
                <div className="row composer-resource-actions">
                  <button
                    className="text-button"
                    type="button"
                    disabled={
                      busy ||
                      publishing ||
                      !!channelIssue ||
                      (remote
                        ? files.filter((file) => file.kind === 'image')
                            .length >= 4 || files.length + links.length >= 6
                        : media.length === 4)
                    }
                    onClick={() =>
                      (remote ? launcherInput.current : input.current)?.click()
                    }
                  >
                    <PaperclipIcon aria-hidden="true" size={18} />
                    {busy ? 'Préparation…' : 'Images'}
                  </button>
                  {remote && (
                    <>
                      <button
                        className="text-button"
                        type="button"
                        disabled={
                          publishing ||
                          files.filter((file) => file.kind === 'document')
                            .length >= 2 ||
                          files.length + links.length >= 6
                        }
                        onClick={() => documentInput.current?.click()}
                      >
                        <FilePdfIcon size={18} />
                        Documents
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        disabled={
                          publishing || files.length + links.length >= 6
                        }
                        aria-expanded={linkOpen}
                        onClick={() => setLinkOpen((previous) => !previous)}
                      >
                        <span
                          className="composer-link-symbol"
                          aria-hidden="true"
                        >
                          ↗
                        </span>
                        Lien
                      </button>
                    </>
                  )}
                  <button
                    className="text-button"
                    type="button"
                    aria-pressed={showCode}
                    aria-expanded={showCode}
                    aria-controls={showCode ? 'post-composer-code' : undefined}
                    disabled={publishing}
                    onClick={() => setShowCode(!showCode)}
                  >
                    <CodeIcon size={18} aria-hidden="true" />
                    {showCode
                      ? 'Masquer le code'
                      : code.trim()
                        ? 'Code joint'
                        : 'Ajouter du code'}
                  </button>
                </div>
                <div className="row post-composer-publish">
                  <span
                    className="character-count"
                    aria-label={`${content.length} caractères sur 3000`}
                  >
                    {content.length.toLocaleString('fr-FR')} / 3 000
                  </span>
                  <button
                    className="button"
                    type="submit"
                    disabled={
                      busy ||
                      publishing ||
                      (!content.trim() &&
                        !code.trim() &&
                        !media.length &&
                        !files.length &&
                        !links.length)
                    }
                  >
                    {publishing ? 'Publication…' : 'Publier'}
                  </button>
                </div>
              </div>
              <p
                className="composer-hint"
                role={publishing ? 'status' : undefined}
              >
                {publishing
                  ? progress || 'Préparation de la publication…'
                  : remote
                    ? '4 images · 5 Mo par image · 2 documents PDF, TXT ou MD · 10 Mo par document · 6 ressources maximum'
                    : 'Démonstration · 4 images maximum · 5 Mo par image · Aperçus enregistrés localement'}
              </p>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
