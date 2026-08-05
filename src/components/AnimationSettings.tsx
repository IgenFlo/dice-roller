import type { AnimationMode, ThrowSettings } from '../animation/throwSettings'
import './AnimationSettings.css'

interface AnimationSettingsProps {
  mode: AnimationMode
  onModeChange: (mode: AnimationMode) => void
  settings: ThrowSettings
  onSettingsChange: (settings: ThrowSettings) => void
  modeChangeDisabled: boolean
}

const SLIDERS = [
  { key: 'launchPower', label: 'Puissance du lancer', min: 0.5, max: 2, step: 0.05 },
  { key: 'bounciness', label: 'Rebond', min: 0, max: 0.9, step: 0.05 },
  { key: 'friction', label: 'Friction', min: 0.4, max: 2.5, step: 0.05 },
] as const

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
      {SLIDERS.map(slider => (
        <label key={slider.key} className="animation-settings-slider">
          <span className="animation-settings-label">{slider.label}</span>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={settings[slider.key]}
            onChange={event =>
              onSettingsChange({ ...settings, [slider.key]: Number(event.target.value) })
            }
          />
          <span className="animation-settings-value">{settings[slider.key].toFixed(2)}</span>
        </label>
      ))}
    </div>
  )
}
