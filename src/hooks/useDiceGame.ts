import { useState } from 'react'
import {
  DEFAULT_DICE_COUNT,
  createDice,
  resizeDice,
  rollDice,
  toggleHold,
  type Die,
} from '../domain/dice'

interface DiceGame {
  dice: Die[]
  rollCount: number
  roll: () => void
  toggleDieHold: (dieId: number) => void
  setDiceCount: (count: number) => void
}

export function useDiceGame(): DiceGame {
  const [dice, setDice] = useState<Die[]>(() => createDice(DEFAULT_DICE_COUNT))
  const [rollCount, setRollCount] = useState(0)

  return {
    dice,
    rollCount,
    roll: () => {
      setDice(currentDice => rollDice(currentDice))
      setRollCount(currentCount => currentCount + 1)
    },
    toggleDieHold: (dieId: number) => setDice(currentDice => toggleHold(currentDice, dieId)),
    setDiceCount: (count: number) => setDice(currentDice => resizeDice(currentDice, count)),
  }
}
