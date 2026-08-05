import { useMemo } from 'react'
import type { Die } from '../domain/dice'
import { diceValues, findObtainedCombinations, type ObtainedCombination } from '../domain/yams'
import { bestNextRollChances, describeKeptValues } from '../domain/yamsChances'
import './YamsPanel.css'

interface YamsPanelProps {
  dice: Die[]
}

const DISPLAYED_CHANCES = 3

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
      chances: bestNextRollChances(values).slice(0, DISPLAYED_CHANCES),
    }
  }, [valuesKey])

  return (
    <section className="yams-panel" aria-label="Analyse Yam's">
      <div className="yams-block">
        <h2 className="yams-title">Dans ce tirage</h2>
        <ul className="yams-obtained">
          {obtained.map(combination => (
            <li key={combination.id}>{formatObtained(combination)}</li>
          ))}
        </ul>
      </div>

      {chances.length > 0 && (
        <div className="yams-block">
          <h2 className="yams-title">Au prochain lancer</h2>
          <ul className="yams-chances">
            {chances.map(chance => (
              <li key={chance.objective.id} className="yams-chance">
                <span className="yams-chance-line">
                  <span className="yams-chance-label">{chance.objective.label}</span>
                  <span className="yams-chance-value">{formatPercentage(chance.probability)}</span>
                </span>
                <span className="yams-chance-hint">{describeKeptValues(chance.keptValues)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
