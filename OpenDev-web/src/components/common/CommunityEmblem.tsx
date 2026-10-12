import React from 'react'
import reactSvg from '../../assets/emblems/react.svg'
import pythonSvg from '../../assets/emblems/python.svg'
import designSystemsSvg from '../../assets/emblems/designsystems.svg'
import openSourceSvg from '../../assets/emblems/opensource.svg'

interface CommunityEmblemProps {
  name: string
  className?: string
  size?: number
}

export const CommunityEmblem: React.FC<CommunityEmblemProps> = ({
  name,
  className = '',
  size = 40,
}) => {
  const normalized = name.toLowerCase().replace(/\s+/g, '')

  let src = reactSvg
  if (normalized.includes('python')) {
    src = pythonSvg
  } else if (normalized.includes('design')) {
    src = designSystemsSvg
  } else if (normalized.includes('open') || normalized.includes('source')) {
    src = openSourceSvg
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`rounded-xl shrink-0 select-none ${className}`}
    />
  )
}
