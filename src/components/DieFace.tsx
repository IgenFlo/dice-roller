import './DieFace.css'

interface DieFaceProps {
  value: number
}

type PipPosition = readonly [number, number]

const LEFT = 26
const CENTER = 50
const RIGHT = 74
const TOP = 26
const MIDDLE = 50
const BOTTOM = 74

const PIP_LAYOUTS: Readonly<Record<number, readonly PipPosition[]>> = {
  1: [[CENTER, MIDDLE]],
  2: [[LEFT, TOP], [RIGHT, BOTTOM]],
  3: [[LEFT, TOP], [CENTER, MIDDLE], [RIGHT, BOTTOM]],
  4: [[LEFT, TOP], [RIGHT, TOP], [LEFT, BOTTOM], [RIGHT, BOTTOM]],
  5: [[LEFT, TOP], [RIGHT, TOP], [CENTER, MIDDLE], [LEFT, BOTTOM], [RIGHT, BOTTOM]],
  6: [[LEFT, TOP], [RIGHT, TOP], [LEFT, MIDDLE], [RIGHT, MIDDLE], [LEFT, BOTTOM], [RIGHT, BOTTOM]],
}

const PIP_RADIUS = 9

export function DieFace({ value }: DieFaceProps) {
  const pipPositions = PIP_LAYOUTS[value] ?? []

  return (
    <svg className="die-face" viewBox="0 0 100 100" role="img" aria-label={`Dé affichant ${value}`}>
      {pipPositions.map(([x, y]) => (
        <circle key={`${x}-${y}`} className="die-face-pip" cx={x} cy={y} r={PIP_RADIUS} />
      ))}
    </svg>
  )
}
