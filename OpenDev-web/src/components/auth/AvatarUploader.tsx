import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function AvatarUploader({
  userId,
  value,
  onChange,
  onBusyChange,
  label = 'Photo de profil',
}: {
  userId: string
  value: string | null
  onChange: (url: string) => void
  onBusyChange: (busy: boolean) => void
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload(file?: File) {
    if (!file || busy) return
    setError('')
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('Choisis une image JPG, PNG ou WebP de 5 Mo maximum.')
      return
    }
    setBusy(true)
    onBusyChange(true)
    try {
      if (!supabase) throw new Error('Le stockage est indisponible.')
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.id !== userId)
        throw new Error('Reconnecte-toi pour ajouter ta photo.')
      const bitmap = await createImageBitmap(file)
      let blob: Blob
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Cette image ne peut pas être préparée.')
        const size = Math.min(bitmap.width, bitmap.height)
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, 512, 512)
        context.drawImage(
          bitmap,
          (bitmap.width - size) / 2,
          (bitmap.height - size) / 2,
          size,
          size,
          0,
          0,
          512,
          512,
        )
        blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (result) =>
              result ? resolve(result) : reject(new Error('Image illisible.')),
            'image/jpeg',
            0.88,
          ),
        )
      } finally {
        bitmap.close()
      }
      const path = `${userId}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (uploadError)
        throw new Error('La photo n’a pas pu être envoyée. Réessaie.')
      onChange(
        supabase.storage.from('profile-avatars').getPublicUrl(path).data
          .publicUrl,
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Photo impossible à envoyer.',
      )
    } finally {
      setBusy(false)
      onBusyChange(false)
    }
  }
  return (
    <div className="setup-avatar">
      <div className="setup-avatar-preview">
        {value ? (
          <img src={value} alt={label} />
        ) : (
          <span aria-hidden="true">＋</span>
        )}
      </div>
      <label className="field">
        {label} (facultatif)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            void upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <small className="muted">
          {busy ? 'Envoi de l’image…' : 'JPG, PNG ou WebP · 5 Mo maximum'}
        </small>
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
