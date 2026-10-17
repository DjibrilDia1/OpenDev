import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Avatar } from '../common/Avatar'
import { Modal } from '../common/Modal'
import { useSearchParams } from 'react-router-dom'
import { PaperclipIcon, CodeIcon } from '../common/Icons'
import { useCommunities, useDemo, isCommunityMember } from '../../state/store'
import type { Post, PostMedia } from '../../types'

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
export function CreatePost({ communitySlug }: { communitySlug?: string }) {
  const [params, setParams] = useSearchParams()
  function closeEditor() {
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
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<PostMedia[]>([])
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [needsHelp, setNeedsHelp] = useState(false)
  const [target, setTarget] = useState(communitySlug ?? '')
  const [category, setCategory] = useState<Post['category']>('Discussion')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const launcherInput = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!content && !media.length && !code) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [content, media.length, code])
  async function addImages(files: FileList | null) {
    if (!files) return
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
    if (publishing) return
    if (!content.trim() && !media.length && !code.trim()) {
      setError('Écris quelques mots ou ajoute une image avant de publier.')
      return
    }
    const community = communityCatalog.find((item) => item.slug === target)
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
      if (media.length) {
        setError(
          'L’envoi d’images n’est pas encore disponible. Tu peux publier du texte et du code.',
        )
        return
      }
      setPublishing(true)
      try {
        await remote.request('/posts', 'POST', {
          title: (content.trim() || 'Extrait de code').slice(0, 120),
          body: content.trim() || 'Extrait de code partagé',
          post_type:
            needsHelp || category === 'Question · Entraide'
              ? 'question'
              : category === 'Projet · Collaboration'
                ? 'showcase'
                : 'discussion',
          community_id: community?.id ?? null,
          code_snippet: code.trim() || null,
          tags: post.tags
            .map((tag) => tag.toLowerCase())
            .filter((tag) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(tag))
            .slice(0, 8),
        })
        await remote.refresh()
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'La publication a échoué.',
        )
        return
      } finally {
        setPublishing(false)
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
    setNeedsHelp(false)
    setContent('')
    setMedia([])
    setCode('')
    setShowCode(false)
    setError('')
    notify('Publication ajoutée à ton fil.')
    closeEditor()
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
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        aria-label="Sélectionner des images"
        onChange={(event) => void addImages(event.target.files)}
      />
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
            {content || media.length || code
              ? 'Reprendre ma publication'
              : 'Commencer une publication'}
          </button>
        </div>
        <div className="composer-shortcuts">
          <button
            disabled={busy || media.length === 4}
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
        <Modal title="Créer une publication" onClose={closeEditor}>
          <form className="composer" onSubmit={publish}>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              aria-label="Ajouter des images à la publication"
              onChange={(event) => void addImages(event.target.files)}
            />
            <div className="composer-top">
              <Avatar initials={state.profile.avatarInitials} />
              <div className="grow">
                <label
                  htmlFor={'post-' + (communitySlug ?? 'home')}
                  className="sr-only"
                >
                  Ta publication
                </label>
                <textarea
                  autoFocus
                  id={'post-' + (communitySlug ?? 'home')}
                  name="publication"
                  placeholder="Qu’as-tu appris ou construit aujourd’hui ?"
                  maxLength={3000}
                  rows={3}
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value)
                    setError('')
                  }}
                />
                <div className="composer-selects">
                  {!communitySlug && (
                    <select
                      aria-label="Publier dans"
                      value={target}
                      onChange={(event) => setTarget(event.target.value)}
                    >
                      <option value="">Fil général</option>
                      {communityCatalog
                        .filter((community) =>
                          isCommunityMember(state, community),
                        )
                        .map((community) => (
                          <option key={community.id} value={community.slug}>
                            {community.name}
                          </option>
                        ))}
                    </select>
                  )}
                  <select
                    aria-label="Type de publication"
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as Post['category'])
                    }
                  >
                    <option>Discussion</option>
                    <option>Question · Entraide</option>
                    <option>Projet · Collaboration</option>
                    <option>Ressource</option>
                  </select>
                </div>
              </div>
            </div>
            <label className="checkbox-label composer-help">
              <input
                type="checkbox"
                checked={needsHelp}
                onChange={(event) => setNeedsHelp(event.target.checked)}
              />
              Besoin d’aide pour résoudre un problème
            </label>
            {showCode && (
              <label className="field">
                Extrait de code
                <textarea
                  className="code-input"
                  name="code"
                  rows={4}
                  maxLength={5000}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Partage un extrait de code…"
                  spellCheck={false}
                />
              </label>
            )}
            {media.length > 0 && (
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
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="composer-footer">
              <div className="row">
                <button
                  className="text-button"
                  type="button"
                  disabled={busy || media.length === 4}
                  onClick={() => input.current?.click()}
                >
                  <PaperclipIcon aria-hidden="true" size={18} />
                  {busy ? 'Préparation…' : 'Images'}
                </button>
                <button
                  className="text-button"
                  type="button"
                  aria-pressed={showCode}
                  onClick={() => setShowCode(!showCode)}
                >
                  <CodeIcon size={18} aria-hidden="true" />
                  Code
                </button>
              </div>
              <div className="row">
                <span className="character-count">{content.length}/3 000</span>
                <button
                  className="button compact"
                  type="submit"
                  disabled={busy || publishing}
                >
                  Publier
                </button>
              </div>
            </div>
            <p className="composer-hint">
              4 images maximum · 5 Mo par image · Aperçus enregistrés localement
            </p>
          </form>
        </Modal>
      )}
    </>
  )
}
