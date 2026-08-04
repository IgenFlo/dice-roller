import type { RollHistoryEntry } from '../domain/rollHistory'
import './RollHistory.css'

interface RollHistoryProps {
  entries: RollHistoryEntry[]
}

export function RollHistory({ entries }: RollHistoryProps) {
  if (entries.length === 0) return null

  return (
    <section className="roll-history" aria-label="Historique des lancers">
      <h2 className="roll-history-title">Historique</h2>
      <ol className="roll-history-list">
        {entries.map(entry => (
          <li key={entry.id} className="roll-history-entry">
            {entry.values.length > 1 && (
              <span className="roll-history-values">{entry.values.join(' + ')} =</span>
            )}
            <span className="roll-history-total">{entry.total}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
