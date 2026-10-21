import reactSvg from '../../assets/emblems/react-official.svg'
import pythonSvg from '../../assets/emblems/python-official.svg'
import typescriptSvg from '../../assets/emblems/typescript-official.svg'
import fastapiPng from '../../assets/emblems/fastapi-official.png'
import designSvg from '../../assets/emblems/designsystems.svg'
import openSvg from '../../assets/emblems/opensource.svg'

const technologyLogos: Record<string, string | undefined> = {
  react: reactSvg,
  python: pythonSvg,
  typescript: typescriptSvg,
  fastapi: fastapiPng,
}

export function CommunityEmblem({
  name,
  className = '',
  size = 40,
}: {
  name: string
  className?: string
  size?: number
}) {
  const technologyLogo = technologyLogos[name.trim().toLowerCase()]
  const source =
    technologyLogo ??
    (name === 'Design Systems' || name === 'Creative Coding'
      ? designSvg
      : name === 'Open Source'
        ? openSvg
        : undefined)
  return source ? (
    <img
      src={source}
      alt=""
      width={size}
      height={size}
      className={
        'community-emblem ' +
        (technologyLogo ? 'technology-emblem ' : '') +
        className
      }
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
