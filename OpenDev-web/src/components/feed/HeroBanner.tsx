import { useEffect, useState } from 'react'
import { SparklesIcon } from '../common/Icons'
import { Link } from 'react-router-dom'
import { useDemo, useCommunities } from '../../state/store'
interface BannerSlide {
  title: string
  text: string
  topic: string
  sponsor?: string
  imageUrl?: string
  href?: string
  cta?: string
}
export function HeroBanner() {
  const { state } = useDemo()
  const communities = useCommunities()
  const tips: BannerSlide[] = [
    ...communities
      .filter(
        (community) =>
          community.promotionActive && community.visibility !== 'private',
      )
      .map((community) => ({
        title: community.name,
        text: community.description,
        topic: 'Promotion de communauté',
        href: '/communaute/' + community.slug,
        cta: 'Découvrir la communauté',
      })),
    ...state.sponsoredBanners
      .filter((banner) => banner.active)
      .map((banner) => ({
        title: banner.title,
        text: banner.text,
        sponsor: banner.sponsor,
        topic: 'Publicité',
      })),
  ]
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (
      tips.length < 2 ||
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
  }, [paused, hovered, focused, state.autoRotateBanner, tips.length])
  const activeIndex = index % (tips.length || 1)
  const tip = tips[activeIndex]
  if (!tip) return null
  return (
    <section
      className={'tip-banner ' + (tip.sponsor ? 'sponsored-banner' : '')}
      aria-label="Promotions et annonces"
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
            ? `Sponsorisé · ${tip.sponsor}`
            : 'À découvrir dans la communauté'}
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
                aria-pressed={activeIndex === i}
                className={activeIndex === i ? 'active' : ''}
              />
            ))}
            {tips.length > 1 && state.autoRotateBanner && (
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
