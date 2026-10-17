import { usePeople } from '../state/store'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PersonRow } from '../components/profile/PersonRow'
import { EmptyState } from '../components/common/EmptyState'
import { matches, profilePath } from '../state/catalog'
import { useDemo } from '../state/store'
export function PeoplePage({ mode }: { mode?: 'followers' | 'following' }) {
  const people = usePeople()
  const { handle = 'me' } = useParams()
  const { state, openAuth } = useDemo()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const user = people.find(person => handle === 'me' ? person.isSelf : person.handle.replace('@','') === handle.replace('@',''))
  const self = user?.isSelf
  if (mode && !user)
    return (
      <AppLayout>
        <EmptyState
          title="Profil introuvable"
          description="Retrouve les développeurs dans l’annuaire."
          to="/developpeurs"
          label="Voir les développeurs"
        />
      </AppLayout>
    )
  if (mode && self && !state.signedIn)
    return (
      <AppLayout>
        <EmptyState
          title="Retrouve ton réseau"
          description="Connecte-toi pour voir tes abonnements."
        />
        <button className="button" onClick={openAuth}>
          Se connecter
        </button>
      </AppLayout>
    )
  let list = people.filter((person) => !person.isSelf)
  if (mode && self)
    list =
      mode === 'following'
        ? list.filter((person) => state.following.includes(person.id))
        : list.filter((person) => person.followsYou)
  else if (mode && user) {
    list = list
      .filter((person) => person.id !== user.id)
      .slice(mode === 'followers' ? 1 : 0, mode === 'followers' ? 5 : 4)
    if (
      mode === 'followers' &&
      state.signedIn &&
      state.following.includes(user.id)
    )
      list = [...list, state.profile]
  }
  const filtered = list.filter((person) =>
    matches(
      person.name + ' ' + person.handle + ' ' + person.tags?.join(' '),
      query,
    ),
  )
  return (
    <AppLayout>
      <div className="page-heading">
        {mode && user && (
          <Link
            className="back-link"
            to={self ? '/profil' : profilePath(user.handle)}
          >
            ← {self ? state.profile.name : user.name}
          </Link>
        )}
        <h1>
          {mode === 'followers'
            ? 'Abonnés'
            : mode === 'following'
              ? 'Abonnements'
              : 'Rencontre la communauté'}
        </h1>
        <p>
          {mode
            ? 'Les liens qui font grandir les idées.'
            : 'Des personnes curieuses, comme toi.'}
        </p>
      </div>
      <input
        className="standalone-search"
        aria-label="Rechercher un développeur"
        placeholder="Un nom, une stack, un centre d’intérêt…"
        value={query}
        onChange={(event) =>
          setParams({ q: event.target.value }, { replace: true })
        }
      />
      <section className="surface">
        {filtered.map((person) => (
          <PersonRow key={person.id} user={person} />
        ))}
        {!filtered.length && (
          <EmptyState
            title="Aucun développeur à afficher"
            description="Essaie un autre terme ou découvre de nouveaux profils."
            to="/developpeurs"
            label="Découvrir des développeurs"
          />
        )}
      </section>
    </AppLayout>
  )
}
