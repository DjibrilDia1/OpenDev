export function AccountTypeField({
  value,
  onChange,
  disabled = false,
}: {
  value: 'individual' | 'company'
  onChange: (value: 'individual' | 'company') => void
  disabled?: boolean
}) {
  return (
    <label className="field">
      <span>
        Type de compte <span aria-hidden="true">*</span>
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value === 'company' ? 'company' : 'individual')
        }
      >
        <option value="individual">Particulier</option>
        <option value="company">Entreprise</option>
      </select>
    </label>
  )
}
