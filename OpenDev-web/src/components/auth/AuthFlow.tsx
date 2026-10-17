import { useEffect, useRef, useState } from 'react'
import { Modal } from '../common/Modal'
import { GithubIcon } from '../common/Icons'
import { CommunityEmblem } from '../common/CommunityEmblem'
import { OpenDevLogo } from '../common/OpenDevLogo'
import { useDemo, toggleItem } from '../../state/store'
import { interests, relatedCommunities } from '../../state/catalog'
import googleLogo from '../../assets/icons/google-g.png'
import { EmailAuthPanel } from './EmailAuthPanel'
import { supabase } from '../../lib/supabase'
import { CompleteProfile } from './CompleteProfile'
import { authErrorMessage } from '../../lib/auth-errors'

function callbackError() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const code =
    query.get('error_code') ||
    hash.get('error_code') ||
    query.get('error') ||
    hash.get('error')
  return code ? authErrorMessage({ code }) : ''
}

export function AuthFlow() {
  const { state, update, authOpen, closeAuth, notify, remote } = useDemo()
  const [authError, setAuthError] = useState(callbackError)
  const [recovery, setRecovery] = useState(
    () =>
      new URLSearchParams(window.location.search).get('auth') === 'recovery',
  )
  const [emailBusy, setEmailBusy] = useState(false)
  const [provider, setProvider] = useState('')
  const refreshProviders = remote?.refreshProviders
  useEffect(() => {
    if (authOpen && refreshProviders)
      void refreshProviders().catch(() =>
        setAuthError(
          'La disponibilité des connexions sociales ne peut pas être vérifiée. Réessaie.',
        ),
      )
  }, [authOpen, refreshProviders])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    if (
      !url.searchParams.has('error') &&
      !url.searchParams.has('error_code') &&
      !hash.has('error') &&
      !hash.has('error_code')
    )
      return
    for (const key of ['error', 'error_code', 'error_description']) {
      url.searchParams.delete(key)
      hash.delete(key)
    }
    url.hash = hash.toString()
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }, [])
  function clearRecovery() {
    const url = new URL(window.location.href)
    url.searchParams.delete('auth')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    setRecovery(false)
  }
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        const url = new URL(window.location.href)
        url.searchParams.set('auth', 'recovery')
        window.history.replaceState(
          {},
          '',
          url.pathname + url.search + url.hash,
        )
        setRecovery(true)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])
  function close() {
    if (provider || emailBusy) return
    if (recovery) {
      void remote
        ?.signOut()
        .then(clearRecovery)
        .catch(() => setAuthError('La déconnexion a échoué. Réessaie.'))
      return
    }
    setAuthError('')
    clearTimeout(timer.current)
    setProvider('')
    closeAuth()
  }
  async function connect(name: string) {
    setProvider(name)
    if (remote) {
      setAuthError('')
      try {
        await remote.signIn(name === 'GitHub' ? 'github' : 'google')
      } catch (cause) {
        setAuthError(
          cause instanceof Error ? cause.message : 'Connexion impossible.',
        )
        setProvider('')
      }
      return
    }
    timer.current = setTimeout(() => {
      update((previous) => ({ ...previous, signedIn: true }))
      setProvider('')
      closeAuth()
      notify('Bienvenue dans ton espace de démonstration.')
    }, 650)
  }
  if (!recovery && state.signedIn && !state.onboarded)
    return remote ? <CompleteProfile key={state.profile.id} /> : <Onboarding />
  if (!authOpen && !recovery && !authError) return null
  return (
    <Modal
      title={recovery ? 'Modifier le mot de passe' : 'Se connecter à OpenDev'}
      hideTitle
      onClose={close}
    >
      <div className="auth-brand" aria-hidden="true">
        <OpenDevLogo size={44} />
      </div>
      <h3 className="auth-heading">Le code nous rassemble.</h3>
      <p className="muted text-center">
        Retrouve ta communauté, partage tes idées et construis avec d’autres
        développeurs.
      </p>
      <div className="auth-buttons">
        {remote && (
          <EmailAuthPanel
            key={recovery ? 'recovery' : 'standard'}
            recovery={recovery}
            onRecovered={() => {
              clearRecovery()
              closeAuth()
            }}
            busy={!!provider || emailBusy}
            onBusy={setEmailBusy}
          />
        )}
        {!recovery && (
          <>
            <button
              className="button"
              disabled={
                emailBusy ||
                !!provider ||
                (!!remote && !remote.providers.github)
              }
              title={
                remote && !remote.providers.github
                  ? 'Connexion GitHub en attente de configuration'
                  : undefined
              }
              onClick={() => connect('GitHub')}
            >
              <GithubIcon size={20} />
              {provider === 'GitHub'
                ? remote
                  ? 'Connexion…'
                  : 'Connexion simulée…'
                : 'Continuer avec GitHub'}
            </button>
            <button
              className="button secondary"
              disabled={
                emailBusy ||
                !!provider ||
                (!!remote && !remote.providers.google)
              }
              title={
                remote && !remote.providers.google
                  ? 'Connexion Google en attente de configuration'
                  : undefined
              }
              onClick={() => connect('Google')}
            >
              <img
                className="google-signin-logo"
                src={googleLogo}
                width={20}
                height={20}
                alt=""
                aria-hidden="true"
              />
              {provider === 'Google'
                ? remote
                  ? 'Connexion…'
                  : 'Connexion simulée…'
                : 'Continuer avec Google'}
            </button>
          </>
        )}
      </div>
      {authError && (
        <p role="alert" className="field-error">
          {authError}
        </p>
      )}
      {!remote && (
        <p className="demo-note">
          Version de démonstration : ces boutons ouvrent un profil fictif, sans
          connexion à ton compte GitHub ou Google. Les changements sont
          enregistrés uniquement dans ce navigateur.
        </p>
      )}
    </Modal>
  )
}
function Onboarding() {
  const { state, update, notify } = useDemo()
  const [step, setStep] = useState(1)
  const [topics, setTopics] = useState(state.interests)
  const [joined, setJoined] = useState(state.joined)
  const [error, setError] = useState('')
  function finish() {
    update((previous) => ({
      ...previous,
      onboarded: true,
      interests: topics,
      joined,
    }))
    notify('Ton fil est prêt. Fais comme chez toi !')
  }
  return (
    <Modal
      title={
        step === 1
          ? 'Qu’est-ce qui te passionne ?'
          : 'Trouve les bonnes personnes'
      }
      wide
      onClose={() => {
        const alreadyPersonalized = state.interests.length >= 3
        update((previous) => ({
          ...previous,
          signedIn: alreadyPersonalized,
          onboarded: alreadyPersonalized,
        }))
        notify(
          alreadyPersonalized
            ? 'Tes préférences précédentes sont conservées.'
            : 'Tu peux reprendre la personnalisation en te connectant.',
        )
      }}
    >
      <div
        className="onboarding-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={step}
        aria-label={'Étape ' + step + ' sur 2'}
      >
        <span className="active" />
        <span className={step === 2 ? 'active' : ''} />
      </div>
      <p className="muted">
        {step === 1
          ? 'Choisis au moins 3 sujets pour personnaliser ton fil. Tu pourras les modifier plus tard.'
          : 'Voici des communautés proches de tes intérêts. Rejoins celles qui te parlent, ou explore-les plus tard.'}
      </p>
      {step === 1 ? (
        <>
          <div className="interest-grid">
            {interests.map((topic) => (
              <button
                key={topic}
                aria-pressed={topics.includes(topic)}
                className={
                  'interest ' + (topics.includes(topic) ? 'selected' : '')
                }
                onClick={() => {
                  setTopics((previous) => toggleItem(previous, topic))
                  setError('')
                }}
              >
                {topic}
                <span aria-hidden="true">
                  {topics.includes(topic) ? '✓' : '+'}
                </span>
              </button>
            ))}
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <span className="muted">
              {topics.length} sujet{topics.length > 1 ? 's' : ''} sélectionné
              {topics.length > 1 ? 's' : ''}
            </span>
            <button
              className="button"
              onClick={() =>
                topics.length >= 3
                  ? setStep(2)
                  : setError('Choisis au moins 3 sujets pour continuer.')
              }
            >
              Continuer
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="onboarding-communities">
            {relatedCommunities(topics).map((community) => (
              <div className="person-row" key={community.id}>
                <CommunityEmblem name={community.name} />
                <div className="grow">
                  <strong>{community.name}</strong>
                  <p className="muted small">{community.memberCount}</p>
                </div>
                <button
                  className={
                    'button compact ' +
                    (joined.includes(community.slug) ? 'secondary' : '')
                  }
                  aria-pressed={joined.includes(community.slug)}
                  onClick={() =>
                    setJoined((previous) =>
                      toggleItem(previous, community.slug),
                    )
                  }
                >
                  {joined.includes(community.slug) ? '✓ Membre' : 'Rejoindre'}
                </button>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button className="text-button" onClick={() => setStep(1)}>
              Retour
            </button>
            <button className="button" onClick={finish}>
              {joined.length ? 'Découvrir mon fil' : 'Explorer sans rejoindre'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
