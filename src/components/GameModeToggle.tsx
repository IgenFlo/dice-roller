import { GAME_MODE_LABELS, type GameMode } from '../domain/gameMode'
import './GameModeToggle.css'

interface GameModeToggleProps {
  mode: GameMode
  onModeChange: (mode: GameMode) => void
  disabled: boolean
}

const MODES: readonly GameMode[] = ['classic', 'photos']

export function GameModeToggle({ mode, onModeChange, disabled }: GameModeToggleProps) {
  return (
    <div className="game-mode-toggle" role="group" aria-label="Mode de jeu">
      {MODES.map(candidate => (
        <button
          key={candidate}
          type="button"
          className={mode === candidate ? 'game-mode-toggle-active' : ''}
          aria-pressed={mode === candidate}
          disabled={disabled}
          onClick={() => onModeChange(candidate)}
        >
          {GAME_MODE_LABELS[candidate]}
        </button>
      ))}
    </div>
  )
}
