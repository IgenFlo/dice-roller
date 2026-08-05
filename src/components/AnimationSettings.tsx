import {
  DEFAULT_THROW_SETTINGS,
  THROW_SETTING_RANGES,
  THROW_SETTING_STEP,
  type AnimationMode,
  type ThrowSettings,
} from '../animation/throwSettings'
import './AnimationSettings.css'

interface AnimationSettingsProps {
  mode: AnimationMode
  onModeChange: (mode: AnimationMode) => void
  settings: ThrowSettings
  onSettingsChange: (settings: ThrowSettings) => void
  modeChangeDisabled: boolean
}

export function AnimationSettings({
  mode,
  onModeChange,
  settings,
  onSettingsChange,
  modeChangeDisabled,
}: AnimationSettingsProps) {
  return (
    <div className="animation-settings">
      <div className="animation-settings-mode" role="group" aria-label="Type d'animation">
        <button
          type="button"
          className={mode === '2d' ? 'animation-settings-mode-active' : ''}
          aria-pressed={mode === '2d'}
          disabled={modeChangeDisabled}
          onClick={() => onModeChange('2d')}
        >
          2D
        </button>
        <button
          type="button"
          className={mode === '3d' ? 'animation-settings-mode-active' : ''}
          aria-pressed={mode === '3d'}
          disabled={modeChangeDisabled}
          onClick={() => onModeChange('3d')}
        >
          3D
        </button>
      </div>
      {THROW_SETTING_RANGES.map(range => (
        <label key={range.key} className="animation-settings-slider">
          <span className="animation-settings-label">{range.label}</span>
          <input
            type="range"
            min={range.min}
            max={range.max}
            step={THROW_SETTING_STEP}
            value={settings[range.key]}
            onChange={event =>
              onSettingsChange({ ...settings, [range.key]: Number(event.target.value) })
            }
          />
          <span className="animation-settings-value">{settings[range.key].toFixed(2)}</span>
        </label>
      ))}
      <button
        type="button"
        className="animation-settings-reset"
        onClick={() => onSettingsChange(DEFAULT_THROW_SETTINGS)}
      >
        Réglages par défaut
      </button>
    </div>
  )
}
