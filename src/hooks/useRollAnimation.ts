import { useEffect, useRef, useState } from 'react'
import { randomFaceValue } from '../domain/dice'

export const ROLL_ANIMATION_DURATION_MS = 600
const SCRAMBLE_INTERVAL_MS = 80

export function useRollAnimation(rollCount: number, enabled: boolean): number | null {
  const [scrambledValue, setScrambledValue] = useState<number | null>(null)
  // Un dé monté après des lancers (ajout via le header) ne doit pas s'animer à l'apparition,
  // et un dé débloqué ne doit pas rejouer le lancer précédent.
  const lastSeenRollCountRef = useRef(rollCount)

  useEffect(() => {
    const isNewRoll = rollCount !== lastSeenRollCountRef.current
    lastSeenRollCountRef.current = rollCount
    if (!isNewRoll || !enabled) return

    setScrambledValue(randomFaceValue())
    const scrambleInterval = setInterval(() => {
      setScrambledValue(randomFaceValue())
    }, SCRAMBLE_INTERVAL_MS)
    const stopTimeout = setTimeout(() => {
      clearInterval(scrambleInterval)
      setScrambledValue(null)
    }, ROLL_ANIMATION_DURATION_MS)

    return () => {
      clearInterval(scrambleInterval)
      clearTimeout(stopTimeout)
      setScrambledValue(null)
    }
  }, [rollCount, enabled])

  return scrambledValue
}
