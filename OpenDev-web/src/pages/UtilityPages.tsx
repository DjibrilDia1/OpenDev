import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { EmptyState } from '../components/common/EmptyState'
import { PostCard } from '../components/feed/PostCard'
import { CommunityCard } from '../components/community/CommunityCard'
import { PersonRow } from '../components/profile/PersonRow'
import { useCommunities, useDemo } from '../state/store'
import { people, matches } from '../state/catalog'

export function SearchPage() {
  const communityCatalog = useCommunities()
  const [params, setParams] = useSearchParams()
  const { allPosts } = useDemo()
  const query = params.get('q') ?? ''
  const term = query.trim().replace(/^#/, '')
  const tab = params.get('type') ?? 'publications'
  const posts = term
    ? allPosts.filter((post) =>
        matches(
          post.content +
            ' ' +
            post.title +
            ' ' +
            post.tags.join(' ') +
            ' ' +
            post.author.name,
          term,
        ),
      )
    : []
  const communities = term
    ? communityCatalog.filter((community) =>
        matches(community.name + ' ' + community.description, term),
      )
    : []
  const users = term
    ? people.filter((user) =>
        matches(
          user.name + ' ' + user.handle + ' ' + user.tags?.join(' '),
          term,
        ),
      )
    : []
  const count =
    tab === 'publications'
      ? posts.length
      : tab === 'communautes'
        ? communities.length
        : users.length
  return (
    <AppLayout sidebarVariant="none">
      <div className="page-heading">
        <h1>Une idée en tête ?</h1>
        <p>Recherche des publications, des communautés et des développeurs.</p>
      </div>
      <form
        className="search-page-form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          setParams({ q: String(data.get('q') ?? ''), type: tab })
        }}
      >
        <input
          key={query}
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Que recherches-tu ?"
          placeholder="React, accessibilité, un développeur…"
        />
        <button className="button" type="submit">
          Rechercher
        </button>
      </form>
      <div className="tabs">
        {[
          ['publications', 'Publications', posts.length],
          ['communautes', 'Communautés', communities.length],
          ['developpeurs', 'Développeurs', users.length],
        ].map(([key, label, number]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            aria-pressed={tab === key}
            onClick={() => setParams({ q: query, type: String(key) })}
          >
            {label}
            {term ? ' (' + number + ')' : ''}
          </button>
        ))}
      </div>
      {!term ? (
        <EmptyState
          title="La curiosité commence ici"
          description="Entre un nom, un sujet ou une technologie pour explorer OpenDev."
        />
      ) : !count ? (
        <EmptyState
          title="Aucun résultat pour cette recherche"
          description="Essaie un autre mot ou une autre catégorie de résultats."
        />
      ) : tab === 'publications' ? (
        <div className="post-list search-posts">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : tab === 'communautes' ? (
        <div className="communities-grid">
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      ) : (
        <div className="surface">
          {users.map((user) => (
            <PersonRow user={user} key={user.id} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
export function SavedPage() {
  const { state, allPosts, openAuth } = useDemo()
  const posts = state.signedIn
    ? allPosts.filter((post) => state.saved.includes(post.id))
    : []
  return (
    <AppLayout>
      <div className="page-heading">
        <h1>À garder sous la main</h1>
        <p>Tes découvertes, pour plus tard.</p>
      </div>
      {!state.signedIn ? (
        <>
          <EmptyState
            title="Retrouve tes enregistrements"
            description="Connecte-toi pour conserver les publications qui t’intéressent."
          />
          <button className="button" onClick={openAuth}>
            Se connecter
          </button>
        </>
      ) : posts.length ? (
        <div className="post-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Une collection qui ne demande qu’à grandir"
          description="Utilise le marque-page d’une publication pour la retrouver ici."
          to="/"
          label="Parcourir le fil"
        />
      )}
    </AppLayout>
  )
}
export function PostPage() {
  const { id } = useParams()
  const { allPosts } = useDemo()
  const post = allPosts.find((item) => item.id === id)
  return (
    <AppLayout>
      <Link className="back-link" to="/">
        ← Retour au fil
      </Link>
      {post ? (
        <PostCard post={post} expanded />
      ) : (
        <EmptyState
          title="Publication introuvable"
          description="Elle a peut-être été supprimée, ou créée dans un autre navigateur de démonstration."
          to="/"
          label="Retour au fil"
        />
      )}
    </AppLayout>
  )
}
export function NotificationsPage() {
  const { state, update, openAuth } = useDemo()
  return (
    <AppLayout>
      <div className="page-heading">
        <h1>Notifications</h1>
        <p>Les nouvelles de ton réseau.</p>
      </div>
      {!state.signedIn ? (
        <>
          <EmptyState
            title="Connecte-toi pour retrouver ton activité"
            description="Tes notifications seront rassemblées ici."
          />
          <button className="button" onClick={openAuth}>
            Se connecter
          </button>
        </>
      ) : (
        <section className="surface">
          <div className="section-heading">
            <h2>
              {state.readNotifications
                ? 'Tu es à jour'
                : 'Deux nouvelles pour toi'}
            </h2>
            <button
              className="text-button"
              onClick={() =>
                update((previous) => ({ ...previous, readNotifications: true }))
              }
            >
              Tout marquer comme lu
            </button>
          </div>
          {[
            {
              title: 'Bienvenue dans la communauté OpenDev',
              description: 'Trouve les espaces qui te ressemblent.',
              to: '/decouvrir',
              symbol: '✳',
            },
            {
              title: 'Fais connaissance avec d’autres développeurs',
              description:
                'Une conversation peut être le début d’un beau projet.',
              to: '/developpeurs',
              symbol: '&lt;/&gt;',
            },
          ].map((notification) => (
            <Link
              key={notification.to}
              className={
                'notification-row ' + (!state.readNotifications ? 'unread' : '')
              }
              to={notification.to}
              onClick={() =>
                update((previous) => ({ ...previous, readNotifications: true }))
              }
            >
              <span className="empty-symbol" aria-hidden="true">
                {notification.symbol === '✳' ? '✳' : '</>'}
              </span>
              <span>
                <strong>{notification.title}</strong>
                <p className="muted">{notification.description}</p>
                <small className="muted">Démonstration</small>
              </span>
            </Link>
          ))}
        </section>
      )}
    </AppLayout>
  )
}
const information: Record<
  string,
  { title: string; sections: [string, string][] }
> = {
  'a-propos': {
    title: 'Pour les développeurs, par les développeurs.',
    sections: [
      [
        'Un espace commun',
        'OpenDev est un lieu pour discuter, apprendre, partager et construire ensemble. Du premier projet à la contribution open source, chaque parcours a sa place.',
      ],
      [
        'Une version à explorer',
        'Cette interface est une démonstration interactive. Les profils, les communautés et les échanges présentés sont fictifs. La connexion aux services de la plateforme viendra ensuite.',
      ],
    ],
  },
  regles: {
    title: 'Construire une communauté où chacun progresse.',
    sections: [
      [
        'La bienveillance d’abord',
        'Discute des idées, respecte les personnes. Le harcèlement et les propos discriminatoires n’ont pas leur place ici.',
      ],
      [
        'Partager avec du contexte',
        'Décris ce que tu essaies de faire, ce que tu as déjà tenté et le résultat attendu. Un petit exemple vaut souvent un long échange.',
      ],
      [
        'Respecter le travail des autres',
        'Cite tes sources et les licences des projets que tu partages. Ne publie pas d’informations privées, de clés d’accès ou de contenu dont tu n’as pas les droits.',
      ],
    ],
  },
  confidentialite: {
    title: 'Tes données dans cette démonstration.',
    sections: [
      [
        'Tout reste dans ton navigateur',
        'Les publications, aperçus d’images, préférences, profils modifiés et messages sont stockés localement. Ils ne sont pas envoyés à une API ni partagés avec d’autres personnes.',
      ],
      [
        'Une connexion simulée',
        'Les boutons GitHub et Google n’accèdent à aucun compte. Ils ouvrent le même profil fictif pour permettre de parcourir l’application.',
      ],
      [
        'Effacer les données',
        'Tu peux supprimer les données du site dans les paramètres de ton navigateur. La déconnexion masque ton espace personnel mais conserve tes modifications pour la prochaine visite. Les pièces jointes de messagerie conservent uniquement leur nom et leur taille.',
      ],
    ],
  },
}
export function InfoPage() {
  const { page = 'a-propos' } = useParams()
  const content = information[page] ?? information['a-propos']
  return (
    <AppLayout sidebarVariant="none">
      <div className="information-page">
        <Link className="back-link" to="/">
          ← Retour au fil
        </Link>
        <h1>{content.title}</h1>
        {content.sections.map(([title, description]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
          </section>
        ))}
      </div>
    </AppLayout>
  )
}
export function NotFoundPage() {
  return (
    <AppLayout sidebarVariant="none">
      <EmptyState
        title="On dirait que ce chemin n’existe pas"
        description="Retrouve le fil communautaire ou explore un nouvel espace."
        to="/"
        label="Retour à l’accueil"
      />
    </AppLayout>
  )
}
