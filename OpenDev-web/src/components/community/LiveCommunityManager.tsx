import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Modal } from '../common/Modal'
import { Avatar } from '../common/Avatar'
import { categories, profilePath } from '../../state/catalog'
import { useDemo } from '../../state/store'
import { api, ApiError } from '../../lib/api'
import { initials, toEvent, type EventRow } from '../../lib/adapters'
import { supabase } from '../../lib/supabase'
import type { Community } from '../../types'
import type {
  CommunityPermission,
  CommunityResource,
} from '../../types/community'
import type { CommunityEvent } from '../../types/event'
import {
  permissionLabels,
  useCommunityAccess,
  type CommunityAccess,
  type CommunityMemberRow,
} from './communityAccess'
import { CommunityEventEditor } from './CommunityEventEditor'
import './community-management.css'

export function LiveCommunityManager({
  community,
  onClose,
}: {
  community?: Community
  onClose: () => void
}) {
  const { state, remote, notify } = useDemo()
  const navigate = useNavigate()
  const {
    access,
    loading,
    error: accessError,
    reload,
  } = useCommunityAccess(community?.id)
  const [tab, setTab] = useState('settings')
  const [name, setName] = useState(community?.name ?? '')
  const [description, setDescription] = useState(community?.description ?? '')
  const [category, setCategory] = useState<Community['category']>(
    community?.category ?? 'Frontend',
  )
  const [rules, setRules] = useState(community?.rules ?? '')
  const [resources, setResources] = useState<CommunityResource[]>(
    community?.resources ?? [],
  )
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const pending = useRef(false)
  const canEdit =
    !community ||
    !!access?.is_owner ||
    !!access?.permissions.includes('edit_community')
  const canMembers =
    !!access?.is_owner || !!access?.permissions.includes('manage_members')
  const canEvents =
    !!access?.is_owner || !!access?.permissions.includes('manage_events')
  useEffect(() => {
    if (community && access && !canEdit && tab === 'settings')
      setTab(canMembers ? 'members' : canEvents ? 'events' : 'settings')
  }, [community, access, canEdit, canMembers, canEvents, tab])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!remote || pending.current || !canEdit) return
    if (name.trim().length < 3 || description.trim().length < 20) {
      setError(
        'Renseigne un nom d’au moins 3 caractères et une description d’au moins 20 caractères.',
      )
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    let uploaded: string | null = null
    let committed = false
    try {
      let cover = removeCover ? null : (community?.coverUrl ?? null)
      if (coverFile && community) {
        if (!supabase) throw new Error('Le stockage est indisponible.')
        const blob = await prepareCover(coverFile)
        const path = `${community.id}/${crypto.randomUUID()}.jpg`
        const result = await supabase.storage
          .from('community-covers')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        if (result.error)
          throw new Error('L’image n’a pas pu être envoyée. Réessaie.')
        uploaded = path
        cover = supabase.storage.from('community-covers').getPublicUrl(path)
          .data.publicUrl
      }
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        rules: rules.trim(),
        resources: resources.map((row) => ({
          title: row.title.trim(),
          description: row.description.trim(),
          url: row.url.trim(),
        })),
      }
      const stem =
        name
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'communaute'
      const saved = await remote.request<{ slug: string }>(
        community ? `/communities/${community.id}` : '/communities',
        community ? 'PATCH' : 'POST',
        community
          ? { ...payload, cover_url: cover }
          : {
              ...payload,
              slug: `${stem.slice(0, 48)}-${crypto.randomUUID().slice(0, 8)}`,
              tags: [],
            },
      )
      committed = true
      await remote
        .refresh()
        .catch(() =>
          notify(
            'Communauté enregistrée. Actualise la page pour retrouver les modifications.',
          ),
        )
      notify('Communauté enregistrée.')
      onClose()
      navigate('/communaute/' + saved.slug)
    } catch (cause) {
      if (
        uploaded &&
        !committed &&
        cause instanceof ApiError &&
        cause.status >= 400 &&
        cause.status < 500
      )
        await supabase?.storage
          .from('community-covers')
          .remove([uploaded])
          .catch(() => {})
      setError(
        cause instanceof Error ? cause.message : 'Enregistrement impossible.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  async function remove() {
    if (
      !remote ||
      !community ||
      !access?.is_owner ||
      confirmation !== community.name ||
      pending.current
    )
      return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await remote.request(`/communities/${community.id}`, 'DELETE')
      await remote.refresh().catch(() => {})
      notify('Communauté supprimée.')
      onClose()
      navigate('/decouvrir')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Suppression impossible.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <Modal
      wide
      className="community-manager"
      title={community ? 'Gérer la communauté' : 'Créer une communauté'}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      {community && loading && (
        <div
          className="community-loading"
          role="status"
          aria-label="Chargement des autorisations"
        >
          <span className="loading-spinner" aria-hidden="true" />
        </div>
      )}
      {accessError && (
        <p className="field-error" role="alert">
          {accessError}
          <button className="text-button" onClick={reload}>
            Réessayer
          </button>
        </p>
      )}
      {(!community || access) && (
        <>
          {community && (
            <nav
              className="tabs community-manager-tabs"
              aria-label="Gestion de la communauté"
            >
              {[
                ['settings', 'Paramètres', canEdit],
                ['members', 'Membres', canMembers],
                ['events', 'Événements', canEvents],
                ['danger', 'Suppression', access?.is_owner],
              ]
                .filter(([, , allowed]) => allowed)
                .map(([key, label]) => (
                  <button
                    key={String(key)}
                    className={tab === key ? 'active' : ''}
                    aria-pressed={tab === key}
                    onClick={() => {
                      setTab(String(key))
                      setError('')
                    }}
                  >
                    {label}
                  </button>
                ))}
            </nav>
          )}
          {tab === 'settings' && canEdit && (
            <form className="form-stack" onSubmit={save}>
              <div className="community-form-grid">
                <label className="field">
                  Nom *
                  <input
                    required
                    minLength={3}
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  Catégorie *
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as Community['category'])
                    }
                  >
                    {categories
                      .filter((value) => value !== 'Tout')
                      .map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                  </select>
                </label>
              </div>
              <label className="field">
                Description *
                <textarea
                  required
                  minLength={20}
                  maxLength={1000}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              {community ? (
                <>
                  <label className="field">
                    Image de couverture
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        setCoverFile(e.target.files?.[0] ?? null)
                        setRemoveCover(false)
                        setError('')
                      }}
                    />
                  </label>
                  {(community.coverUrl || coverFile) && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setRemoveCover(true)
                        setCoverFile(null)
                      }}
                    >
                      Rétablir la couverture par défaut
                    </button>
                  )}
                  {coverFile && <p className="small muted">{coverFile.name}</p>}
                </>
              ) : (
                <p className="small muted">
                  Tu pourras ajouter une couverture après la création.
                </p>
              )}
              <label className="field">
                Charte de la communauté
                <textarea
                  maxLength={4000}
                  rows={4}
                  placeholder="Une règle par ligne…"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                />
              </label>
              <fieldset className="community-resources-editor">
                <legend>Pour bien démarrer</legend>
                {resources.map((resource, index) => (
                  <div className="community-resource-editor" key={index}>
                    <label className="field">
                      Titre *
                      <input
                        required
                        maxLength={100}
                        value={resource.title}
                        onChange={(e) =>
                          setResources((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, title: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      Lien *
                      <input
                        required
                        type="url"
                        placeholder="https://…"
                        value={resource.url}
                        onChange={(e) =>
                          setResources((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, url: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      Description
                      <input
                        maxLength={300}
                        value={resource.description}
                        onChange={(e) =>
                          setResources((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, description: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setResources((rows) =>
                          rows.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Retirer ce lien
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary compact"
                  disabled={resources.length >= 6}
                  onClick={() =>
                    setResources((rows) => [
                      ...rows,
                      { title: '', description: '', url: '' },
                    ])
                  }
                >
                  Ajouter un lien
                </button>
              </fieldset>
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
              <button className="button" disabled={busy || !state.signedIn}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </form>
          )}
          {community && access && tab === 'members' && canMembers && (
            <CommunityMemberManagement community={community} access={access} />
          )}
          {community && tab === 'events' && canEvents && (
            <CommunityEventManagement community={community} />
          )}
          {community && tab === 'danger' && access?.is_owner && (
            <div className="form-stack">
              <h3>Supprimer {community.name}</h3>
              <p>
                Supprime une communauté vide. Retire ses publications et
                événements avant de continuer. La suppression de la communauté
                est définitive.
              </p>
              <label className="field">
                Recopie « {community.name} » pour confirmer
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button community-danger"
                disabled={busy || confirmation !== community.name}
                onClick={() => void remove()}
              >
                {busy
                  ? 'Suppression…'
                  : 'Supprimer définitivement la communauté'}
              </button>
            </div>
          )}
          {community && !canEdit && !canMembers && !canEvents && (
            <p className="muted">
              Tu ne disposes pas d’une autorisation de gestion pour cette
              communauté.
            </p>
          )}
        </>
      )}
    </Modal>
  )
}

async function prepareCover(file: File) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error('Choisis une image JPG, PNG ou WebP de 5 Mo maximum.')
  const image = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    const ratio = Math.min(1, 1600 / image.width)
    canvas.width = Math.max(1, Math.round(image.width * ratio))
    canvas.height = Math.max(1, Math.round(image.height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Impossible de préparer cette image.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('Image illisible.')),
        'image/jpeg',
        0.88,
      ),
    )
  } finally {
    image.close()
  }
}

function CommunityMemberManagement({
  community,
  access,
}: {
  community: Community
  access: CommunityAccess
}) {
  const { remote, notify } = useDemo()
  const [rows, setRows] = useState<CommunityMemberRow[]>([])
  const [query, setQuery] = useState('')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<CommunityMemberRow | null>(null)
  const [permissions, setPermissions] = useState<CommunityPermission[]>([])
  const [role, setRole] = useState<'member' | 'moderator'>('moderator')
  const [removing, setRemoving] = useState<CommunityMemberRow | null>(null)
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  const generation = useRef(0)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const path = `/communities/${community.id}/members?limit=50&q=${encodeURIComponent(query.trim())}`
  useEffect(() => {
    let cancelled = false
    generation.current += 1
    setLoading(true)
    setRows([])
    setError('')
    const timer = window.setTimeout(() => {
      api<CommunityMemberRow[]>(path)
        .then((result) => {
          if (!cancelled) {
            setRows(result)
            setMore(result.length === 50)
          }
        })
        .catch((cause) => {
          if (!cancelled)
            setError(
              cause instanceof Error
                ? cause.message
                : 'Impossible de charger les membres.',
            )
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [path, revision])
  async function loadMore() {
    if (loading) return
    setLoading(true)
    const version = generation.current
    try {
      const result = await api<CommunityMemberRow[]>(
        path + `&offset=${rows.length}`,
      )
      if (alive.current && generation.current === version) {
        setRows((previous) => [
          ...previous,
          ...result.filter(
            (item) => !previous.some((row) => row.user_id === item.user_id),
          ),
        ])
        setMore(result.length === 50)
      }
    } catch (cause) {
      if (alive.current && generation.current === version)
        setError(
          cause instanceof Error ? cause.message : 'Chargement impossible.',
        )
    } finally {
      if (alive.current && generation.current === version) setLoading(false)
    }
  }
  async function mutate(removeMember = false) {
    const member = removeMember ? removing : selected
    if (!remote || !member || busy) return
    setBusy(true)
    setError('')
    try {
      await remote.request(
        `/communities/${community.id}/members/${member.user_id}`,
        removeMember ? 'DELETE' : 'PATCH',
        removeMember
          ? undefined
          : { role, permissions: role === 'moderator' ? permissions : [] },
      )
      setSelected(null)
      setRemoving(null)
      setRevision((value) => value + 1)
      await remote.refresh().catch(() => {})
      notify(removeMember ? 'Membre retiré.' : 'Autorisations enregistrées.')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Modification impossible.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="form-stack">
      <label className="field">
        Rechercher un membre
        <input
          type="search"
          maxLength={80}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom ou nom d’utilisateur…"
        />
      </label>
      {rows.map((member) => (
        <div className="community-managed-member" key={member.user_id}>
          <Avatar
            initials={initials(
              member.profile?.full_name || member.profile?.username || '?',
            )}
            imageUrl={member.profile?.avatar_url}
          />
          <div className="grow">
            {member.profile && (
              <Link to={profilePath('@' + member.profile.username)}>
                {member.profile.full_name || member.profile.username}
              </Link>
            )}
            <p className="small muted">
              {member.role === 'owner'
                ? 'Propriétaire'
                : member.role === 'moderator'
                  ? 'Modérateur'
                  : 'Membre'}
            </p>
          </div>
          {member.role !== 'owner' && (
            <div className="row wrap">
              {access.is_owner && (
                <button
                  className="text-button small"
                  onClick={() => {
                    setSelected(member)
                    setRole(
                      member.role === 'moderator' ? 'moderator' : 'member',
                    )
                    setPermissions(member.permissions ?? [])
                    setError('')
                  }}
                >
                  Autorisations
                </button>
              )}
              {(access.is_owner || member.role === 'member') && (
                <button
                  className="text-button small"
                  onClick={() => {
                    setRemoving(member)
                    setError('')
                  }}
                >
                  Retirer
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      {loading && (
        <div
          role="status"
          aria-label="Chargement des membres"
          className="community-loading"
        >
          <span className="loading-spinner" aria-hidden="true" />
        </div>
      )}
      {!loading && !rows.length && (
        <p className="muted">Aucun membre trouvé.</p>
      )}
      {error && !selected && !removing && (
        <p role="alert" className="field-error">
          {error}
          <button
            className="text-button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Réessayer
          </button>
        </p>
      )}
      {more && (
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void loadMore()}
        >
          Afficher plus de membres
        </button>
      )}
      {selected && access.is_owner && (
        <Modal
          title="Autorisations du membre"
          onClose={() => {
            if (!busy) setSelected(null)
          }}
        >
          <div className="form-stack">
            <strong>
              {selected.profile?.full_name || selected.profile?.username}
            </strong>
            <label className="field">
              Rôle
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'member' | 'moderator')
                }
              >
                <option value="member">Membre</option>
                <option value="moderator">Modérateur</option>
              </select>
            </label>
            {role === 'moderator' &&
              (
                Object.entries(permissionLabels) as [
                  CommunityPermission,
                  string,
                ][]
              ).map(([key, label]) => (
                <label className="checkbox-label" key={key}>
                  <input
                    type="checkbox"
                    checked={permissions.includes(key)}
                    onChange={(e) =>
                      setPermissions((values) =>
                        e.target.checked
                          ? [...values, key]
                          : values.filter((value) => value !== key),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <button
              className="button"
              disabled={busy}
              onClick={() => void mutate()}
            >
              {busy ? 'Enregistrement…' : 'Enregistrer les autorisations'}
            </button>
          </div>
        </Modal>
      )}
      {removing && (
        <Modal
          title="Retirer ce membre ?"
          onClose={() => {
            if (!busy) setRemoving(null)
          }}
        >
          <p>
            {removing.profile?.full_name || removing.profile?.username} ne fera
            plus partie de {community.name}.
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="row mt-4">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Annuler
            </button>
            <button
              className="button community-danger"
              disabled={busy}
              onClick={() => void mutate(true)}
            >
              {busy ? 'Suppression…' : 'Retirer le membre'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CommunityEventManagement({ community }: { community: Community }) {
  const { remote, notify, liveEvents } = useDemo()
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [editing, setEditing] = useState<CommunityEvent | 'new' | null>(null)
  const [removing, setRemoving] = useState<CommunityEvent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const generation = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    generation.current += 1
    setLoading(true)
    api<EventRow[]>(
      `/events?community_id=${community.id}&limit=100&include_past=true`,
    )
      .then((rows) => {
        if (!cancelled) {
          setEvents(rows.map(toEvent))
          setMore(rows.length === 100)
          setError('')
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
  }, [community.id, liveEvents, revision])
  async function loadMore() {
    if (loading) return
    setLoading(true)
    const version = generation.current
    try {
      const rows = await api<EventRow[]>(
        `/events?community_id=${community.id}&limit=100&include_past=true&offset=${events.length}`,
      )
      if (!alive.current || generation.current !== version) return
      setEvents((previous) => [
        ...previous,
        ...rows
          .map(toEvent)
          .filter((event) => !previous.some((item) => item.id === event.id)),
      ])
      setMore(rows.length === 100)
    } catch (cause) {
      if (alive.current && generation.current === version)
        setError(
          cause instanceof Error ? cause.message : 'Chargement impossible.',
        )
    } finally {
      if (alive.current && generation.current === version) setLoading(false)
    }
  }
  async function remove() {
    if (!remote || !removing || busy) return
    setBusy(true)
    setError('')
    try {
      await remote.request(`/events/${removing.id}`, 'DELETE')
      await remote.refresh().catch(() => {})
      setRemoving(null)
      notify('Événement supprimé.')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Suppression impossible.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="form-stack">
      <button className="button" onClick={() => setEditing('new')}>
        Organiser un événement
      </button>
      {!loading && !error && !events.length && (
        <p className="muted">Aucun événement pour le moment.</p>
      )}
      {events.map((event) => (
        <article className="community-managed-event" key={event.id}>
          <div>
            <h3>{event.title}</h3>
            <p className="small muted">
              {event.date} · {event.time}
            </p>
          </div>
          <div className="row wrap">
            <button className="text-button" onClick={() => setEditing(event)}>
              Modifier
            </button>
            <button
              className="text-button"
              onClick={() => {
                setError('')
                setRemoving(event)
              }}
            >
              Supprimer
            </button>
          </div>
        </article>
      ))}
      {loading && (
        <div
          className="community-loading"
          role="status"
          aria-label="Chargement des événements"
        >
          <span className="loading-spinner" aria-hidden="true" />
        </div>
      )}
      {error && !removing && (
        <p className="field-error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Réessayer
          </button>
        </p>
      )}
      {more && (
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void loadMore()}
        >
          Afficher plus d’événements
        </button>
      )}
      {editing && (
        <CommunityEventEditor
          community={community}
          event={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <Modal
          title="Supprimer cet événement ?"
          onClose={() => {
            if (!busy) setRemoving(null)
          }}
        >
          <p>« {removing.title} » et ses inscriptions seront supprimés.</p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="row mt-4">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Annuler
            </button>
            <button
              className="button community-danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? 'Suppression…' : 'Supprimer l’événement'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
