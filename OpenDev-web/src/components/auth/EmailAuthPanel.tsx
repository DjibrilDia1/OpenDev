import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDemo } from '../../state/store'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from '../../lib/auth-errors'
import type { SignupProfile } from '../../types'
import { isValidUsername, normalizeUsername } from '../../lib/username'
import './auth-flows.css'
import { AccountTypeField } from './AccountTypeField'

type Mode = 'login' | 'signup' | 'confirm' | 'forgot' | 'reset'

export function EmailAuthPanel({
  footerTarget,
  recovery = false,
  onRecovered,
  busy,
  onBusy,
}: {
  footerTarget: HTMLDivElement | null
  recovery?: boolean
  onRecovered: () => void
  busy: boolean
  onBusy: (busy: boolean) => void
}) {
  const { remote, closeAuth, notify } = useDemo()
  const [mode, setMode] = useState<Mode>(recovery ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [firstName, setFirstName] = useState('')
  const [accountType, setAccountType] = useState<'individual' | 'company'>(
    'individual',
  )
  const [companyName, setCompanyName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [availability, setAvailability] = useState<{
    value: string
    available: boolean
    message: string
  } | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [resetCooldown, setResetCooldown] = useState(0)
  const pending = useRef(false)
  const signup = mode === 'signup'
  const reset = mode === 'reset'
  const validUsername = isValidUsername(username)
  useEffect(() => {
    if (!signup || !validUsername) return
    let active = true
    const timer = window.setTimeout(() => {
      void api<{ available: boolean }>(
        '/auth/username-availability?username=' + encodeURIComponent(username),
      )
        .then((result) => {
          if (active)
            setAvailability({
              value: username,
              available: result.available,
              message: result.available
                ? 'Ce nom est disponible.'
                : 'Ce nom est déjà utilisé.',
            })
        })
        .catch(() => {
          if (active)
            setAvailability({
              value: username,
              available: false,
              message:
                'Vérification indisponible. Tu peux réessayer en envoyant le formulaire.',
            })
        })
    }, 400)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [username, signup, validUsername])
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [cooldown])
  useEffect(() => {
    if (!resetCooldown) return
    const timer = window.setTimeout(
      () => setResetCooldown((value) => Math.max(0, value - 1)),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [resetCooldown])

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmation('')
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      pending.current ||
      busy ||
      !remote ||
      !supabase ||
      (mode === 'forgot' && resetCooldown > 0)
    )
      return
    setError('')
    setMessage('')
    if ((signup || reset) && password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if ((signup || reset) && password.length < 8) {
      setError('Choisis un mot de passe avec au moins 8 caractères.')
      return
    }
    if (
      signup &&
      (!validUsername ||
        (accountType === 'company'
          ? !companyName.trim() || companyName.trim().length > 100
          : !firstName.trim() || !lastName.trim()))
    ) {
      setError(
        accountType === 'company'
          ? 'Renseigne le nom de ton entreprise et un nom d’utilisateur valide.'
          : 'Renseigne ton prénom, ton nom et un nom d’utilisateur valide.',
      )
      return
    }
    pending.current = true
    onBusy(true)
    try {
      if (mode === 'forgot') {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + '/?auth=recovery',
        })
        if (result.error) throw result.error
        setMessage(
          'Si un compte correspond à cette adresse, tu recevras un lien pour choisir un nouveau mot de passe.',
        )
        setResetCooldown(60)
      } else if (reset) {
        const { data, error: sessionError } = await supabase.auth.getUser()
        if (sessionError || !data.user) {
          setError(
            'Ce lien a expiré ou n’est pas valide. Demande un nouveau lien.',
          )
          return
        }
        const result = await supabase.auth.updateUser({ password })
        if (result.error) throw result.error
        setPassword('')
        setConfirmation('')
        notify('Ton mot de passe a été mis à jour.')
        onRecovered()
      } else {
        let profile: SignupProfile | undefined
        if (signup) {
          const result = await api<{ available: boolean }>(
            '/auth/username-availability?username=' +
              encodeURIComponent(username),
          )
          if (!result.available) {
            setError('Ce nom d’utilisateur est déjà pris. Choisis-en un autre.')
            return
          }
          profile = {
            account_type: accountType,
            company_name: accountType === 'company' ? companyName.trim() : null,
            first_name: accountType === 'company' ? '' : firstName.trim(),
            last_name: accountType === 'company' ? '' : lastName.trim(),
            username,
            full_name:
              accountType === 'company'
                ? companyName.trim()
                : `${firstName.trim()} ${lastName.trim()}`,
            headline: '',
            bio: '',
            location: '',
          }
        }
        const signedIn = await remote.emailAuth(
          email.trim(),
          password,
          signup,
          profile,
        )
        setPassword('')
        setConfirmation('')
        if (signedIn) {
          closeAuth()
          notify('Bienvenue sur OpenDev.')
        } else {
          switchMode('confirm')
          setCooldown(60)
        }
      }
    } catch (cause) {
      setError(authErrorMessage(cause))
      if (
        typeof cause === 'object' &&
        cause &&
        'code' in cause &&
        cause.code === 'email_not_confirmed'
      )
        setMode('confirm')
    } finally {
      pending.current = false
      onBusy(false)
    }
  }
  async function resend() {
    if (pending.current || busy || cooldown || !supabase) return
    pending.current = true
    onBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: cause } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin + '/' },
      })
      if (cause) throw cause
      setCooldown(60)
      setMessage(
        'Un nouvel e-mail de confirmation a été demandé. Consulte aussi tes courriers indésirables.',
      )
    } catch (cause) {
      setError(authErrorMessage(cause))
    } finally {
      pending.current = false
      onBusy(false)
    }
  }
  return (
    <div className="email-auth-panel" aria-busy={busy}>
      {mode === 'confirm' ? (
        <div className="form-stack">
          <h3>Vérifie ton e-mail</h3>
          <p className="muted">
            Utilise le lien reçu à <strong>{email}</strong> pour confirmer ton
            adresse, puis connecte-toi. Si tu as déjà un compte, utilise la
            connexion.
          </p>
          <button
            className="button"
            disabled={busy || cooldown > 0}
            onClick={() => void resend()}
          >
            {busy
              ? 'Envoi…'
              : cooldown
                ? `Renvoyer dans ${cooldown} s`
                : 'Renvoyer l’e-mail'}
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => switchMode('login')}
          >
            Retour à la connexion
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => switchMode('signup')}
          >
            Corriger mon adresse
          </button>
        </div>
      ) : (
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          {signup && (
            <>
              <AccountTypeField
                value={accountType}
                onChange={setAccountType}
                disabled={busy}
              />
              {accountType === 'company' ? (
                <label className="field">
                  <span>
                    Nom de l’entreprise <span aria-hidden="true">*</span>
                  </span>
                  <input
                    required
                    maxLength={100}
                    autoComplete="organization"
                    value={companyName}
                    disabled={busy}
                    onChange={(event) => setCompanyName(event.target.value)}
                  />
                </label>
              ) : (
                <div className="signup-name-fields">
                  <label className="field">
                    <span>
                      Prénom <span aria-hidden="true">*</span>
                    </span>
                    <input
                      required
                      maxLength={50}
                      autoComplete="given-name"
                      value={firstName}
                      disabled={busy}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>
                      Nom <span aria-hidden="true">*</span>
                    </span>
                    <input
                      required
                      maxLength={50}
                      autoComplete="family-name"
                      value={lastName}
                      disabled={busy}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </label>
                </div>
              )}
              <label className="field">
                <span>
                  Nom d’utilisateur <span aria-hidden="true">*</span>
                </span>
                <input
                  required
                  aria-label="Nom d’utilisateur"
                  autoComplete="username"
                  value={username}
                  disabled={busy}
                  onChange={(event) =>
                    setUsername(normalizeUsername(event.target.value))
                  }
                  onBlur={() => setUsername((value) => value.trim())}
                />
                {validUsername && (
                  <small
                    role="status"
                    className={
                      availability?.value === username &&
                      !availability.available
                        ? 'field-error'
                        : availability?.value === username
                          ? 'field-success'
                          : 'muted'
                    }
                  >
                    {availability?.value === username
                      ? availability.message
                      : 'Vérification du nom…'}
                  </small>
                )}
              </label>
            </>
          )}
          {mode === 'forgot' && (
            <>
              <h3>Mot de passe oublié ?</h3>
              <p className="muted">
                Reçois un lien pour choisir un nouveau mot de passe.
              </p>
            </>
          )}
          {reset && <h3>Choisis ton nouveau mot de passe</h3>}
          {!reset && (
            <label className="field">
              <span>
                E-mail <span aria-hidden="true">*</span>
              </span>
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          )}
          {mode !== 'forgot' && (
            <label className="field">
              <span>
                {reset ? 'Nouveau mot de passe' : 'Mot de passe'}{' '}
                <span aria-hidden="true">*</span>
              </span>
              <input
                type="password"
                required
                minLength={signup || reset ? 8 : 1}
                maxLength={128}
                autoComplete={
                  signup || reset ? 'new-password' : 'current-password'
                }
                value={password}
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}
          {(signup || reset) && (
            <label className="field">
              <span>
                Confirmer le mot de passe <span aria-hidden="true">*</span>
              </span>
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={confirmation}
                disabled={busy}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
          )}
          <button
            className="button"
            disabled={busy || (mode === 'forgot' && resetCooldown > 0)}
          >
            {busy
              ? 'Veuillez patienter…'
              : signup
                ? 'Créer mon compte'
                : reset
                  ? 'Enregistrer le mot de passe'
                  : mode === 'forgot'
                    ? resetCooldown
                      ? `Renvoyer dans ${resetCooldown} s`
                      : 'Envoyer le lien'
                    : 'Se connecter'}
          </button>
          {signup && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => switchMode('login')}
            >
              J’ai déjà un compte
            </button>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => switchMode('login')}
            >
              Retour à la connexion
            </button>
          )}
          {reset && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => switchMode('forgot')}
            >
              Demander un nouveau lien
            </button>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="auth-feedback">
          {message}
        </p>
      )}
      {mode === 'login' &&
        footerTarget &&
        createPortal(
          <>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => switchMode('signup')}
            >
              Créer un compte
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => switchMode('forgot')}
            >
              Mot de passe oublié ?
            </button>
          </>,
          footerTarget,
        )}
    </div>
  )
}
