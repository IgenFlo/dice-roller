import type { AnimationMode, ThrowSettings } from '../animation/throwSettings'
import { TESTABLE_COMBO_SIZES } from '../domain/combos'
import { MAX_DICE_COUNT, MIN_DICE_COUNT } from '../domain/dice'
import type { DieAppearance } from '../domain/dieAppearance'
import { AnimationSettings } from './AnimationSettings'
import { DieAppearancePicker } from './DieAppearancePicker'
import './Header.css'

interface HeaderProps {
  diceCount: number
  onDiceCountChange: (count: number) => void
  appearance: DieAppearance
  onAppearanceChange: (appearance: DieAppearance) => void
  onReset: () => void
  onRecenter: () => void
  controlsDisabled: boolean
  animationMode: AnimationMode
  onAnimationModeChange: (mode: AnimationMode) => void
  throwSettings: ThrowSettings
  onThrowSettingsChange: (settings: ThrowSettings) => void
  onForceCombination: (comboSize: number) => void
}

export function Header({
  diceCount,
  onDiceCountChange,
  appearance,
  onAppearanceChange,
  onReset,
  onRecenter,
  controlsDisabled,
  animationMode,
  onAnimationModeChange,
  throwSettings,
  onThrowSettingsChange,
  onForceCombination,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-group">
        <span className="header-label">Nombre de dés</span>
        <div className="header-counter">
          <button
            type="button"
            aria-label="Retirer un dé"
            disabled={controlsDisabled || diceCount <= MIN_DICE_COUNT}
            onClick={() => onDiceCountChange(diceCount - 1)}
          >
            −
          </button>
          <span className="header-count">{diceCount}</span>
          <button
            type="button"
            aria-label="Ajouter un dé"
            disabled={controlsDisabled || diceCount >= MAX_DICE_COUNT}
            onClick={() => onDiceCountChange(diceCount + 1)}
          >
            +
          </button>
        </div>
      </div>
      <div className="header-group">
        <DieAppearancePicker appearance={appearance} onAppearanceChange={onAppearanceChange} />
      </div>
      <div className="header-group">
        <details className="header-settings" name="header-panel">
          <summary>Animation</summary>
          <div className="header-settings-panel">
            <AnimationSettings
              mode={animationMode}
              onModeChange={onAnimationModeChange}
              settings={throwSettings}
              onSettingsChange={onThrowSettingsChange}
              modeChangeDisabled={controlsDisabled}
            />
          </div>
        </details>
        <details className="header-settings" name="header-panel">
          <summary>Tests</summary>
          <div className="header-settings-panel">
            <span className="header-tests-label">Forcer une combinaison</span>
            <div className="header-tests-buttons">
              {TESTABLE_COMBO_SIZES.map(comboSize => (
                <button
                  key={comboSize}
                  type="button"
                  className="header-reset"
                  disabled={controlsDisabled || diceCount < comboSize}
                  onClick={() => onForceCombination(comboSize)}
                >
                  {comboSize} identiques
                </button>
              ))}
            </div>
          </div>
        </details>
        <button
          type="button"
          className="header-reset"
          disabled={controlsDisabled}
          onClick={onRecenter}
        >
          Recentrer
        </button>
        <button type="button" className="header-reset" disabled={controlsDisabled} onClick={onReset}>
          Réinitialiser
        </button>
      </div>
    </header>
  )
}
