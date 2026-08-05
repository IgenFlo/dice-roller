import type { Die as DieModel } from '../domain/dice'
import type { DieAppearance } from '../domain/dieAppearance'
import { Die } from './Die'
import './DiceGrid.css'

interface DiceGridProps {
  dice: DieModel[]
  scrambledValues: Readonly<Record<number, number>>
  isThrowing: boolean
  appearance: DieAppearance
  onToggleHold: (dieId: number) => void
}

export function DiceGrid({
  dice,
  scrambledValues,
  isThrowing,
  appearance,
  onToggleHold,
}: DiceGridProps) {
  return (
    <ul className="dice-grid">
      {dice.map(die => (
        <li key={die.id}>
          <Die
            die={die}
            displayValue={scrambledValues[die.id] ?? die.value}
            disabled={isThrowing}
            appearance={appearance}
            onToggleHold={onToggleHold}
          />
        </li>
      ))}
    </ul>
  )
}
