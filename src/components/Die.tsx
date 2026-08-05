import type { CSSProperties } from 'react'
import type { Die as DieModel } from '../domain/dice'
import { DEFAULT_DIE_APPEARANCE, type DieAppearance } from '../domain/dieAppearance'
import { DieFace } from './DieFace'
import './Die.css'

interface DieProps {
  die: DieModel
  displayValue: number
  disabled: boolean
  onToggleHold: (dieId: number) => void
  appearance?: DieAppearance
}

interface DieStyle extends CSSProperties {
  '--die-background': string
  '--die-pip-color': string
}

export function Die({
  die,
  displayValue,
  disabled,
  onToggleHold,
  appearance = DEFAULT_DIE_APPEARANCE,
}: DieProps) {
  const style: DieStyle = {
    '--die-background': appearance.background,
    '--die-pip-color': appearance.pipColor,
  }

  return (
    <div className="die-slot" data-die-id={die.id} style={style}>
      <button
        type="button"
        className={die.isHeld ? 'die die--held' : 'die'}
        aria-pressed={die.isHeld}
        disabled={disabled}
        onClick={() => onToggleHold(die.id)}
      >
        <DieFace value={displayValue} />
      </button>
      <span className="die-status">{die.isHeld ? 'Bloqué' : ''}</span>
    </div>
  )
}
