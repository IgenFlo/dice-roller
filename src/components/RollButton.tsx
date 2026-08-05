import { useRef, type MouseEvent, type PointerEvent } from 'react'
import {
  appendSample,
  swipeImpulse,
  type PointerSample,
  type ThrowImpulse,
} from '../animation/throwGesture'
import './RollButton.css'

interface RollButtonProps {
  onRoll: (impulse: ThrowImpulse | null) => void
  onAimingChange: (isAiming: boolean) => void
  disabled: boolean
}

interface Gesture {
  samples: PointerSample[]
  thrown: boolean
}

export function RollButton({ onRoll, onAimingChange, disabled }: RollButtonProps) {
  const gestureRef = useRef<Gesture | null>(null)

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    // La capture garde le geste vivant même si le doigt sort du bouton en montant.
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = {
      samples: [{ x: event.clientX, y: event.clientY, time: event.timeStamp }],
      thrown: false,
    }
    onAimingChange(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current
    if (gesture === null || gesture.thrown) return
    gesture.samples = appendSample(gesture.samples, {
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
    })
    const impulse = swipeImpulse(gesture.samples, event.timeStamp)
    if (impulse === null) return
    // Le lancer part dès que le swipe est reconnu, sans attendre le relâchement.
    gesture.thrown = true
    onAimingChange(false)
    onRoll(impulse)
  }

  const handlePointerUp = () => {
    const gesture = gestureRef.current
    if (gesture === null) return
    gestureRef.current = null
    onAimingChange(false)
    if (!gesture.thrown) onRoll(null)
  }

  // Geste repris par le navigateur : on rend l'interface sans rien lancer.
  const handlePointerCancel = () => {
    gestureRef.current = null
    onAimingChange(false)
  }

  // `detail === 0` isole les activations au clavier, les seules à ne pas passer
  // par les évènements pointeur.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) onRoll(null)
  }

  return (
    <button
      type="button"
      className="roll-button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      Lancer les dés
    </button>
  )
}
