import type { Die as DieModel } from '../domain/dice'
import { Die } from './Die'
import './DiceGrid.css'

interface DiceGridProps {
  dice: DieModel[]
  onToggleHold: (dieId: number) => void
}

export function DiceGrid({ dice, onToggleHold }: DiceGridProps) {
  return (
    <ul className="dice-grid">
      {dice.map(die => (
        <li key={die.id}>
          <Die die={die} onToggleHold={onToggleHold} />
        </li>
      ))}
    </ul>
  )
}
