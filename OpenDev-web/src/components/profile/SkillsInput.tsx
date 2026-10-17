import { useId, useState } from 'react'
import { parseSkills } from './skills'

export function SkillsInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string[]
  onChange: (skills: string[]) => void
  disabled?: boolean
}) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  function add() {
    if (!draft.trim()) return
    try {
      onChange(parseSkills([...value, draft].join(',')))
      setDraft('')
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Compétence invalide.')
    }
  }
  return (
    <div className="field">
      <label htmlFor={id}>
        Stack et compétences <span className="muted">(facultatif)</span>
      </label>
      <div className="skills-input">
        {value.map((skill) => (
          <span className="skill-chip" key={skill}>
            <strong>{skill}</strong>
            <button
              type="button"
              aria-label={'Retirer ' + skill}
              disabled={disabled}
              onClick={() => onChange(value.filter((item) => item !== skill))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={disabled}
          name="skill"
          maxLength={40}
          placeholder={value.length ? 'Ajouter…' : 'React, TypeScript, Python…'}
          onChange={(event) => {
            setDraft(event.target.value)
            setError('')
          }}
          onBlur={add}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              add()
            }
          }}
          aria-describedby={id + '-help'}
        />
      </div>
      <small id={id + '-help'} className="muted">
        Appuie sur Entrée pour ajouter une compétence. {value.length}/10
      </small>
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  )
}
