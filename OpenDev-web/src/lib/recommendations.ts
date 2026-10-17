import type { Post } from '../types'
// Explicit, bounded weights: follows > memberships > interests > technologies.
const vocabulary: Record<string, string[]> = {
  Frontend: [
    'frontend',
    'react',
    'typescript',
    'javascript',
    'vue',
    'angular',
    'css',
    'html',
    'svelte',
  ],
  Backend: [
    'backend',
    'python',
    'fastapi',
    'django',
    'node',
    'api',
    'java',
    'rust',
    'golang',
    'sql',
  ],
  'Full Stack': [
    'full stack',
    'fullstack',
    'frontend',
    'backend',
    'nextjs',
    'next.js',
  ],
  'Intelligence artificielle': [
    'intelligence artificielle',
    'ia',
    'ai',
    'llm',
    'gpt',
    'data',
  ],
  'Machine Learning': [
    'machine learning',
    'tensorflow',
    'pytorch',
    'modeles',
    'data',
  ],
  'Data Science': ['data', 'science', 'pandas', 'analytics', 'sql'],
  DevOps: ['devops', 'docker', 'kubernetes', 'ci', 'terraform'],
  Cloud: ['cloud', 'aws', 'azure', 'gcp', 'supabase', 'firebase'],
  Cybersécurité: ['cybersecurite', 'securite', 'security', 'auth', 'pentest'],
  Mobile: [
    'mobile',
    'android',
    'ios',
    'flutter',
    'react native',
    'swift',
    'kotlin',
  ],
  'Open Source': ['open source', 'opensource', 'contribution', 'github'],
  'UI/UX': ['design', 'ui', 'ux', 'figma', 'accessibilite'],
  Gaming: ['gaming', 'jeu', 'jeux', 'game', 'unity', 'unreal', 'godot'],
  Web3: ['web3', 'blockchain', 'ethereum', 'solidity'],
  Startups: ['startup', 'startups', 'saas', 'produit'],
  Entrepreneuriat: ['entrepreneuriat', 'entrepreneurship', 'entrepreneur', 'business'],
  'Architecture logicielle': ['architecture', 'microservices', 'system design', 'ddd'],
}
function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim()
}
export function interestScore(text: string, topics: string[]): number {
  const tokens = ' ' + normalize(text) + ' '
  return topics.reduce(
    (score, topic) =>
      score +
      Number(
        (vocabulary[topic] ?? [topic.toLowerCase()]).some((word) =>
          tokens.includes(' ' + normalize(word) + ' '),
        ),
      ),
    0,
  )
}

export function feedScore(post: Post, preferences: { following: string[]; joined: string[]; interests: string[]; technologies: string[] }): number {
  const text = [post.title, post.content, post.communityName, ...post.tags].join(' ')
  const followed = !!post.author.id && preferences.following.includes(post.author.id)
  const member = preferences.joined.includes(post.communitySlug ?? '')
  const interests = Math.min(interestScore(text, preferences.interests), 8)
  const technologies = Math.min(interestScore(text, preferences.technologies), 10)
  const relevant = followed || member || interests > 0 || technologies > 0
  const engagement = relevant ? Math.min(9, Math.log2(1 + Math.max(0, post.likesCount) + Math.max(0, post.repliesCount) * 2)) : 0
  return Number(followed) * 1000 + Number(member) * 500 + interests * 20 + technologies * 10 + engagement
}
