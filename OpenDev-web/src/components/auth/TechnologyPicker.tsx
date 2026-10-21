import { useId, useState } from 'react'

export function TechnologyPicker({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { name: string; category: string }[]
  value: string[]
  onChange: (value: string[]) => void
  disabled: boolean
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const search = query.trim().toLocaleLowerCase()
  const filtered = search
    ? options.filter((item) => item.name.toLocaleLowerCase().includes(search))
    : []
  function add(name: string) {
    if (disabled) return
    if (value.includes(name)) {
      setQuery('')
      return
    }
    if (value.length >= 10) {
      setError('Tu peux choisir 10 technologies maximum.')
      return
    }
    onChange([...value, name])
    setQuery('')
    setError('')
  }
  return (
    <div className="setup-technologies">
      <label className="field" htmlFor={id}>
        <span>
          Stack et compétences <span aria-hidden="true">*</span>
        </span>
      </label>
      <div className="skills-input">
        {value.map((name) => (
          <span className="skill-chip" key={name}>
            <strong>{name}</strong>
            <button
              type="button"
              disabled={disabled}
              aria-label={'Retirer ' + name}
              onClick={() => onChange(value.filter((item) => item !== name))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={query}
          disabled={disabled}
          autoComplete="off"
          placeholder="Rechercher une technologie…"
          onChange={(event) => {
            setQuery(event.target.value)
            setError('')
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
            event.preventDefault()
            const exact = options.find(
              (item) =>
                item.name.toLocaleLowerCase() ===
                query.trim().toLocaleLowerCase(),
            )
            const match =
              exact || (filtered.length === 1 ? filtered[0] : undefined)
            if (match) add(match.name)
            else
              setError(
                query.trim()
                  ? 'Choisis une technologie dans les résultats ci-dessous.'
                  : 'Saisis une technologie ou sélectionne-la ci-dessous.',
              )
          }}
        />
      </div>
      <p className="small muted" role="status">
        {value.length}/10 sélectionnées · Entrée pour ajouter une technologie.
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {search && (
        <div
          className="setup-technology-options"
          aria-label="Technologies correspondantes"
        >
          {filtered.map((item) => (
            <button
              key={item.name}
              type="button"
              disabled={
                disabled || (!value.includes(item.name) && value.length >= 10)
              }
              aria-pressed={value.includes(item.name)}
              onClick={() =>
                value.includes(item.name)
                  ? onChange(value.filter((name) => name !== item.name))
                  : add(item.name)
              }
            >
              <strong>{item.name}</strong>
              <small>{item.category}</small>
              {value.includes(item.name) && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
      {search && !filtered.length && (
        <p className="muted" role="status">
          Aucune technologie ne correspond. Essaie un autre nom.
        </p>
      )}
    </div>
  )
}
