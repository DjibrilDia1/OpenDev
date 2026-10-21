import type { SignupProfile } from '../../types'
import { AccountTypeField } from './AccountTypeField'

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
      <AccountTypeField
        value={value.account_type ?? 'individual'}
        disabled={disabled}
        onChange={(account_type) =>
          onChange({
            ...value,
            account_type,
            company_name:
              account_type === 'company' ? value.company_name || '' : null,
          })
        }
      />
      <label className="field">
        {value.account_type === 'company'
          ? 'Nom de l’entreprise'
          : 'Nom complet'}
        <input
          name="full_name"
          autoComplete={
            value.account_type === 'company' ? 'organization' : 'name'
          }
          required
          maxLength={100}
          value={
            value.account_type === 'company'
              ? value.company_name || ''
              : value.full_name
          }
          disabled={disabled}
          onChange={(event) =>
            value.account_type === 'company'
              ? onChange({
                  ...value,
                  company_name: event.target.value,
                  full_name: event.target.value,
                })
              : change('full_name', event.target.value)
          }
        />
      </label>
      <label className="field">
        {value.account_type === 'company'
          ? 'Activité ou spécialité'
          : 'Métier ou spécialité'}
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
