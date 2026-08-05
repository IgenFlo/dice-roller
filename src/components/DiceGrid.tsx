import type { Combo } from '../domain/combos'
import type { Die as DieModel } from '../domain/dice'
import type { DieAppearance } from '../domain/dieAppearance'
import { photoFaceFor, type PhotoFaces } from '../domain/photoFaces'
import { Die } from './Die'
import './DiceGrid.css'

interface DiceGridProps {
  dice: DieModel[]
  scrambledValues: Readonly<Record<number, number>>
  isThrowing: boolean
  appearance: DieAppearance
  photoFaces: PhotoFaces
  combo: Combo | null
  onToggleHold: (dieId: number) => void
}

export function DiceGrid({
  dice,
  scrambledValues,
  isThrowing,
  appearance,
  photoFaces,
  combo,
  onToggleHold,
}: DiceGridProps) {
  return (
    <ul className="dice-grid">
      {dice.map(die => {
        const displayValue = scrambledValues[die.id] ?? die.value
        return (
          <li key={die.id}>
            <Die
              die={die}
              displayValue={displayValue}
              photo={photoFaceFor(photoFaces, displayValue)}
              disabled={isThrowing}
              comboTier={combo !== null && combo.dieIds.includes(die.id) ? combo.tier : null}
              appearance={appearance}
              onToggleHold={onToggleHold}
            />
          </li>
        )
      })}
    </ul>
  )
}
