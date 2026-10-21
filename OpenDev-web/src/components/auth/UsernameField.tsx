import { useEffect, useId, useState } from 'react'
import { api } from '../../lib/api'
import { useDemo } from '../../state/store'

import { isValidUsername, normalizeUsername } from '../../lib/username'

export function UsernameField({
  value,
  onChange,
  disabled = false,
  onAvailabilityChange,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  onAvailabilityChange?: (value: {
    username: string
    available: boolean
  }) => void
}) {
  const { remote } = useDemo()
  const live = !!remote
  const id = useId()
  const [result, setResult] = useState<{
    value: string
    message: string
    unavailable: boolean
    retry?: boolean
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [touched, setTouched] = useState(false)
  const valid = isValidUsername(value)
  useEffect(() => {
    onAvailabilityChange?.({
      username: value,
      available:
        valid && (!live || (result?.value === value && !result.unavailable)),
    })
  }, [result, value, valid, live, onAvailabilityChange])
  useEffect(() => {
    if (!valid || !live) return
    let cancelled = false
    const timer = setTimeout(() => {
      void api<{ available: boolean }>(
        '/me/username-availability?username=' + encodeURIComponent(value),
      )
        .then(({ available }) => {
          if (!cancelled)
            setResult({
              value,
              message: available
                ? 'Ce nom d’utilisateur est disponible.'
                : 'Ce nom d’utilisateur est déjà pris.',
              unavailable: !available,
            })
        })
        .catch(() => {
          if (!cancelled)
            setResult({
              value,
              message: 'Disponibilité impossible à vérifier. Réessaie.',
              unavailable: true,
              retry: true,
            })
        })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value, valid, live, attempt])
  return (
    <div className="field username-field">
      <label htmlFor={id + '-input'}>
        Nom d’utilisateur <span aria-hidden="true">*</span>
      </label>
      <div className="username-input">
        <span aria-hidden="true">@</span>
        <input
          id={id + '-input'}
          name="username"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          disabled={disabled}
          onBlur={() => {
            setTouched(true)
            onChange(value.trim())
          }}
          onChange={(event) => onChange(normalizeUsername(event.target.value))}
          aria-describedby={id}
          aria-invalid={
            valid && result?.value === value && result.unavailable
              ? true
              : undefined
          }
        />
      </div>
      <small
        id={id}
        role="status"
        className={
          valid && result?.value === value
            ? result.unavailable
              ? 'field-error'
              : 'field-success'
            : 'muted'
        }
      >
        {valid && live
          ? result?.value === value
            ? result.message
            : 'Vérification de la disponibilité…'
          : touched && !valid
            ? 'Choisis un nom de 30 caractères maximum, en minuscules.'
            : ''}
      </small>
      {result?.value === value && result.retry && (
        <button
          type="button"
          className="text-button"
          disabled={disabled}
          onClick={() => setAttempt((previous) => previous + 1)}
        >
          Revérifier la disponibilité
        </button>
      )}
    </div>
  )
}
