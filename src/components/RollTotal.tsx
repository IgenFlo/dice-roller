import './RollTotal.css'

interface RollTotalProps {
  total: number
  isRolling: boolean
}

export function RollTotal({ total, isRolling }: RollTotalProps) {
  return (
    <div className="roll-total" aria-live="polite">
      <span className="roll-total-label">Total</span>
      <span className="roll-total-value">{isRolling ? '…' : total}</span>
    </div>
  )
}
