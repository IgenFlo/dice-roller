import type { CSSProperties } from 'react'
import type { ComboTier } from '../domain/combos'
import type { Die as DieModel } from '../domain/dice'
import { DEFAULT_DIE_APPEARANCE, type DieAppearance } from '../domain/dieAppearance'
import { DieFace } from './DieFace'
import { DieFlames } from './DieFlames'
import './Die.css'

interface DieProps {
  die: DieModel
  displayValue: number
  photo: string | null
  disabled: boolean
  comboTier: ComboTier | null
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
  photo,
  disabled,
  comboTier,
  onToggleHold,
  appearance = DEFAULT_DIE_APPEARANCE,
}: DieProps) {
  const style: DieStyle = {
    '--die-background': appearance.background,
    '--die-pip-color': appearance.pipColor,
  }

  return (
    <div className="die-slot" data-die-id={die.id} style={style}>
      {comboTier !== null && <DieFlames tier={comboTier} />}
      <button
        type="button"
        className={die.isHeld ? 'die die--held' : 'die'}
        aria-pressed={die.isHeld}
        disabled={disabled}
        onClick={() => onToggleHold(die.id)}
      >
        <DieFace value={displayValue} photo={photo} />
      </button>
      <span className="die-status">{die.isHeld ? 'Bloqué' : ''}</span>
    </div>
  )
}
