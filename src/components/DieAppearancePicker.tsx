import type { DieAppearance } from '../domain/dieAppearance'
import './DieAppearancePicker.css'

interface DieAppearancePickerProps {
  appearance: DieAppearance
  onAppearanceChange: (appearance: DieAppearance) => void
}

export function DieAppearancePicker({ appearance, onAppearanceChange }: DieAppearancePickerProps) {
  return (
    <div className="die-appearance-picker">
      <label className="die-appearance-picker-field">
        Fond
        <input
          type="color"
          value={appearance.background}
          onChange={event => onAppearanceChange({ ...appearance, background: event.target.value })}
        />
      </label>
      <label className="die-appearance-picker-field">
        Points
        <input
          type="color"
          value={appearance.pipColor}
          onChange={event => onAppearanceChange({ ...appearance, pipColor: event.target.value })}
        />
      </label>
    </div>
  )
}
