import reactSvg from '../../assets/emblems/react.svg'
import pythonSvg from '../../assets/emblems/python.svg'
import designSvg from '../../assets/emblems/designsystems.svg'
import openSvg from '../../assets/emblems/opensource.svg'
export function CommunityEmblem({
  name,
  className = '',
  size = 40,
}: {
  name: string
  className?: string
  size?: number
}) {
  const source =
    name === 'React'
      ? reactSvg
      : name === 'Python' || name === 'FastAPI'
        ? pythonSvg
        : name === 'Design Systems' || name === 'Creative Coding'
          ? designSvg
          : name === 'Open Source'
            ? openSvg
            : undefined
  return source ? (
    <img
      src={source}
      alt=""
      width={size}
      height={size}
      className={'community-emblem ' + className}
    />
  ) : (
    <span
      aria-hidden="true"
      className={'community-emblem letter-emblem ' + className}
      style={{ width: size, height: size }}
    >
      {name === 'TypeScript'
        ? 'TS'
        : name === 'DevOps & Cloud'
          ? '⌘'
          : name === 'IA & Data'
            ? '✳'
            : name.slice(0, 2)}
    </span>
  )
}
