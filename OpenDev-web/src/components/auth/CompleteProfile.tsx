import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Modal } from '../common/Modal'
import { OpenDevLogo } from '../common/OpenDevLogo'
import { useCommunities, useDemo, usePeople } from '../../state/store'
import { interestScore } from '../../lib/recommendations'
import { UsernameField } from './UsernameField'
import { AvatarUploader } from './AvatarUploader'
import { TechnologyPicker } from './TechnologyPicker'
import { api, ApiError } from '../../lib/api'
import './onboarding.css'

const stages = ['Ton profil', 'Technologies', 'Centres d’intérêt', 'Communautés', 'Personnes', 'Prêt à découvrir']
type ProfileData = {
  first_name: string; last_name: string; full_name: string; username: string; headline: string
  bio: string; location: string; company: string; school: string; experience_level: string
  avatar_url: string | null; github_url: string | null; website_url: string | null
  tags: string[]; interests: string[]
}
type Catalog = { technologies: { name: string; category: string }[]; interests: string[] }
type Draft = { step: number; data: Partial<ProfileData> }
const validUrl = (value: string | null) => !value || /^https?:\/\/[^\s/]+(?:[^\s]*)$/.test(value)

export function CompleteProfile({ initialStep = 0, onClose }: { initialStep?: number; onClose?: () => void } = {}) {
  const { state, remote, notify } = useDemo()
  const communities = useCommunities()
  const people = usePeople()
  const editing = !!onClose && state.onboarded
  const [step, setStep] = useState(initialStep)
  const [data, setData] = useState<ProfileData>(() => {
    const handle = state.profile.handle.replace(/^@/, '')
    const name = state.profile.name.trim().split(/\s+/)
    return {
      first_name: state.profile.firstName || name[0] || '', last_name: state.profile.lastName || name.slice(1).join(' '),
      full_name: state.profile.name, username: /^(user[-_][a-f0-9]{12}|dev_[a-f0-9]{24})$/.test(handle) ? '' : handle,
      headline: state.profile.roleTitle || '', bio: state.profile.bio || '', location: state.profile.location || '',
      company: state.profile.company || '', school: state.profile.school || '', experience_level: state.profile.experienceLevel || '',
      avatar_url: state.profile.avatarUrl || null, github_url: state.profile.githubUrl || null, website_url: state.profile.websiteUrl || null,
      tags: state.profile.tags || [], interests: state.interests,
    }
  })
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [draftError, setDraftError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [availability, setAvailability] = useState({ username: '', available: false })
  const [joined, setJoined] = useState(state.joined)
  const [following, setFollowing] = useState(state.following)
  const heading = useRef<HTMLHeadingElement>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const finishing = useRef(false)
  const actionLock = useRef(false)
  const navigateLock = useRef(false)
  const lastSaved = useRef('')

  useEffect(() => {
    let cancelled = false
    Promise.all([api<Catalog>('/onboarding/catalog'), editing ? Promise.resolve(null) : api<Draft | null>('/me/onboarding')])
      .then(([options, draft]) => {
        if (cancelled) return
        setCatalog(options)
        if (draft) {
          setData(previous => {
            const restored = { ...previous }
            for (const key of Object.keys(previous) as (keyof ProfileData)[]) {
              const value = draft.data[key]
              if (value !== undefined && value !== null) Object.assign(restored, { [key]: value })
            }
            return restored
          })
          setStep(Math.max(0, Math.min(5, draft.step)))
        }
        setLoaded(true)
        setLoadError('')
      }).catch(() => { if (!cancelled) setLoadError('Impossible de charger ton parcours. Réessaie pour retrouver tes informations.') })
    return () => { cancelled = true }
  }, [editing, loadAttempt])

  function persist(snapshot: Draft) {
    if (editing || finishing.current) return Promise.resolve()
    const serialized = JSON.stringify(snapshot)
    if (lastSaved.current === serialized) return queue.current
    const pending = queue.current.catch(() => undefined).then(async () => {
      if (finishing.current) return
      await api('/me/onboarding', 'PUT', snapshot)
      lastSaved.current = serialized
      setDraftError('')
    })
    queue.current = pending
    return pending
  }
  useEffect(() => {
    if (!loaded || editing || saving) return
    const timer = setTimeout(() => {
      void persist({ step, data }).catch(() => setDraftError('Le brouillon n’a pas été enregistré. Vérifie ta connexion puis réessaie.'))
    }, 650)
    return () => clearTimeout(timer)
    // Each snapshot is serialized through the same queue; provider rerenders do not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, step, loaded, editing, saving])
  useEffect(() => {
    heading.current?.focus()
    heading.current?.closest('.onboarding-body')?.scrollTo(0, 0)
  }, [step, loaded])

  const identityValid = !!data.first_name.trim() && !!data.last_name.trim() && !!data.headline.trim() && /^[a-z0-9_.-]{3,30}$/.test(data.username) && availability.username === data.username && availability.available && validUrl(data.github_url) && validUrl(data.website_url)
  const tagsValid = data.tags.length > 0 && data.tags.every(tag => catalog?.technologies.some(item => item.name === tag))
  const interestsValid = data.interests.length > 0 && data.interests.every(topic => catalog?.interests.includes(topic))
  const ready = step === 0 ? identityValid : step === 1 ? tagsValid : step === 2 ? interestsValid : true
  const pending = saving || uploading || !!busyAction
  const set = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => setData(previous => ({ ...previous, [key]: value }))
  const suggestions = [...communities].sort((a, b) => interestScore(b.name + ' ' + b.description, [...data.interests, ...data.tags]) - interestScore(a.name + ' ' + a.description, [...data.interests, ...data.tags])).slice(0, 12)
  const recommendedPeople = people.filter(person => person.id !== state.profile.id).sort((a, b) => interestScore(b.roleTitle + ' ' + (b.tags || []).join(' '), [...data.interests, ...data.tags]) - interestScore(a.roleTitle + ' ' + (a.tags || []).join(' '), [...data.interests, ...data.tags])).slice(0, 12)

  async function move(next: number) {
    if (navigateLock.current || pending) return
    navigateLock.current = true
    setSaving(true); setError('')
    try { await persist({ step: next, data }); setStep(next) }
    catch { setError('Ta progression n’a pas pu être enregistrée. Réessaie.'); }
    finally { setSaving(false); navigateLock.current = false }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || !ready || navigateLock.current) return
    if (step < 5) { await move(step + 1); return }
    if (!tagsValid || !interestsValid) { setStep(!tagsValid ? 1 : 2); setError('Choisis au moins une technologie et un centre d’intérêt.'); return }
    navigateLock.current = true
    setSaving(true); setError('')
    try {
      await queue.current.catch(() => undefined)
      finishing.current = true
      const check = await api<{ available: boolean }>('/me/username-availability?username=' + encodeURIComponent(data.username))
      if (!check.available) { setStep(0); setAvailability({ username: data.username, available: false }); throw new Error('Ce nom d’utilisateur est déjà pris. Choisis-en un autre.') }
      await api('/profiles/me/onboarding', 'PUT', { ...data, first_name: data.first_name.trim(), last_name: data.last_name.trim(), full_name: `${data.first_name.trim()} ${data.last_name.trim()}`, github_url: data.github_url?.trim() || null, website_url: data.website_url?.trim() || null })
      await remote?.refresh()
      notify('Ton profil est prêt. Bienvenue sur OpenDev !')
      onClose?.()
    } catch (cause) {
      finishing.current = false
      if (cause instanceof ApiError && cause.status === 409) { setStep(0); setAvailability({ username: data.username, available: false }) }
      setError(cause instanceof ApiError && cause.status === 409 ? 'Ce nom d’utilisateur vient d’être pris. Choisis-en un autre.' : cause instanceof Error ? cause.message : 'Enregistrement impossible. Réessaie.')
    } finally { setSaving(false); navigateLock.current = false }
  }
  async function toggle(kind: 'community' | 'person', id: string, key: string) {
    if (actionLock.current || pending) return
    actionLock.current = true
    setBusyAction(id); setError('')
    const active = (kind === 'community' ? joined : following).includes(key)
    try {
      await api(kind === 'community' ? `/communities/${id}/members/me` : `/profiles/${id}/follow`, active ? 'DELETE' : kind === 'community' ? 'POST' : 'PUT')
      const update = (previous: string[]) => active ? previous.filter(value => value !== key) : [...previous, key]
      if (kind === 'community') setJoined(update); else setFollowing(update)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cette action n’a pas pu être enregistrée.') }
    finally { setBusyAction(''); actionLock.current = false }
  }
  function close() {
    if (pending) return
    if (editing) onClose?.()
    else setError('Termine ces étapes pour accéder à ton espace. Ta progression est conservée.')
  }
  function field(key: 'first_name' | 'last_name' | 'headline' | 'location' | 'company' | 'school' | 'github_url' | 'website_url', label: string, required = false, type = 'text', maxLength = 100) {
    return <label className="field">{label}<input name={key} value={data[key] || ''} type={type} required={required} maxLength={maxLength} disabled={pending} autoComplete={key === 'first_name' ? 'given-name' : key === 'last_name' ? 'family-name' : undefined} onChange={event => set(key, event.target.value)} /></label>
  }
  return <Modal title="Complète ton profil" hideTitle className="onboarding-modal setup-wizard" onClose={close}>
    <div className="onboarding-brand"><OpenDevLogo size={36} /></div>
    <p className="onboarding-title">Complète ton profil !</p>
    <ol className="profile-setup-progress" aria-label="Étapes du profil">{stages.map((label, index) => <li key={label} className={index <= step ? 'active' : ''} aria-current={index === step ? 'step' : undefined}><span aria-hidden="true">{index < step ? '✓' : index + 1}</span><span>{label}</span></li>)}</ol>
    {!loaded ? <div className="setup-load" role="status">{loadError ? <><p>{loadError}</p><button className="button" onClick={() => setLoadAttempt(value => value + 1)}>Réessayer</button></> : <><span className="platform-spinner" aria-hidden="true" /><span className="sr-only">Chargement du profil</span></>}</div> : <form onSubmit={submit} className="onboarding-form" aria-busy={pending}>
      <div className="onboarding-body">
        <h3 ref={heading} tabIndex={-1}>{stages[step]}</h3>
        {step === 0 && <><AvatarUploader userId={state.profile.id} value={data.avatar_url} onChange={url => set('avatar_url', url)} onBusyChange={setUploading} /><div className="onboarding-fields">
          <UsernameField value={data.username} onChange={value => set('username', value)} disabled={pending} onAvailabilityChange={setAvailability} />
          {field('headline', 'Métier ou spécialité', true, 'text', 140)}{field('first_name', 'Prénom', true)}{field('last_name', 'Nom', true)}{field('location', 'Localisation (facultatif)')}
          <label className="field">Expérience (facultatif)<select value={data.experience_level} onChange={event => set('experience_level', event.target.value)} disabled={pending}><option value="">Choisir</option><option value="student">Étudiant</option><option value="junior">Junior</option><option value="intermediate">Intermédiaire</option><option value="senior">Senior</option><option value="lead">Lead</option></select></label>
          {field('company', 'Entreprise (facultatif)')}{field('school', 'École (facultatif)')}
          <label className="field onboarding-full-row">Bio (facultatif)<textarea name="bio" rows={2} maxLength={1000} value={data.bio} disabled={pending} onChange={event => set('bio', event.target.value)} /></label>
          {field('github_url', 'GitHub (facultatif)', false, 'url', 240)}{field('website_url', 'Site web ou portfolio (facultatif)', false, 'url', 240)}
        </div>{!identityValid && <p className="muted setup-hint">Renseigne ton prénom, ton nom, ton métier et un nom d’utilisateur disponible pour continuer.{(!validUrl(data.github_url) || !validUrl(data.website_url)) && ' Les liens doivent commencer par https:// ou http://.'}</p>}</>}
        {step === 1 && <><p className="muted">Choisis de 1 à 10 technologies que tu utilises ou que tu souhaites apprendre.</p><TechnologyPicker options={catalog!.technologies} value={data.tags} onChange={tags => set('tags', tags)} disabled={pending} /></>}
        {step === 2 && <><p className="muted">Choisis de 1 à 8 thèmes pour personnaliser ton fil et tes suggestions.</p><div className="onboarding-topics">{catalog!.interests.map(topic => <button type="button" key={topic} aria-pressed={data.interests.includes(topic)} disabled={pending || (!data.interests.includes(topic) && data.interests.length >= 8)} onClick={() => set('interests', data.interests.includes(topic) ? data.interests.filter(item => item !== topic) : [...data.interests, topic])}>{topic}{data.interests.includes(topic) && ' ✓'}</button>)}</div><p className="muted" role="status">{data.interests.length}/8 thèmes sélectionnés</p></>}
        {step === 3 && <><p className="muted">Rejoins les espaces qui t’intéressent. Tu peux aussi passer cette étape.</p><div className="setup-suggestions">{suggestions.map(community => <article key={community.id}><div><strong>{community.name}</strong><p className="muted">{community.description}</p></div><button type="button" className={'button' + (joined.includes(community.slug) ? ' secondary' : '')} disabled={pending || community.ownerId === state.profile.id} onClick={() => void toggle('community', community.id, community.slug)}>{busyAction === community.id ? 'Enregistrement…' : joined.includes(community.slug) ? 'Quitter' : 'Rejoindre'}</button></article>)}</div>{!suggestions.length && <p className="muted">Aucune communauté disponible pour le moment. Tu pourras en découvrir ou en créer depuis ton espace.</p>}</>}
        {step === 4 && <><p className="muted">Suis des développeurs pour retrouver leurs publications. Cette étape est facultative.</p><div className="setup-suggestions">{recommendedPeople.map(person => <article key={person.id}><div><strong>{person.name}</strong><p className="muted">{person.roleTitle}</p><small>{(person.tags || []).join(' · ')}</small></div><button type="button" className={'button' + (following.includes(person.id) ? ' secondary' : '')} disabled={pending} onClick={() => void toggle('person', person.id, person.id)}>{busyAction === person.id ? 'Enregistrement…' : following.includes(person.id) ? 'Ne plus suivre' : 'Suivre'}</button></article>)}</div>{!recommendedPeople.length && <p className="muted">Il n’y a pas encore d’autres profils à suivre. Les nouveaux membres apparaîtront dans Découvrir.</p>}</>}
        {step === 5 && <div className="setup-summary"><h4>Ton espace est prêt, {data.first_name}.</h4><p>Ton fil tiendra compte de tes abonnements, de tes communautés et de tes centres d’intérêt.</p><dl><dt>Profil</dt><dd>{data.first_name} {data.last_name} · @{data.username}</dd><dt>Technologies</dt><dd>{data.tags.join(' · ')}</dd><dt>Centres d’intérêt</dt><dd>{data.interests.join(' · ')}</dd><dt>Ton réseau</dt><dd>{joined.length} communauté(s) · {following.length} abonnement(s)</dd></dl><p className="muted">Tu pourras modifier ces informations depuis ton profil.</p></div>}
        {error && <p className="field-error" role="alert">{error}</p>}
        {draftError && <div role="alert" className="field-error">{draftError} <button type="button" className="text-button" disabled={pending} onClick={() => void persist({ step, data }).catch(() => setDraftError('Connexion indisponible. Tes modifications restent dans cette fenêtre.'))}>Réessayer</button></div>}
      </div>
      <div className="onboarding-footer"><span className="muted">Étape {step + 1} sur {stages.length}</span><div className="row">{step > 0 && <button type="button" className="button secondary" disabled={pending} onClick={() => void move(step - 1)}>Retour</button>}<button className="button" type="submit" disabled={!ready || pending}>{saving ? 'Enregistrement…' : step === 5 ? 'Découvrir mon fil' : step === 3 || step === 4 ? 'Continuer' : 'Suivant'}</button></div></div>
    </form>}
  </Modal>
}
