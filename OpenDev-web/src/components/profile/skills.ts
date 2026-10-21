export function parseSkills(value: string): string[] {
  const seen = new Set<string>()
  const skills = value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  if (skills.length > 10 || skills.some((tag) => tag.length > 40))
    throw new Error(
      'Ajoute jusqu’à 10 compétences de 40 caractères maximum chacune.',
    )
  return skills
}
