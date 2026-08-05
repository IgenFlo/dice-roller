import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  createThrownDie,
  resolveDiceCollisions,
  stepThrownDie,
  thrownDieLiftScale,
  type ThrowArena,
  type ThrownDie,
} from '../animation/diceThrowPhysics'
import type { ThrowSettings } from '../animation/throwSettings'
import { randomFaceValue, type Die } from '../domain/dice'

const MAX_THROW_DURATION_S = 2.5
const MAX_FRAME_DELTA_S = 0.032
const RECENTER_DURATION_MS = 400
const TUMBLE_LINEAR_DIVISOR = 260
const TUMBLE_ANGULAR_DIVISOR = 420

interface DiceThrowAnimation {
  isThrowing: boolean
  scrambledValues: Readonly<Record<number, number>>
  recenter: () => void
}

interface DieSlot {
  element: HTMLElement
  x: number
  y: number
}

export function useDiceThrow(
  dice: readonly Die[],
  rollCount: number,
  arenaRef: RefObject<HTMLDivElement | null>,
  settings: ThrowSettings,
  enabled: boolean,
): DiceThrowAnimation {
  const [isThrowing, setIsThrowing] = useState(false)
  const [scrambledValues, setScrambledValues] = useState<Record<number, number>>({})
  const lastSeenRollCountRef = useRef(rollCount)
  const diceRef = useRef(dice)
  const settingsRef = useRef(settings)

  useEffect(() => {
    diceRef.current = dice
    settingsRef.current = settings
  })

  const recenter = () => {
    const arena = arenaRef.current
    if (arena === null) return
    for (const element of arena.querySelectorAll<HTMLElement>('[data-die-id]')) {
      if (element.style.transform === '') continue
      element.classList.add('die-slot--recentering')
      element.style.transform = ''
      window.setTimeout(
        () => element.classList.remove('die-slot--recentering'),
        RECENTER_DURATION_MS,
      )
    }
  }

  useEffect(() => {
    const isNewRoll = rollCount !== lastSeenRollCountRef.current
    lastSeenRollCountRef.current = rollCount
    const arena = arenaRef.current
    if (!isNewRoll || !enabled || arena === null) return

    const throwSettings = settingsRef.current
    const arenaRect = arena.getBoundingClientRect()
    const slots = new Map<number, DieSlot>()
    for (const element of arena.querySelectorAll<HTMLElement>('[data-die-id]')) {
      element.classList.remove('die-slot--recentering')
      const rect = element.getBoundingClientRect()
      slots.set(Number(element.dataset.dieId), {
        element,
        x: rect.left - arenaRect.left + rect.width / 2 - readTranslation(element, 'x'),
        y: rect.top - arenaRect.top + rect.height / 2 - readTranslation(element, 'y'),
      })
    }

    const thrownIds = diceRef.current
      .filter(die => !die.isHeld && slots.has(die.id))
      .map(die => die.id)
    const firstSlot = slots.get(thrownIds[0] ?? -1)
    if (firstSlot === undefined) return

    const throwArena: ThrowArena = {
      width: arenaRect.width,
      height: arenaRect.height,
      dieSize: firstSlot.element.getBoundingClientRect().width,
    }

    let states: ThrownDie[] = thrownIds.map(id =>
      createThrownDie(id, throwArena, throwSettings, Math.random),
    )
    const tumbleAccumulators = new Map<number, number>()
    const doneIds = new Set<number>()

    setIsThrowing(true)
    setScrambledValues(Object.fromEntries(thrownIds.map(id => [id, randomFaceValue()])))

    let frameId = 0
    let lastTime = performance.now()
    let elapsedSeconds = 0

    const animateFlyingDie = (state: ThrownDie, slot: DieSlot, deltaSeconds: number) => {
      const offsetX = state.x - slot.x
      const offsetY = state.y - slot.y
      slot.element.style.transform =
        `translate(${offsetX}px, ${offsetY}px) rotate(${state.angle}deg) scale(${thrownDieLiftScale(state)})`

      const speed = Math.hypot(state.velocityX, state.velocityY)
      const tumbleProgress =
        deltaSeconds *
        (speed / TUMBLE_LINEAR_DIVISOR + Math.abs(state.angularVelocity) / TUMBLE_ANGULAR_DIVISOR)
      const accumulated = (tumbleAccumulators.get(state.id) ?? 0) + tumbleProgress
      if (accumulated < 1) {
        tumbleAccumulators.set(state.id, accumulated)
        return
      }
      tumbleAccumulators.set(state.id, 0)
      setScrambledValues(current => ({ ...current, [state.id]: randomFaceValue() }))
    }

    // Le dé reste là où il s'est arrêté : on fige sa transform et on révèle sa valeur.
    const finalizeStoppedDie = (state: ThrownDie, slot: DieSlot) => {
      slot.element.style.transform =
        `translate(${state.x - slot.x}px, ${state.y - slot.y}px) rotate(${state.angle}deg)`
      doneIds.add(state.id)
      setScrambledValues(current => {
        const next = { ...current }
        delete next[state.id]
        return next
      })
    }

    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA_S)
      lastTime = now
      elapsedSeconds += deltaSeconds

      states = resolveDiceCollisions(
        states.map(state => stepThrownDie(state, throwArena, throwSettings, deltaSeconds)),
        throwArena,
        throwSettings,
      )
      if (elapsedSeconds > MAX_THROW_DURATION_S) {
        states = states.map(state => ({ ...state, stopped: true, height: 0 }))
      }

      for (const state of states) {
        const slot = slots.get(state.id)
        if (slot === undefined) continue
        if (state.stopped) {
          finalizeStoppedDie(state, slot)
        } else {
          animateFlyingDie(state, slot, deltaSeconds)
        }
      }

      states = states.filter(state => !doneIds.has(state.id))
      if (states.length === 0) {
        setIsThrowing(false)
        setScrambledValues({})
        return
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [rollCount, arenaRef, enabled])

  return { isThrowing, scrambledValues, recenter }
}

// Les slots doivent être mesurés à leur position de grille : si un dé est resté
// déplacé d'un lancer précédent, sa transform fausse getBoundingClientRect.
function readTranslation(element: HTMLElement, axis: 'x' | 'y'): number {
  const transform = element.style.transform
  const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(transform)
  if (match === null) return 0
  return Number(axis === 'x' ? match[1] : match[2])
}
