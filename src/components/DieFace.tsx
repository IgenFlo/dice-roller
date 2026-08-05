import { PIP_LAYOUTS, PIP_RADIUS } from '../domain/dieFaces'
import './DieFace.css'

interface DieFaceProps {
  value: number
  photo?: string | null
}

export function DieFace({ value, photo = null }: DieFaceProps) {
  if (photo !== null) {
    return <img className="die-face-photo" src={photo} alt={`Dé affichant la photo ${value}`} />
  }

  const pipPositions = PIP_LAYOUTS[value] ?? []

  return (
    <svg className="die-face" viewBox="0 0 100 100" role="img" aria-label={`Dé affichant ${value}`}>
      {pipPositions.map(([x, y]) => (
        <circle key={`${x}-${y}`} className="die-face-pip" cx={x} cy={y} r={PIP_RADIUS} />
      ))}
    </svg>
  )
}
