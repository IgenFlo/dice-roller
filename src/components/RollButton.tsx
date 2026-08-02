import './RollButton.css'

interface RollButtonProps {
  onRoll: () => void
}

export function RollButton({ onRoll }: RollButtonProps) {
  return (
    <button type="button" className="roll-button" onClick={onRoll}>
      Lancer les dés
    </button>
  )
}
