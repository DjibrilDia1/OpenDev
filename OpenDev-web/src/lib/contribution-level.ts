const levels = [
  { threshold: 0, name: 'Découverte' },
  { threshold: 50, name: 'Contributeur' },
  { threshold: 200, name: 'Engagé' },
  { threshold: 500, name: 'Référent' },
  { threshold: 1500, name: 'Pilier' },
] as const

export function contributionLevel(score: number) {
  let index = 0
  for (let position = 1; position < levels.length; position++) {
    if (score >= levels[position].threshold) index = position
  }
  return { current: levels[index], next: levels[index + 1] }
}
