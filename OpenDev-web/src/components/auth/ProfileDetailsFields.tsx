import type { SignupProfile } from '../../types'

export function ProfileDetailsFields({
  value,
  onChange,
  disabled = false,
}: {
  value: SignupProfile
  onChange: (profile: SignupProfile) => void
  disabled?: boolean
}) {
  function change(key: keyof SignupProfile, text: string) {
    onChange({ ...value, [key]: text })
  }
  return (
    <>
      <label className="field">
        Nom complet
        <input
          name="full_name"
          autoComplete="name"
          required
          maxLength={100}
          value={value.full_name}
          disabled={disabled}
          onChange={(event) => change('full_name', event.target.value)}
        />
      </label>
      <label className="field">
        Métier ou spécialité
        <input
          name="headline"
          autoComplete="organization-title"
          required
          maxLength={140}
          placeholder="Développeuse web, étudiant en informatique…"
          value={value.headline}
          disabled={disabled}
          onChange={(event) => change('headline', event.target.value)}
        />
      </label>
      <label className="field">
        Bio (facultatif)
        <textarea
          name="bio"
          rows={3}
          maxLength={1000}
          value={value.bio}
          disabled={disabled}
          onChange={(event) => change('bio', event.target.value)}
        />
      </label>
      <label className="field">
        Localisation (facultatif)
        <input
          name="location"
          autoComplete="address-level2"
          maxLength={100}
          value={value.location}
          disabled={disabled}
          onChange={(event) => change('location', event.target.value)}
        />
      </label>
    </>
  )
}
