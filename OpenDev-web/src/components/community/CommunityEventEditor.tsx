import { useRef, useState, type FormEvent } from 'react'
import { Modal } from '../common/Modal'
import { useDemo } from '../../state/store'
import type { Community } from '../../types'
import type { CommunityEvent } from '../../types/event'
import './community-management.css'

function localDate(value: Date) {
  const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 16)
}
export function CommunityEventEditor({
  community,
  event,
  onClose,
  onSaved,
}: {
  community: Community
  event?: CommunityEvent
  onClose: () => void
  onSaved?: () => void
}) {
  const { remote, notify } = useDemo()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(18, 0, 0, 0)
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [start, setStart] = useState(
    localDate(event?.startsAt ? new Date(event.startsAt) : tomorrow),
  )
  const [end, setEnd] = useState(
    event?.endsAt
      ? localDate(new Date(event.endsAt))
      : localDate(new Date(tomorrow.getTime() + 3600000)),
  )
  const [format, setFormat] = useState<'online' | 'in_person'>(
    event?.format ?? 'online',
  )
  const [location, setLocation] = useState(event?.location ?? '')
  const [url, setUrl] = useState(event?.registrationUrl ?? '')
  const [capacity, setCapacity] = useState(
    event?.capacity == null ? '' : String(event.capacity),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  async function save(submit: FormEvent) {
    submit.preventDefault()
    if (!remote || pending.current) return
    const starts = new Date(start)
    const ends = new Date(end)
    if (Number.isNaN(starts.getTime()) || starts <= new Date()) {
      setError('Choisis une date et une heure de début futures.')
      return
    }
    if (Number.isNaN(ends.getTime()) || ends <= starts) {
      setError('La fin doit être après le début de l’événement.')
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await remote.request(
        event ? `/events/${event.id}` : '/events',
        event ? 'PATCH' : 'POST',
        {
          community_id: community.id,
          title: title.trim(),
          description: description.trim(),
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          format,
          location: location.trim(),
          registration_url: url.trim() || null,
          capacity: capacity ? Number(capacity) : null,
        },
      )
      await remote
        .refresh()
        .catch(() =>
          notify(
            'Événement enregistré. Actualise la page si le calendrier tarde à se mettre à jour.',
          ),
        )
      notify('Événement enregistré.')
      onSaved?.()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Impossible d’enregistrer cet événement.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <Modal
      wide
      title={event ? 'Modifier l’événement' : 'Organiser un événement'}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form className="form-stack community-event-editor" onSubmit={save}>
        <p className="muted">{community.name}</p>
        <label className="field">
          Titre *
          <input
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          Description *
          <textarea
            required
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="community-form-grid">
          <label className="field">
            Début *
            <input
              type="datetime-local"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="field">
            Fin *
            <input
              type="datetime-local"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <p className="muted small">
          Heures dans ton fuseau horaire :{' '}
          {Intl.DateTimeFormat().resolvedOptions().timeZone}.
        </p>
        <div className="community-form-grid">
          <label className="field">
            Format *
            <select
              value={format}
              onChange={(e) =>
                setFormat(e.target.value as 'online' | 'in_person')
              }
            >
              <option value="online">En ligne</option>
              <option value="in_person">En présentiel</option>
            </select>
          </label>
          <label className="field">
            Nombre de places
            <input
              type="number"
              min={1}
              max={100000}
              step={1}
              placeholder="Sans limite"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          {format === 'online' ? 'Lien de la rencontre ou lieu' : 'Lieu'} *
          <input
            required
            maxLength={200}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label className="field">
          Lien d’information ou d’inscription externe
          <input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer l’événement'}
        </button>
      </form>
    </Modal>
  )
}
