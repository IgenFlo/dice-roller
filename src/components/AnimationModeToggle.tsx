import type { AnimationMode } from '../animation/throwSettings'
import './AnimationModeToggle.css'

interface AnimationModeToggleProps {
  mode: AnimationMode
  onModeChange: (mode: AnimationMode) => void
  disabled: boolean
}

const MODES: readonly AnimationMode[] = ['2d', '3d']

export function AnimationModeToggle({ mode, onModeChange, disabled }: AnimationModeToggleProps) {
  return (
    <div className="animation-mode-toggle" role="group" aria-label="Type d'animation">
      {MODES.map(candidate => (
        <button
          key={candidate}
          type="button"
          className={mode === candidate ? 'animation-mode-toggle-active' : ''}
          aria-pressed={mode === candidate}
          disabled={disabled}
          onClick={() => onModeChange(candidate)}
        >
          {candidate.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
