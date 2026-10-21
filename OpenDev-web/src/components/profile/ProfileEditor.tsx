import { useState, type FormEvent } from 'react'
import { Modal } from '../common/Modal'
import { useDemo } from '../../state/store'
import type { Project } from '../../types'
import { parseSkills } from './skills'
import { UsernameField } from '../auth/UsernameField'
import { ApiError } from '../../lib/api'
import { AccountTypeField } from '../auth/AccountTypeField'
export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { state, update, notify, remote } = useDemo()
  const [profile, setProfile] = useState(() => ({
    ...state.profile,
    accountType: state.profile.accountType ?? 'individual',
    companyName: state.profile.companyName ?? '',
    firstName:
      state.profile.firstName ||
      (state.profile.accountType !== 'company'
        ? state.profile.name.split(/\s+/)[0]
        : '') ||
      '',
    lastName:
      state.profile.lastName ||
      (state.profile.accountType !== 'company'
        ? state.profile.name.split(/\s+/).slice(1).join(' ')
        : ''),
  }))
  const isCompany = profile.accountType === 'company'
  const displayName = isCompany
    ? profile.companyName.trim()
    : `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim()
  const [username, setUsername] = useState(
    state.profile.handle.replace(/^@/, '').toLowerCase(),
  )
  const [tags, setTags] = useState(state.profile.tags?.join(', ') ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    let skills: string[]
    try {
      skills = parseSkills(tags)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Vérifie les compétences.',
      )
      return
    }
    if (
      !displayName ||
      (!isCompany && (!profile.firstName.trim() || !profile.lastName.trim())) ||
      !profile.roleTitle.trim()
    ) {
      setError(
        isCompany
          ? 'Renseigne le nom de ton entreprise et son activité.'
          : 'Renseigne ton prénom, ton nom et ton métier.',
      )
      return
    }
    if (remote) {
      setBusy(true)
      try {
        const { available } = await remote.request<{ available: boolean }>(
          '/me/username-availability?username=' + encodeURIComponent(username),
        )
        if (!available) {
          setError('Ce nom d’utilisateur est déjà pris. Choisis-en un autre.')
          return
        }
        await remote.request('/profiles/me', 'PATCH', {
          username,
          account_type: profile.accountType,
          company_name: isCompany ? profile.companyName.trim() : null,
          first_name: isCompany ? '' : profile.firstName.trim(),
          last_name: isCompany ? '' : profile.lastName.trim(),
          full_name: displayName,
          ...(isCompany ? { experience_level: '', company: '' } : {}),
          headline: profile.roleTitle.trim(),
          bio: profile.bio ?? '',
          location: profile.location ?? '',
          github_url: profile.githubUrl || null,
          website_url: profile.websiteUrl || null,
          tags: skills,
        })
        await remote.refresh()
      } catch (cause) {
        setError(
          cause instanceof ApiError && cause.status === 409
            ? 'Ce nom d’utilisateur est déjà pris. Choisis-en un autre.'
            : cause instanceof Error
              ? cause.message
              : 'Enregistrement impossible.',
        )
        return
      } finally {
        setBusy(false)
      }
    } else
      update((previous) => ({
        ...previous,
        profile: {
          ...profile,
          handle: '@' + username,
          name: displayName,
          companyName: isCompany ? profile.companyName.trim() : undefined,
          firstName: isCompany ? '' : profile.firstName.trim(),
          lastName: isCompany ? '' : profile.lastName.trim(),
          avatarInitials: displayName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase(),
          tags: skills,
        },
      }))
    notify('Profil mis à jour.')
    onClose()
  }
  return (
    <Modal title="Modifier le profil" onClose={busy ? () => {} : onClose}>
      <form className="form-stack" onSubmit={save} aria-busy={busy}>
        <fieldset className="profile-editor-fields" disabled={busy}>
          <AccountTypeField
            value={profile.accountType}
            onChange={(accountType) => setProfile({ ...profile, accountType })}
            disabled={busy}
          />
          <UsernameField
            value={username}
            onChange={setUsername}
            disabled={busy}
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {isCompany ? (
            <label className="field">
              Nom de l’entreprise <span aria-hidden="true">*</span>
              <input
                required
                name="name"
                autoComplete="organization"
                maxLength={100}
                value={profile.companyName}
                onChange={(event) =>
                  setProfile({ ...profile, companyName: event.target.value })
                }
              />
            </label>
          ) : (
            <>
              <label className="field">
                Prénom <span aria-hidden="true">*</span>
                <input
                  required
                  maxLength={50}
                  autoComplete="given-name"
                  value={profile.firstName}
                  onChange={(event) =>
                    setProfile({ ...profile, firstName: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Nom <span aria-hidden="true">*</span>
                <input
                  required
                  maxLength={50}
                  autoComplete="family-name"
                  value={profile.lastName}
                  onChange={(event) =>
                    setProfile({ ...profile, lastName: event.target.value })
                  }
                />
              </label>
            </>
          )}
          <label className="field">
            {isCompany ? 'Activité ou spécialité' : 'Ton métier'}{' '}
            <span aria-hidden="true">*</span>
            <input
              required
              name="role"
              maxLength={140}
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
              maxLength={418}
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
                  disabled={!!remote && field === 'linkedinUrl'}
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
              disabled={!!remote}
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
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Annuler
            </button>
            <button className="button" type="submit">
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </fieldset>
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
  const { update, notify, remote } = useDemo()
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
          if (remote) {
            setError(
              'La gestion des projets sera raccordée dans une prochaine étape.',
            )
            return
          }
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
