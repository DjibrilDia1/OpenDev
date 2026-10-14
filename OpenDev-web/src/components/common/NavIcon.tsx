export type NavIconName =
  | 'home'
  | 'communities'
  | 'messages'
  | 'saved'
  | 'notifications'
  | 'events'
const paths: Record<NavIconName, string> = {
  home: 'M12 2 1 11h3v10h6v-7h4v7h6V11h3L12 2Z',
  communities:
    'M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm16 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 12c-4 0-7 2-7 5v4h14v-4c0-3-3-5-7-5ZM3 14c-2 0-3 1-3 3v3h3v-3c0-1 .3-2 1-3H3Zm18 0h-1c.7 1 1 2 1 3v3h3v-3c0-2-1-3-3-3Z',
  messages:
    'M12 2C5.9 2 1 5.7 1 10.3c0 4.3 4.2 7.8 9.6 8.2V23l6-5.3c3.8-1.3 6.4-4.1 6.4-7.4C23 5.7 18.1 2 12 2ZM7 9a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 7 9Zm5 0a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 12 9Zm5 0a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 17 9Z',
  saved: 'M5 2h14v21l-7-5-7 5V2Z',
  notifications:
    'M10 3V2a2 2 0 0 1 4 0v1c3 1 5 3 5 7v5l3 3H2l3-3v-5c0-4 2-6 5-7Zm-1 17h6a3 3 0 0 1-6 0Z',
  events:
    'M6 1h2v3h8V1h2v3h3v18H3V4h3V1Zm-1 8v11h14V9H5Zm2 2h3v3H7v-3Zm6 0h3v3h-3v-3Zm-6 5h3v2H7v-2Zm6 0h3v2h-3v-2Z',
}
export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={paths[name]} fillRule="evenodd" />
    </svg>
  )
}
