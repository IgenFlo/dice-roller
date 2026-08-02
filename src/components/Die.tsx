import type { CSSProperties } from 'react'
import type { Die as DieModel } from '../domain/dice'
import { DEFAULT_DIE_APPEARANCE, type DieAppearance } from '../domain/dieAppearance'
import { useRollAnimation } from '../hooks/useRollAnimation'
import { DieFace } from './DieFace'
import './Die.css'

interface DieProps {
  die: DieModel
  rollCount: number
  onToggleHold: (dieId: number) => void
  appearance?: DieAppearance
}

interface DieStyle extends CSSProperties {
  '--die-background': string
  '--die-pip-color': string
}

export function Die({ die, rollCount, onToggleHold, appearance = DEFAULT_DIE_APPEARANCE }: DieProps) {
  const scrambledValue = useRollAnimation(rollCount, !die.isHeld)
  const isRolling = scrambledValue !== null
  const style: DieStyle = {
    '--die-background': appearance.background,
    '--die-pip-color': appearance.pipColor,
  }

  return (
    <button
      type="button"
      className={die.isHeld ? 'die die--held' : 'die'}
      style={style}
      aria-pressed={die.isHeld}
      onClick={() => onToggleHold(die.id)}
    >
      <DieFace value={scrambledValue ?? die.value} isRolling={isRolling} />
      <span className="die-status">{die.isHeld ? 'Bloqué' : ' '}</span>
    </button>
  )
}
