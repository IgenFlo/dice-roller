import { useState } from 'react'
import {
  createDice,
  resizeDice,
  rollDice,
  setDiceValues,
  toggleHold,
  type Die,
} from '../domain/dice'
import {
  appendRollHistoryEntry,
  createRollHistoryEntry,
  type RollHistoryEntry,
} from '../domain/rollHistory'

interface DiceGame {
  dice: Die[]
  rollCount: number
  history: RollHistoryEntry[]
  roll: () => void
  applyRollResult: (values: Readonly<Record<number, number>>) => void
  toggleDieHold: (dieId: number) => void
  setDiceCount: (count: number) => void
  reset: () => void
}

export function useDiceGame(initialDiceCount: number): DiceGame {
  const [dice, setDice] = useState<Die[]>(() => createDice(initialDiceCount))
  const [rollCount, setRollCount] = useState(0)
  const [history, setHistory] = useState<RollHistoryEntry[]>([])

  const roll = () => {
    const rolledDice = rollDice(dice)
    const rollNumber = rollCount + 1
    setDice(rolledDice)
    setRollCount(rollNumber)
    setHistory(currentHistory =>
      appendRollHistoryEntry(currentHistory, createRollHistoryEntry(rollNumber, rolledDice)),
    )
  }

  const applyRollResult = (values: Readonly<Record<number, number>>) => {
    const updatedDice = setDiceValues(dice, values)
    const rollNumber = rollCount + 1
    setDice(updatedDice)
    setRollCount(rollNumber)
    setHistory(currentHistory =>
      appendRollHistoryEntry(currentHistory, createRollHistoryEntry(rollNumber, updatedDice)),
    )
  }

  const reset = () => {
    setDice(currentDice => createDice(currentDice.length))
    setHistory([])
  }

  return {
    dice,
    rollCount,
    history,
    roll,
    applyRollResult,
    toggleDieHold: (dieId: number) => setDice(currentDice => toggleHold(currentDice, dieId)),
    setDiceCount: (count: number) => setDice(currentDice => resizeDice(currentDice, count)),
    reset,
  }
}
