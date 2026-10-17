import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { useDemo } from '../state/store'

export function SettingsPage() {
  const { state, update, openAuth, notify, remote } = useDemo()
  return (
    <AppLayout sidebarVariant="none">
      <Link to="/" className="back-link">
        ← Retour à l’accueil
      </Link>
      <div className="page-heading">
        <h1>Paramètres</h1>
        <p>Adapte ton expérience OpenDev.</p>
      </div>
      <div className="settings-sections">
        <section className="surface">
          <h2>Affichage</h2>
          <label className="checkbox-label mt-4">
            <input
              type="checkbox"
              checked={state.autoRotateBanner}
              onChange={(event) =>
                update((previous) => ({
                  ...previous,
                  autoRotateBanner: event.target.checked,
                }))
              }
            />
            Faire défiler la bannière toutes les 3 secondes
          </label>
          <p className="small muted mt-3">
            Le défilement se met en pause au survol ou pendant la navigation
            clavier. La préférence de réduction des animations de ton appareil
            est respectée.
          </p>
        </section>
        <section className="surface">
          <h2>Mon compte</h2>
          {state.signedIn ? (
            <>
              <p className="muted mt-3">
                Connecté {remote ? '' : 'en démonstration '}en tant que {state.profile.name}.
              </p>
              <div className="row wrap mt-4">
                <Link to="/profil" className="button secondary">
                  Modifier mon profil
                </Link>
                <Link to="/decouvrir?mes=1" className="button secondary">
                  Mes communautés
                </Link>
                <button
                  className="text-button"
                  onClick={() => {
                    if(remote){void remote.signOut().catch(cause=>notify(cause.message));return}
                    update((previous) => ({ ...previous, signedIn: false }))
                    notify(
                      'Tu es déconnecté. Tes données de démonstration sont conservées.',
                    )
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            </>
          ) : (
            <button className="button mt-4" onClick={openAuth}>
              Se connecter
            </button>
          )}
        </section>
        <section className="surface" id="publicite">
          {state.signedIn && (
            <div className="mb-4">
              <h2>Préférences du fil</h2>
              <p className="small muted mt-3">
                {state.hiddenPosts.length} publication(s) masquée(s) ·{' '}
                {state.mutedAuthors.length} auteur(s) masqué(s)
              </p>
              <button
                className="button secondary mt-3"
                disabled={
                  !state.hiddenPosts.length && !state.mutedAuthors.length
                }
                onClick={() => {
                  update((previous) => ({
                    ...previous,
                    hiddenPosts: [],
                    mutedAuthors: [],
                  }))
                  notify('Toutes les publications sont à nouveau visibles.')
                }}
              >
                Réinitialiser les masquages
              </button>
            </div>
          )}
          <h2>Entreprises et annonces</h2>
          <p className="muted mt-3">
            La bannière prévoit des emplacements sponsorisés, identifiés comme
            tels, avec une affiche, le nom de l’annonceur et un lien. La gestion
            des campagnes et leur validation par OpenDev seront disponibles lors
            de l’intégration du backend.
          </p>
          <p className="small muted mt-3">
            La bannière apparaît uniquement pour une promotion de communauté ou une publicité active. Sans campagne, le fil commence directement par les publications.
          </p>
        </section>
      </div>
    </AppLayout>
  )
}
