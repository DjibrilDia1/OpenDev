import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useDemo } from '../../state/store'
import { OpenDevLogo } from '../common/OpenDevLogo'

/** Keep account pages and the feed unmounted until identity setup is complete. */
export function AccountGate({ children }: { children: ReactNode }) {
  const { state, remote, openAuth } = useDemo()
  const { pathname } = useLocation()
  const protectedPath =
    /^\/(profil(?:\/me)?\/?|parametres\/?|messages(?:\/.*)?|notifications\/?|enregistres\/?)$/.test(
      pathname,
    )
  if (remote && state.signedIn && !state.onboarded)
    return (
      <main className="platform-loading" aria-label="Configuration du compte">
        <OpenDevLogo />
      </main>
    )
  if (protectedPath && !state.signedIn)
    return (
      <main className="surface" style={{ maxWidth: 560, margin: '12vh auto' }}>
        <div className="auth-brand">
          <OpenDevLogo />
        </div>
        <h1>Connecte-toi à OpenDev</h1>
        <p>Retrouve ton profil et ton espace personnel.</p>
        <button className="button mt-4" onClick={openAuth}>
          Se connecter
        </button>
      </main>
    )
  return children
}
