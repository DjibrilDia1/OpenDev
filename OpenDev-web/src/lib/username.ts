export const USERNAME_MAX_LENGTH = 30

export function normalizeUsername(value: string): string {
  return Array.from(value.toLowerCase()).slice(0, USERNAME_MAX_LENGTH).join('')
}

export function isValidUsername(value: string): boolean {
  return (
    value.trim().length > 0 &&
    Array.from(value).length <= USERNAME_MAX_LENGTH &&
    value === value.toLowerCase()
  )
}
