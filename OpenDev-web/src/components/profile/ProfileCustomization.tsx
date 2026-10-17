import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../common/Modal'
import { useDemo } from '../../state/store'
import { supabase } from '../../lib/supabase'
import { ApiError } from '../../lib/api'
import { parseSkills } from './skills'

export function SkillsEditor({ onClose }: { onClose: () => void }) {
  const { state, update, remote, notify } = useDemo()
  const [value, setValue] = useState(state.profile.tags?.join(', ') ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    try {
      const tags = parseSkills(value)
      setBusy(true)
      if (remote) {
        await remote.request('/profiles/me', 'PATCH', { tags })
        await remote.refresh()
      } else
        update((previous) => ({
          ...previous,
          profile: { ...previous.profile, tags },
        }))
      notify('Compétences mises à jour.')
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Enregistrement impossible.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Modifier ma stack et mes compétences"
      onClose={busy ? () => {} : onClose}
    >
      <form className="form-stack" onSubmit={save} aria-busy={busy}>
        <label className="field">
          Stack et compétences
          <textarea
            autoFocus
            rows={3}
            maxLength={418}
            value={value}
            disabled={busy}
            placeholder="TypeScript, React, Python…"
            onChange={(event) => setValue(event.target.value)}
            aria-describedby="skills-help"
          />
          <small id="skills-help" className="muted">
            Sépare les compétences par une virgule. 10 maximum, 40 caractères
            par compétence.
          </small>
        </label>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Annuler
          </button>
          <button className="button" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function CoverEditor({ onClose }: { onClose: () => void }) {
  const { state, update, remote, notify } = useDemo()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(state.profile.coverUrl ?? '')
  const [remove, setRemove] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    return () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function choose(selected?: File) {
    if (!selected) return
    setError('')
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) ||
      selected.size > 5 * 1024 * 1024
    ) {
      setError('Choisis une image JPG, PNG ou WebP de 5 Mo maximum.')
      return
    }
    setRemove(false)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || (!file && !remove)) return
    setBusy(true)
    setError('')
    let uploadedPath: string | undefined
    let persisted = false
    try {
      let coverUrl: string | undefined
      if (file && !remove) {
        // Decode and resize before upload: no SVG or original image metadata is retained.
        const image = await createImageBitmap(file).catch(() => {
          throw new Error(
            'Cette image est illisible. Choisis un autre fichier.',
          )
        })
        try {
          const canvas = document.createElement('canvas')
          const ratio = Math.min(1, 1800 / image.width, 900 / image.height)
          canvas.width = Math.max(1, Math.round(image.width * ratio))
          canvas.height = Math.max(1, Math.round(image.height * ratio))
          const context = canvas.getContext('2d')
          if (!context)
            throw new Error('Cette image ne peut pas être préparée.')
          context.fillStyle = '#ffffff'
          context.fillRect(0, 0, canvas.width, canvas.height)
          context.drawImage(image, 0, 0, canvas.width, canvas.height)
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (result) =>
                result
                  ? resolve(result)
                  : reject(new Error('Image non valide.')),
              'image/jpeg',
              0.88,
            ),
          )
          if (remote) {
            if (!supabase) throw new Error('Le stockage est indisponible.')
            const { data, error: sessionError } =
              await supabase.auth.getSession()
            if (
              sessionError ||
              !data.session ||
              data.session.user.id !== state.profile.id
            )
              throw new Error('Reconnecte-toi pour modifier ta couverture.')
            const path = `${data.session.user.id}/${crypto.randomUUID()}.jpg`
            const { error: uploadError } = await supabase.storage
              .from('profile-covers')
              .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
            if (uploadError)
              throw new Error('L’image n’a pas pu être envoyée. Réessaie.')
            uploadedPath = path
            coverUrl = supabase.storage
              .from('profile-covers')
              .getPublicUrl(path).data.publicUrl
          } else {
            coverUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(String(reader.result))
              reader.onerror = () =>
                reject(new Error('Lecture de l’image impossible.'))
              reader.readAsDataURL(blob)
            })
          }
        } finally {
          image.close()
        }
      }
      if (remote) {
        await remote.request('/profiles/me', 'PATCH', {
          cover_url: coverUrl ?? null,
        })
        persisted = true
        await remote.refresh()
      } else
        update((previous) => ({
          ...previous,
          profile: { ...previous.profile, coverUrl },
        }))
      notify(remove ? 'Couverture retirée.' : 'Couverture mise à jour.')
      onClose()
    } catch (cause) {
      // A transport failure may hide a successful database write. Only remove
      // the new object when the API explicitly rejected the profile update.
      if (
        uploadedPath &&
        !persisted &&
        supabase &&
        cause instanceof ApiError &&
        cause.status < 500
      )
        await supabase.storage
          .from('profile-covers')
          .remove([uploadedPath])
          .catch(() => {})
      setError(
        cause instanceof Error ? cause.message : 'Enregistrement impossible.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Modifier ma couverture" onClose={busy ? () => {} : onClose}>
      <form className="form-stack" onSubmit={save} aria-busy={busy}>
        <div className="profile-cover-preview">
          {preview && !remove ? (
            <img src={preview} alt="Aperçu de la couverture" />
          ) : (
            <span>Ta couverture OpenDev</span>
          )}
        </div>
        <label className="field">
          Choisir une image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              choose(event.target.files?.[0])
              event.target.value = ''
            }}
            aria-describedby="cover-help"
          />
          <small id="cover-help" className="muted">
            JPG, PNG ou WebP · 5 Mo maximum. L’image sera centrée et recadrée.
            Ta couverture est visible sur ton profil public.
          </small>
        </label>
        {(state.profile.coverUrl || file) && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setFile(null)
              setPreview('')
              setRemove(true)
              setError('')
            }}
          >
            Retirer la couverture
          </button>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Annuler
          </button>
          <button className="button" disabled={busy || (!file && !remove)}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
