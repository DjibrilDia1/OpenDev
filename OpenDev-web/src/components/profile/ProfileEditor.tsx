import { useState, type FormEvent } from 'react'
import { Modal } from '../common/Modal'
import { useDemo } from '../../state/store'
import type { Project } from '../../types'
export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { state, update, notify } = useDemo()
  const [profile, setProfile] = useState(state.profile)
  const [tags, setTags] = useState(state.profile.tags?.join(', ') ?? '')
  const [error, setError] = useState('')
  function save(event: FormEvent) {
    event.preventDefault()
    if (!profile.name.trim() || !profile.roleTitle.trim()) {
      setError('Renseigne ton nom et ton métier avec au moins un caractère.')
      return
    }
    update((previous) => ({
      ...previous,
      profile: {
        ...profile,
        name: profile.name.trim(),
        avatarInitials: profile.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join('')
          .toUpperCase(),
        tags: [
          ...new Set(
            tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ].slice(0, 10),
      },
    }))
    notify('Profil mis à jour.')
    onClose()
  }
  return (
    <Modal title="Un profil qui te ressemble" onClose={onClose}>
      <form className="form-stack" onSubmit={save}>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <label className="field">
          Nom
          <input
            required
            name="name"
            autoComplete="name"
            maxLength={60}
            value={profile.name}
            onChange={(event) =>
              setProfile({ ...profile, name: event.target.value })
            }
          />
        </label>
        <label className="field">
          Ton métier
          <input
            required
            name="role"
            maxLength={80}
            value={profile.roleTitle}
            onChange={(event) =>
              setProfile({ ...profile, roleTitle: event.target.value })
            }
          />
        </label>
        <label className="field">
          Bio
          <textarea
            name="bio"
            rows={3}
            maxLength={350}
            value={profile.bio ?? ''}
            onChange={(event) =>
              setProfile({ ...profile, bio: event.target.value })
            }
          />
        </label>
        <label className="field">
          Localisation <span className="muted">(facultatif)</span>
          <input
            name="location"
            autoComplete="address-level2"
            maxLength={80}
            value={profile.location ?? ''}
            onChange={(event) =>
              setProfile({ ...profile, location: event.target.value })
            }
          />
        </label>
        <label className="field">
          Stack et compétences
          <input
            name="skills"
            maxLength={200}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <small className="muted">
            Sépare les compétences par une virgule. 10 maximum.
          </small>
        </label>
        {(['githubUrl', 'websiteUrl', 'linkedinUrl'] as const).map(
          (field, i) => (
            <label className="field" key={field}>
              {['GitHub', 'Portfolio', 'LinkedIn'][i]}
              <input
                type="url"
                pattern="https?://.*"
                name={field}
                maxLength={240}
                value={profile[field] ?? ''}
                placeholder="https://…"
                onChange={(event) =>
                  setProfile({ ...profile, [field]: event.target.value })
                }
              />
            </label>
          ),
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={profile.isAvailableForCollab ?? false}
            onChange={(event) =>
              setProfile({
                ...profile,
                isAvailableForCollab: event.target.checked,
              })
            }
          />
          Disponible pour collaborer
        </label>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="button" type="submit">
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  )
}
export function ProjectEditor({
  project,
  onClose,
}: {
  project?: Project
  onClose: () => void
}) {
  const { update, notify } = useDemo()
  const [draft, setDraft] = useState<Project>(
    project ?? {
      id: crypto.randomUUID(),
      title: '',
      slug: '',
      description: '',
      tags: [],
      canManage: true,
    },
  )
  const [tags, setTags] = useState(project?.tags.join(', ') ?? '')
  const [error, setError] = useState('')
  return (
    <Modal
      title={project ? 'Modifier le projet' : 'Présenter un projet'}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault()
          if (!draft.title.trim() || !draft.description.trim()) {
            setError('Ajoute un nom et une description à ton projet.')
            return
          }
          const result = {
            ...draft,
            title: draft.title.trim(),
            tags: tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
              .slice(0, 6),
          }
          update((previous) => ({
            ...previous,
            projects: project
              ? previous.projects.map((item) =>
                  item.id === project.id ? result : item,
                )
              : [...previous.projects, result],
          }))
          notify('Projet enregistré.')
          onClose()
        }}
      >
        <label className="field">
          {error && (
            <span className="field-error" role="alert">
              {error}
            </span>
          )}
          Nom du projet
          <input
            required
            maxLength={80}
            name="project-name"
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
          />
        </label>
        <label className="field">
          Description
          <textarea
            required
            rows={4}
            name="description"
            maxLength={400}
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </label>
        <label className="field">
          Technologies
          <input
            value={tags}
            maxLength={160}
            name="tags"
            placeholder="React, Python…"
            onChange={(event) => setTags(event.target.value)}
          />
        </label>
        <label className="field">
          Dépôt GitHub
          <input
            type="url"
            pattern="https?://.*"
            name="repository"
            placeholder="https://github.com/…"
            value={draft.repoUrl ?? ''}
            onChange={(event) =>
              setDraft({ ...draft, repoUrl: event.target.value })
            }
          />
        </label>
        <label className="field">
          Démo en ligne
          <input
            type="url"
            pattern="https?://.*"
            name="demo"
            placeholder="https://…"
            value={draft.liveUrl ?? ''}
            onChange={(event) =>
              setDraft({ ...draft, liveUrl: event.target.value })
            }
          />
        </label>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="button">
            Enregistrer le projet
          </button>
        </div>
      </form>
    </Modal>
  )
}
