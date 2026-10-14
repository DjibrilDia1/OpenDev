import { useEffect, useRef, useState } from 'react'
import { Modal } from '../common/Modal'
import { GithubIcon } from '../common/Icons'
import { CommunityEmblem } from '../common/CommunityEmblem'
import { useDemo, toggleItem } from '../../state/store'
import { interests, relatedCommunities } from '../../state/catalog'

export function AuthFlow() {
  const { state, update, authOpen, closeAuth, notify } = useDemo()
  const [provider, setProvider] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  function close() {
    clearTimeout(timer.current)
    setProvider('')
    closeAuth()
  }
  function connect(name: string) {
    setProvider(name)
    timer.current = setTimeout(() => {
      update((previous) => ({ ...previous, signedIn: true }))
      setProvider('')
      closeAuth()
      notify('Bienvenue dans ton espace de démonstration.')
    }, 650)
  }
  if (state.signedIn && !state.onboarded) return <Onboarding />
  if (!authOpen) return null
  return (
    <Modal title="Bienvenue sur OpenDev" onClose={close}>
      <div className="auth-art" aria-hidden="true">
        <span>&lt;</span>
        <span>✳</span>
        <span>/&gt;</span>
      </div>
      <h3 className="auth-heading">Le code nous rassemble.</h3>
      <p className="muted text-center">
        Retrouve ta communauté, partage tes idées et construis avec d’autres
        développeurs.
      </p>
      <div className="auth-buttons">
        <button
          className="button"
          disabled={!!provider}
          onClick={() => connect('GitHub')}
        >
          <GithubIcon size={20} />
          {provider === 'GitHub'
            ? 'Connexion simulée…'
            : 'Continuer avec GitHub'}
        </button>
        <button
          className="button secondary"
          disabled={!!provider}
          onClick={() => connect('Google')}
        >
          <span className="font-bold" aria-hidden="true">
            G
          </span>
          {provider === 'Google'
            ? 'Connexion simulée…'
            : 'Continuer avec Google'}
        </button>
      </div>
      <p className="demo-note">
        Version de démonstration : ces boutons ouvrent un profil fictif, sans
        connexion à ton compte GitHub ou Google. Les changements sont
        enregistrés uniquement dans ce navigateur.
      </p>
      <button className="text-button centered" onClick={close}>
        Continuer à explorer
      </button>
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
