import type { Die as DieModel } from '../domain/dice'
import './Die.css'

interface DieProps {
  die: DieModel
  onToggleHold: (dieId: number) => void
}

const UNROLLED_VALUE_DISPLAY = '–'

export function Die({ die, onToggleHold }: DieProps) {
  return (
    <button
      type="button"
      className={die.isHeld ? 'die die--held' : 'die'}
      aria-pressed={die.isHeld}
      onClick={() => onToggleHold(die.id)}
    >
      <span className="die-value">{die.value ?? UNROLLED_VALUE_DISPLAY}</span>
      <span className="die-status">{die.isHeld ? 'Bloqué' : ' '}</span>
    </button>
  )
}
