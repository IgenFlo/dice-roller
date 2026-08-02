import type { Die as DieModel } from '../domain/dice'
import type { DieAppearance } from '../domain/dieAppearance'
import { Die } from './Die'
import './DiceGrid.css'

interface DiceGridProps {
  dice: DieModel[]
  rollCount: number
  appearance: DieAppearance
  onToggleHold: (dieId: number) => void
}

export function DiceGrid({ dice, rollCount, appearance, onToggleHold }: DiceGridProps) {
  return (
    <ul className="dice-grid">
      {dice.map(die => (
        <li key={die.id}>
          <Die die={die} rollCount={rollCount} appearance={appearance} onToggleHold={onToggleHold} />
        </li>
      ))}
    </ul>
  )
}
