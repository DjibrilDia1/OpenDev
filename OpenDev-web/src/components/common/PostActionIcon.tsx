type Action =
  | 'bookmark'
  | 'link'
  | 'user'
  | 'hide'
  | 'mute'
  | 'flag'
  | 'help'
  | 'edit'
  | 'trash'
  | 'shield'

const paths: Record<Action, string> = {
  bookmark: 'M6 3h12v18l-6-4-6 4Z',
  link: 'm10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  hide: 'm3 3 18 18M9.5 9.5a3.5 3.5 0 0 0 5 5M10 5c5-1 9 4 11 7a22 22 0 0 1-4 4M6.5 6.5A23 23 0 0 0 2 12c3 5 8 8 13 6',
  mute: 'M11 5 6 9H3v6h3l5 4Zm5 4 6 6m0-6-6 6',
  flag: 'M5 22V3c5-3 9 3 14 0v10c-5 3-9-3-14 0',
  help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  edit: 'm15 4 5 5M4 20l5-1L21 7a3.5 3.5 0 0 0-5-5L4 14Z',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  shield: 'M12 2 3 6v6c0 5 5 8 9 10 4-2 9-5 9-10V6Zm-5 10 3 3 7-7',
}

export function PostActionIcon({ name }: { name: Action }) {
  return (
    <svg
      className="post-action-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
