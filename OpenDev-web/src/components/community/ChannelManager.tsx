import { useRef, useState, type FormEvent } from 'react'
import type { CommunityChannel } from '../../types/channel'
import { useDemo } from '../../state/store'
import { Modal } from '../common/Modal'
import { ApiError } from '../../lib/api'

type Action = 'archive' | 'restore' | 'delete'
const emptyDraft = {
  name: '',
  description: '',
  position: 0,
  is_read_only: false,
}

export function ChannelManager({
  communityId,
  channels,
  onChanged,
  onClose,
}: {
  communityId: string
  channels: CommunityChannel[]
  onChanged: (deletedId?: string) => Promise<void>
  onClose: () => void
}) {
  const { remote, notify } = useDemo()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [confirmation, setConfirmation] = useState<{
    channel: CommunityChannel
    action: Action
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const base = `/communities/${communityId}/channels`

  async function mutate(
    action: () => Promise<unknown>,
    message: string,
    deletedId?: string,
    conflictMessage?: string,
  ) {
    if (!remote || pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await action()
      setConfirmation(null)
      setEditing(null)
      setDraft(emptyDraft)
      notify(message)
      await onChanged(deletedId).catch(() =>
        setError(
          'La modification est enregistrée. Ferme puis rouvre la gestion pour actualiser les canaux.',
        ),
      )
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409 && conflictMessage
          ? conflictMessage
          : cause instanceof Error
            ? cause.message
            : 'La modification n’a pas pu être enregistrée.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!remote || !draft.name.trim()) return
    await mutate(
      () =>
        remote.request(
          editing ? `${base}/${editing}` : base,
          editing ? 'PATCH' : 'POST',
          {
            ...draft,
            name: draft.name.trim(),
            description: draft.description.trim(),
          },
        ),
      editing ? 'Canal mis à jour.' : 'Canal créé.',
      undefined,
      'Ce nom est déjà utilisé ou la limite de 50 canaux actifs est atteinte. Modifie le nom ou archive un canal inutilisé.',
    )
  }

  return (
    <Modal
      title="Gérer les canaux"
      wide
      onClose={() => {
        if (!busy) onClose()
      }}
      className="channel-manager"
    >
      <p className="muted">
        Organise les échanges par sujet. Le canal par défaut reste disponible
        dans la communauté.
      </p>
      <ul className="channel-manager-list">
        {channels.map((channel) => (
          <li key={channel.id}>
            <div className="grow">
              <strong># {channel.name}</strong>
              <small className="muted">
                {channel.is_default
                  ? 'Canal par défaut'
                  : channel.archived_at
                    ? 'Archivé'
                    : 'Actif'}
                {channel.is_read_only ? ' · Lecture seule' : ''}
              </small>
            </div>
            <div className="channel-manager-actions">
              <button
                type="button"
                className="button secondary compact"
                disabled={busy}
                onClick={() => {
                  setEditing(channel.id)
                  setDraft({
                    name: channel.name,
                    description: channel.description,
                    position: channel.position,
                    is_read_only: channel.is_read_only,
                  })
                  setConfirmation(null)
                  setError('')
                }}
              >
                Modifier
              </button>
              {!channel.is_default && (
                <>
                  <button
                    type="button"
                    className="text-button small"
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setConfirmation({
                        channel,
                        action: channel.archived_at ? 'restore' : 'archive',
                      })
                    }}
                  >
                    {channel.archived_at ? 'Restaurer' : 'Archiver'}
                  </button>
                  <button
                    type="button"
                    className="text-button small danger-action"
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setConfirmation({ channel, action: 'delete' })
                    }}
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {confirmation ? (
        <section
          className="channel-action-confirmation"
          aria-label="Confirmer la modification du canal"
        >
          <h3>
            {confirmation.action === 'delete'
              ? 'Supprimer'
              : confirmation.action === 'archive'
                ? 'Archiver'
                : 'Restaurer'}{' '}
            #{confirmation.channel.name} ?
          </h3>
          <p className="muted">
            {confirmation.action === 'delete'
              ? 'Seul un canal sans publication peut être supprimé. Cette action est définitive.'
              : confirmation.action === 'archive'
                ? 'Les publications restent consultables dans les archives. Aucune nouvelle publication ne pourra y être ajoutée.'
                : 'Le canal retrouvera sa place parmi les canaux actifs.'}
          </p>
          <div className="row mt-4">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Annuler
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => {
                const { channel, action } = confirmation
                if (!remote) return
                void mutate(
                  () =>
                    remote.request(
                      `${base}/${channel.id}`,
                      action === 'delete' ? 'DELETE' : 'PATCH',
                      action === 'delete'
                        ? undefined
                        : { archived: action === 'archive' },
                    ),
                  action === 'delete'
                    ? 'Canal supprimé.'
                    : action === 'archive'
                      ? 'Canal archivé.'
                      : 'Canal restauré.',
                  action === 'delete' ? channel.id : undefined,
                  action === 'delete'
                    ? 'Ce canal contient des publications ou est le canal par défaut. Archive-le pour conserver son historique.'
                    : 'Cette modification est impossible. Actualise les canaux puis réessaie.',
                )
              }}
            >
              {busy ? 'Enregistrement…' : 'Confirmer'}
            </button>
          </div>
        </section>
      ) : (
        <form
          className="form-stack channel-manager-form"
          onSubmit={(event) => void save(event)}
          aria-busy={busy}
        >
          <h3>{editing ? 'Modifier le canal' : 'Nouveau canal'}</h3>
          <label className="field">
            <span>
              Nom <span aria-hidden="true">*</span>
            </span>
            <input
              required
              maxLength={50}
              value={draft.name}
              disabled={busy}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label className="field">
            Description (facultatif)
            <textarea
              rows={2}
              maxLength={240}
              value={draft.description}
              disabled={busy}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </label>
          <label className="field">
            Ordre d’affichage
            <input
              type="number"
              required
              min={0}
              max={1000}
              step={1}
              value={draft.position}
              disabled={busy}
              onChange={(event) =>
                setDraft({ ...draft, position: Number(event.target.value) })
              }
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={draft.is_read_only}
              disabled={busy}
              onChange={(event) =>
                setDraft({ ...draft, is_read_only: event.target.checked })
              }
            />
            Lecture seule : publications réservées à l’équipe autorisée
          </label>
          <div className="row">
            {editing && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(null)
                  setDraft(emptyDraft)
                  setError('')
                }}
              >
                Annuler la modification
              </button>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? 'Enregistrement…'
                : editing
                  ? 'Enregistrer'
                  : 'Créer le canal'}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="field-error mt-4" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
