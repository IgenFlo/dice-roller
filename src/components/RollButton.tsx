import './RollButton.css'

interface RollButtonProps {
  onRoll: () => void
  disabled: boolean
}

export function RollButton({ onRoll, disabled }: RollButtonProps) {
  return (
    <button type="button" className="roll-button" disabled={disabled} onClick={onRoll}>
      Lancer les dés
    </button>
  )
}
