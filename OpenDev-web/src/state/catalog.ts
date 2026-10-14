import {
  aminaUser,
  usersList,
  currentUser,
  communities,
  homeFeedPosts,
  reactCommunityPosts,
  aminaContributions,
  djibrilContributions,
} from '../mocks/opendev-data'
import type { Community, Post, User } from '../types'
import reactBanner from '../assets/images/decouvrir_banner_1.png'
import pythonBanner from '../assets/images/decouvrir_banner_3.png'
import designBanner from '../assets/images/decouvrir_banner_5.png'
import openBanner from '../assets/images/decouvrir_banner_7.png'
import genericBanner from '../assets/emblems/community.svg'

export const interests = [
  'Frontend',
  'Backend',
  'Full Stack',
  'Intelligence artificielle',
  'Machine Learning',
  'Data Science',
  'DevOps',
  'Cloud',
  'Cybersécurité',
  'Mobile',
  'Open Source',
  'UI/UX',
  'Gaming',
]
export const categories = [
  'Tout',
  'Frontend',
  'Backend',
  'Design',
  'Open source',
  'IA & Data',
  'DevOps',
  'Mobile',
  'Gaming',
  'Sécurité',
] as const
export const people: User[] = [
  currentUser,
  aminaUser,
  ...usersList.filter((user) => !user.isSelf),
  {
    id: 'usr-mod',
    name: 'Équipe modération',
    handle: '@mod.team',
    avatarInitials: 'OD',
    roleTitle: 'Au service de la communauté',
    bio: 'Un espace accueillant pour apprendre et construire ensemble.',
    contributionsCount: 0,
    communitiesCount: 0,
    tags: ['Communauté', 'Entraide'],
  },
]
export const profilePath = (handle: string) =>
  '/profil/' + encodeURIComponent(handle.replace('@', ''))
export function findPerson(handle: string) {
  return people.find(
    (user) =>
      user.handle.slice(1) === handle ||
      user.handle.slice(1).split('.')[0] === handle ||
      (['me', 'djibril'].includes(handle) && user.isSelf),
  )
}
const extra: [string, string, Community['category'], string][] = [
  [
    'typescript',
    'TypeScript',
    'Frontend',
    'Des types qui aident vraiment. Partage tes patterns et tes questions.',
  ],
  [
    'fastapi',
    'FastAPI',
    'Backend',
    'Des API Python claires, rapides et faciles à maintenir.',
  ],
  [
    'ia-data',
    'IA & Data',
    'IA & Data',
    'Expérimentations, modèles ouverts et données bien préparées.',
  ],
  [
    'devops-cloud',
    'DevOps & Cloud',
    'DevOps',
    'Du premier conteneur au déploiement serein, apprenons ensemble.',
  ],
  [
    'mobile',
    'Mobile Makers',
    'Mobile',
    'Construisons des applications mobiles qui font la différence.',
  ],
  [
    'creative-coding',
    'Creative Coding',
    'Design',
    'Le code comme matière créative : web, interactions et mouvement.',
  ],
  [
    'gamedev',
    'Game Dev',
    'Gaming',
    'Prototypes, moteurs et petites aventures à créer ensemble.',
  ],
  [
    'security',
    'Security Lab',
    'Sécurité',
    'Comprendre les vulnérabilités et construire des applications robustes.',
  ],
]
export const communityCatalog: Community[] = [
  ...communities,
  ...extra.map(([slug, name, category, description], index) => ({
    id: 'comm-' + slug,
    slug,
    name,
    category,
    description,
    color: '#202020',
    bgColor: '#f1f1f1',
    memberCount: (3200 + index * 420).toLocaleString('fr-FR') + ' membres',
    weeklyDiscussionsCount: 8 + index * 2,
  })),
]
export const communityArt = (category: string) =>
  category === 'Frontend'
    ? reactBanner
    : category === 'Backend'
      ? pythonBanner
      : category === 'Design'
        ? designBanner
        : category === 'Open source'
          ? openBanner
          : genericBanner
export const matches = (text: string, query: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .includes(
      query
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim(),
    )
export const seedPosts: Post[] = [
  ...homeFeedPosts.map((post, index) => ({
    ...post,
    communityName: index ? 'TypeScript' : 'React',
    communitySlug: index ? 'typescript' : 'react',
    tags: index
      ? ['TypeScript', 'bonnes-pratiques']
      : ['React', 'apprentissage'],
  })),
  ...reactCommunityPosts
    .filter((post) => !post.isPinned)
    .map((post) => ({
      ...post,
      communityName: 'React',
      communitySlug: 'react',
    })),
  ...djibrilContributions.map((post) => ({
    ...post,
    communityName: 'Open Source',
    communitySlug: 'open-source',
  })),
  ...aminaContributions.slice(1).map((post) => ({
    ...post,
    communityName: 'Design Systems',
    communitySlug: 'design-systems',
  })),
  {
    id: 'post-python',
    author: { name: 'Sarah Benali', handle: '@sarah.py', initials: 'SB' },
    timeAgo: '1 h',
    title: 'Une petite API, une grande première.',
    content:
      'Mon premier projet FastAPI est en ligne ! Le plus instructif : écrire des messages d’erreur qui aident vraiment. Vous commencez par quoi quand vous documentez une API ?',
    tags: ['Python', 'FastAPI'],
    likesCount: 24,
    repliesCount: 0,
    communityName: 'Python',
    communitySlug: 'python',
    category: 'Discussion',
  },
  {
    id: 'post-design',
    author: { name: 'Léa Moreau', handle: '@lea.design', initials: 'LM' },
    timeAgo: '2 h',
    title: 'Un langage commun entre design et code.',
    content:
      'Quelques explorations pour notre prochain design system. Moins de variantes, plus de cohérence. Vous documentez comment vos décisions de design ?',
    tags: ['UI/UX', 'Design'],
    likesCount: 32,
    repliesCount: 0,
    communityName: 'Design Systems',
    communitySlug: 'design-systems',
    media: [
      {
        id: 'design-art',
        url: designBanner,
        name: 'Exploration graphique d’un système de formes géométriques',
        type: 'image',
      },
    ],
  },
]
export function relatedCommunities(topics: string[]) {
  const categoryFor: Record<string, string[]> = {
    Frontend: ['Frontend'],
    Backend: ['Backend'],
    'Full Stack': ['Frontend', 'Backend'],
    'Intelligence artificielle': ['IA & Data'],
    'Machine Learning': ['IA & Data'],
    'Data Science': ['IA & Data'],
    DevOps: ['DevOps'],
    Cloud: ['DevOps'],
    Cybersécurité: ['Sécurité'],
    Mobile: ['Mobile'],
    'Open Source': ['Open source'],
    'UI/UX': ['Design'],
    Gaming: ['Gaming'],
  }
  const selected = new Set(topics.flatMap((topic) => categoryFor[topic] ?? []))
  return communityCatalog.filter((community) =>
    selected.has(community.category),
  )
}

// Fixed reference for fixture dates; locally created posts carry their own timestamp.
const demoReference = Date.now()
export function publicationTime(post: Post) {
  if (post.createdAt) return post.createdAt
  const amount = Number.parseInt(post.timeAgo, 10) || 1
  if (post.timeAgo.includes('min')) return demoReference - amount * 60_000
  if (/\d+ h/.test(post.timeAgo)) return demoReference - amount * 3_600_000
  if (post.timeAgo === 'Hier') return demoReference - 86_400_000
  return demoReference - (14 - Math.min(amount, 12)) * 86_400_000
}
