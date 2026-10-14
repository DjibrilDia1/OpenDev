import { useEffect, useState } from 'react'
import { SparklesIcon } from '../common/Icons'
import { Link } from 'react-router-dom'
import { useDemo } from '../../state/store'
import sponsorArtwork from '../../assets/emblems/community.svg'
interface BannerSlide {
  title: string
  text: string
  topic: string
  sponsor?: string
  imageUrl?: string
  href?: string
  cta?: string
}
const tips: BannerSlide[] = [
  {
    title: 'Le meilleur code se construit ensemble.',
    text: 'Une question posée aujourd’hui peut débloquer le projet de quelqu’un demain.',
    topic: 'L’esprit OpenDev',
  },
  {
    title: 'Ton clavier est aussi un outil de test.',
    text: 'Parcours ton interface avec Tab. Chaque action doit être accessible, et le focus toujours visible.',
    topic: 'Le réflexe accessibilité',
  },
  {
    title: 'Une petite PR peut avoir un grand impact.',
    text: 'Une documentation plus claire, un exemple corrigé, un bug reproduit : chaque contribution compte.',
    topic: 'La culture open source',
  },
  {
    title: 'Explique le pourquoi, laisse parler le code.',
    text: 'Un bon commentaire raconte une décision. Un nom explicite raconte ce que fait le code.',
    topic: 'Le conseil du jour',
  },
  {
    title: 'Votre prochaine idée commence ici.',
    text: 'Un format pour présenter vos outils, événements et opportunités à la communauté.',
    topic: 'Exemple publicitaire fictif',
    sponsor: 'Studio Démo',
    imageUrl: sponsorArtwork,
    href: '/parametres#publicite',
    cta: 'Découvrir le format',
  },
]
export function HeroBanner() {
  const { state } = useDemo()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (
      paused ||
      hovered ||
      focused ||
      !state.autoRotateBanner ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const timer = setInterval(
      () => setIndex((previous) => (previous + 1) % tips.length),
      3000,
    )
    return () => clearInterval(timer)
  }, [paused, hovered, focused, state.autoRotateBanner])
  const tip = tips[index]
  return (
    <section
      className={'tip-banner ' + (tip.sponsor ? 'sponsored-banner' : '')}
      aria-label="Conseils et annonces"
      aria-roledescription="carrousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false)
      }}
    >
      <div className="tip-copy">
        <p className="tip-label">
          <SparklesIcon size={16} aria-hidden="true" />{' '}
          {tip.sponsor
            ? `Sponsorisé · ${tip.sponsor} · Démo`
            : 'Le saviez-vous ?'}
        </p>
        <h2>{tip.title}</h2>
        <p>{tip.text}</p>
        {tip.href && (
          <Link className="banner-cta" to={tip.href}>
            {tip.cta} ↗
          </Link>
        )}
        <div className="tip-bottom">
          <span>{tip.topic}</span>
          <div className="tip-controls">
            {tips.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={'Afficher la diapositive ' + (i + 1)}
                aria-pressed={index === i}
                className={index === i ? 'active' : ''}
              />
            ))}
            {state.autoRotateBanner && (
              <button
                className="pause-tip"
                aria-label={
                  paused ? 'Activer le défilement' : 'Suspendre le défilement'
                }
                onClick={() => setPaused(!paused)}
              >
                {paused ? '▷' : 'Ⅱ'}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="tip-art" aria-hidden="true">
        {tip.imageUrl && (
          <img className="sponsor-artwork" src={tip.imageUrl} alt="" />
        )}
        <span className="art-orbit" />
        <span className="art-star">✳</span>
        <span className="art-code">&lt;/&gt;</span>
      </div>
    </section>
  )
}
