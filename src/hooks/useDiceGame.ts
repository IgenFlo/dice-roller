import { useState } from 'react'
import {
  DEFAULT_DICE_COUNT,
  createDice,
  resizeDice,
  rollDice,
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
  toggleDieHold: (dieId: number) => void
  setDiceCount: (count: number) => void
  reset: () => void
}

export function useDiceGame(): DiceGame {
  const [dice, setDice] = useState<Die[]>(() => createDice(DEFAULT_DICE_COUNT))
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

  const reset = () => {
    setDice(currentDice => createDice(currentDice.length))
    setHistory([])
  }

  return {
    dice,
    rollCount,
    history,
    roll,
    toggleDieHold: (dieId: number) => setDice(currentDice => toggleHold(currentDice, dieId)),
    setDiceCount: (count: number) => setDice(currentDice => resizeDice(currentDice, count)),
    reset,
  }
}
