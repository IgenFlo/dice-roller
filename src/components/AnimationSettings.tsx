import {
  DEFAULT_THROW_SETTINGS,
  THROW_SETTING_RANGES,
  THROW_SETTING_STEP,
  type ThrowSettings,
} from '../animation/throwSettings'
import './AnimationSettings.css'

interface AnimationSettingsProps {
  settings: ThrowSettings
  onSettingsChange: (settings: ThrowSettings) => void
}

export function AnimationSettings({ settings, onSettingsChange }: AnimationSettingsProps) {
  return (
    <div className="animation-settings">
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
