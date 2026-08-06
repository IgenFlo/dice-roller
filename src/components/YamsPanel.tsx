import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Die } from '../domain/dice'
import { diceValues, findObtainedCombinations, type ObtainedCombination } from '../domain/yams'
import { bestNextRollChances, describeKeptValues } from '../domain/yamsChances'
import './YamsPanel.css'

interface YamsPanelProps {
  dice: Die[]
}

/** Une flèche fait défiler d'un écran de liste, en gardant une ligne de repère. */
const SCROLL_STEP_RATIO = 0.8

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

  const listRef = useRef<HTMLUListElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  // Le bandeau reste traversant : la liste ne se déplace que par les flèches,
  // donc sa position est mesurée à chaque changement de tirage ou de format.
  const refreshScrollState = useCallback(() => {
    const list = listRef.current
    if (list === null) return
    setCanScrollUp(list.scrollTop > 1)
    setCanScrollDown(list.scrollTop < list.scrollHeight - list.clientHeight - 1)
  }, [])

  useEffect(() => {
    // Un nouveau tirage rebat le classement : la lecture reprend en haut.
    if (listRef.current !== null) listRef.current.scrollTop = 0
    refreshScrollState()
    window.addEventListener('resize', refreshScrollState)
    return () => window.removeEventListener('resize', refreshScrollState)
  }, [refreshScrollState, valuesKey])

  const scrollList = (direction: 1 | -1) => {
    const list = listRef.current
    if (list === null) return
    list.scrollBy({ top: direction * list.clientHeight * SCROLL_STEP_RATIO, behavior: 'smooth' })
  }

  const isScrollable = canScrollUp || canScrollDown

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
          {isScrollable && (
            <button
              type="button"
              className="yams-rail-scroll"
              aria-label="Voir les combinaisons plus probables"
              disabled={!canScrollUp}
              onClick={() => scrollList(-1)}
            >
              <span aria-hidden="true">▴</span>
            </button>
          )}
          <ul className="yams-rail-list" ref={listRef} onScroll={refreshScrollState}>
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
          {isScrollable && (
            <button
              type="button"
              className="yams-rail-scroll"
              aria-label="Voir les combinaisons moins probables"
              disabled={!canScrollDown}
              onClick={() => scrollList(1)}
            >
              <span aria-hidden="true">▾</span>
            </button>
          )}
        </aside>
      )}
    </>
  )
}
