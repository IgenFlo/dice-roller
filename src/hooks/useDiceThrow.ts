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
const SETTLE_DURATION_MS = 350
const TUMBLE_LINEAR_DIVISOR = 260
const TUMBLE_ANGULAR_DIVISOR = 420

interface DiceThrowAnimation {
  isThrowing: boolean
  scrambledValues: Readonly<Record<number, number>>
}

interface DieSlot {
  element: HTMLElement
  x: number
  y: number
}

interface SettleTween {
  startTime: number
  fromX: number
  fromY: number
  fromAngle: number
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3
}

function shortestAngleToZero(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360
  return normalized > 180 ? normalized - 360 : normalized
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

  useEffect(() => {
    const isNewRoll = rollCount !== lastSeenRollCountRef.current
    lastSeenRollCountRef.current = rollCount
    const arena = arenaRef.current
    if (!isNewRoll || !enabled || arena === null) return

    const throwSettings = settingsRef.current
    const arenaRect = arena.getBoundingClientRect()
    const slots = new Map<number, DieSlot>()
    for (const element of arena.querySelectorAll<HTMLElement>('[data-die-id]')) {
      const rect = element.getBoundingClientRect()
      slots.set(Number(element.dataset.dieId), {
        element,
        x: rect.left - arenaRect.left + rect.width / 2,
        y: rect.top - arenaRect.top + rect.height / 2,
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
    const settleTweens = new Map<number, SettleTween>()
    const tumbleAccumulators = new Map<number, number>()
    const doneIds = new Set<number>()

    setIsThrowing(true)
    setScrambledValues(Object.fromEntries(thrownIds.map(id => [id, randomFaceValue()])))

    let frameId = 0
    let lastTime = performance.now()
    let elapsedSeconds = 0

    const animateFlyingDie = (state: ThrownDie, slot: DieSlot, deltaSeconds: number) => {
      settleTweens.delete(state.id)
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

    const animateSettlingDie = (state: ThrownDie, slot: DieSlot, now: number) => {
      let tween = settleTweens.get(state.id)
      if (tween === undefined) {
        tween = {
          startTime: now,
          fromX: state.x - slot.x,
          fromY: state.y - slot.y,
          fromAngle: shortestAngleToZero(state.angle),
        }
        settleTweens.set(state.id, tween)
        setScrambledValues(current => {
          const next = { ...current }
          delete next[state.id]
          return next
        })
      }

      const progress = Math.min((now - tween.startTime) / SETTLE_DURATION_MS, 1)
      if (progress >= 1) {
        slot.element.style.transform = ''
        doneIds.add(state.id)
        return
      }
      const remaining = 1 - easeOutCubic(progress)
      slot.element.style.transform =
        `translate(${tween.fromX * remaining}px, ${tween.fromY * remaining}px) rotate(${tween.fromAngle * remaining}deg)`
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
          animateSettlingDie(state, slot, now)
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

    return () => {
      cancelAnimationFrame(frameId)
      for (const slot of slots.values()) slot.element.style.transform = ''
    }
  }, [rollCount, arenaRef, enabled])

  return { isThrowing, scrambledValues }
}
