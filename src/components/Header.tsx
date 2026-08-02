import { MAX_DICE_COUNT, MIN_DICE_COUNT } from '../domain/dice'
import './Header.css'

interface HeaderProps {
  diceCount: number
  onDiceCountChange: (count: number) => void
}

export function Header({ diceCount, onDiceCountChange }: HeaderProps) {
  return (
    <header className="header">
      <span className="header-label">Nombre de dés</span>
      <div className="header-counter">
        <button
          type="button"
          aria-label="Retirer un dé"
          disabled={diceCount <= MIN_DICE_COUNT}
          onClick={() => onDiceCountChange(diceCount - 1)}
        >
          −
        </button>
        <span className="header-count">{diceCount}</span>
        <button
          type="button"
          aria-label="Ajouter un dé"
          disabled={diceCount >= MAX_DICE_COUNT}
          onClick={() => onDiceCountChange(diceCount + 1)}
        >
          +
        </button>
      </div>
    </header>
  )
}
