import { useMemo } from 'react'
import type { Die } from '../domain/dice'
import { diceValues, findObtainedCombinations, type ObtainedCombination } from '../domain/yams'
import { bestNextRollChances, describeKeptValues } from '../domain/yamsChances'
import './YamsPanel.css'

interface YamsPanelProps {
  dice: Die[]
}

function formatPercentage(probability: number): string {
  return `${(probability * 100).toFixed(2).replace('.', ',')} %`
}

function formatObtained(combination: ObtainedCombination): string {
  return combination.section === 'upper'
    ? `${combination.score} ${combination.label}`
    : `${combination.label} ${combination.score}`
}

export function YamsPanel({ dice }: YamsPanelProps) {
  const valuesKey = diceValues(dice).join('-')
  // L'énumération exacte coûte quelques millisecondes : inutile de la refaire
  // tant que le tirage n'a pas changé.
  const { obtained, chances } = useMemo(() => {
    const values = valuesKey.split('-').map(Number)
    return {
      obtained: findObtainedCombinations(values),
      chances: bestNextRollChances(values),
    }
  }, [valuesKey])

  return (
    <>
      <aside className="yams-rail yams-rail--left" aria-label="Combinaisons de ce tirage">
        <p className="yams-rail-title">Ce tirage</p>
        <ul className="yams-rail-list">
          {obtained.map(combination => (
            <li key={combination.id}>{formatObtained(combination)}</li>
          ))}
        </ul>
      </aside>

      {chances.length > 0 && (
        <aside className="yams-rail yams-rail--right" aria-label="Combinaisons les plus probables">
          <p className="yams-rail-title">Prochain lancer</p>
          <ul className="yams-rail-list">
            {chances.map(chance => (
              <li key={chance.objective.id}>
                <span>
                  {chance.objective.label}{' '}
                  <span className="yams-rail-value">{formatPercentage(chance.probability)}</span>
                </span>
                <span className="yams-rail-hint">{describeKeptValues(chance.keptValues)}</span>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </>
  )
}
