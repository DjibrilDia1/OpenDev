import { useEffect, useState } from 'react'
import type { ContributionScore } from '../../types/contribution'
import { useDemo } from '../../state/store'
import { contributionLevel } from '../../lib/contribution-level'
import './contribution.css'

export function ContributionSummary({ data }: { data: ContributionScore }) {
  const { current, next } = contributionLevel(data.score)
  const progress = next
    ? ((data.score - current.threshold) /
        (next.threshold - current.threshold)) *
      100
    : 100
  const breakdown = [
    ['Publications', data.posts_points],
    ['Réponses', data.answers_points],
    ['Ressources partagées', data.resources_points],
    ['Remerciements', data.thanks_points],
    ['Solutions retenues', data.solutions_points],
  ] as const
  return (
    <section
      className="surface contribution-summary"
      aria-label="Score de contribution"
    >
      <div className="contribution-summary-heading">
        <div>
          <h2>Contributions</h2>
          <p className="muted small">
            Les échanges qui font avancer la communauté.
          </p>
        </div>
        <div className="contribution-total">
          <strong>{data.score.toLocaleString('fr-FR')}</strong>
          <span>points · {current.name}</span>
        </div>
      </div>
      <progress
        aria-label={`Progression du niveau ${current.name}`}
        value={progress}
        max={100}
      />
      <p className="small muted">
        {next
          ? `${(next.threshold - data.score).toLocaleString('fr-FR')} points avant le niveau ${next.name}`
          : 'Niveau Pilier atteint. Chaque contribution continue de compter.'}
      </p>
      <div className="contribution-recognition">
        <span>
          <strong>{data.thanks_received.toLocaleString('fr-FR')}</strong>{' '}
          remerciement{data.thanks_received > 1 ? 's' : ''} reçu
          {data.thanks_received > 1 ? 's' : ''}
        </span>
        <span>
          <strong>{data.solutions_count.toLocaleString('fr-FR')}</strong>{' '}
          solution{data.solutions_count > 1 ? 's' : ''} retenue
          {data.solutions_count > 1 ? 's' : ''}
        </span>
      </div>
      <details className="contribution-rules">
        <summary>Comprendre le score</summary>
        <dl>
          {breakdown.map(([label, points]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{points.toLocaleString('fr-FR')} pts</dd>
            </div>
          ))}
        </dl>
        <h3>Comment gagner des points ?</h3>
        <ul>
          <li>Publication : +2 points, jusqu’à 3 par jour.</li>
          <li>
            Publication de type Ressource avec un lien, un extrait de code ou
            une pièce jointe : +3 points supplémentaires, jusqu’à 2 par jour.
          </li>
          <li>
            Réponse à une publication d’un autre membre : +2 points, une fois
            par publication, jusqu’à 5 par jour.
          </li>
          <li>
            Remerciement reçu sur une réponse d’entraide : +5 points, jusqu’à 10
            par jour. Une seule interaction entre les mêmes membres compte
            chaque jour.
          </li>
          <li>
            Réponse retenue comme solution par l’auteur de la question : +15
            points, jusqu’à 3 par jour.
          </li>
        </ul>
        <p className="muted small">
          Les plafonds suivent les journées UTC. Le score est recalculé à partir
          des contributions conservées. Les mentions « Merci », « Utile » et «
          Très clair » ont la même valeur.
        </p>
        <p className="muted small">
          Niveaux : Découverte · 50 Contributeur · 200 Engagé · 500 Référent · 1
          500 Pilier.
        </p>
      </details>
    </section>
  )
}

function LiveContributionSummary({ userId }: { userId: string }) {
  const { remote, allPosts } = useDemo()
  const request = remote!.request
  const [data, setData] = useState<ContributionScore | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void request<ContributionScore>(
      `/people/${encodeURIComponent(userId)}/score`,
    )
      .then((result) => {
        if (active) {
          setData(result)
          setError('')
        }
      })
      .catch(() => {
        if (active) setError('Impossible de charger le score de contribution.')
      })
    return () => {
      active = false
    }
  }, [request, userId, attempt, allPosts])
  if (data && !error) return <ContributionSummary data={data} />
  return (
    <section
      className="surface contribution-summary"
      aria-label="Score de contribution"
    >
      <h2>Contributions</h2>
      {error ? (
        <div role="alert">
          <p className="field-error">{error}</p>
          <button
            type="button"
            className="button secondary compact mt-3"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Réessayer
          </button>
        </div>
      ) : (
        <p className="muted small" role="status">
          Chargement du score…
        </p>
      )}
    </section>
  )
}

export function ProfileContribution({ userId }: { userId: string }) {
  const { remote, state } = useDemo()
  return remote ? (
    <LiveContributionSummary key={userId + state.profile.id} userId={userId} />
  ) : null
}
