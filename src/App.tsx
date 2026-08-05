import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_THROW_SETTINGS,
  type AnimationMode,
  type ThrowSettings,
} from './animation/throwSettings'
import { DiceGrid } from './components/DiceGrid'
import { Header } from './components/Header'
import { RollButton } from './components/RollButton'
import { RollHistory } from './components/RollHistory'
import { RollTotal } from './components/RollTotal'
import { sumDice } from './domain/dice'
import { DEFAULT_DIE_APPEARANCE, type DieAppearance } from './domain/dieAppearance'
import { useDiceGame } from './hooks/useDiceGame'
import { useDiceThrow } from './hooks/useDiceThrow'
import './App.css'

const DiceScene3D = lazy(() =>
  import('./components/DiceScene3D').then(module => ({ default: module.DiceScene3D })),
)

function App() {
  const { dice, rollCount, history, roll, applyRollResult, toggleDieHold, setDiceCount, reset } =
    useDiceGame()
  const [appearance, setAppearance] = useState<DieAppearance>(DEFAULT_DIE_APPEARANCE)
  const [animationMode, setAnimationMode] = useState<AnimationMode>('2d')
  const [throwSettings, setThrowSettings] = useState<ThrowSettings>(DEFAULT_THROW_SETTINGS)
  const [throwRequest3d, setThrowRequest3d] = useState(0)
  const [isThrowing3d, setIsThrowing3d] = useState(false)

  const arenaRef = useRef<HTMLDivElement>(null)
  const { isThrowing: isThrowing2d, scrambledValues } = useDiceThrow(
    dice,
    rollCount,
    arenaRef,
    throwSettings,
    animationMode === '2d',
  )
  const isThrowing = animationMode === '2d' ? isThrowing2d : isThrowing3d

  const handleRoll = () => {
    if (isThrowing) return
    if (animationMode === '2d') {
      roll()
      return
    }
    setIsThrowing3d(true)
    setThrowRequest3d(count => count + 1)
  }

  const handleRollResolved = (values: Readonly<Record<number, number>>) => {
    applyRollResult(values)
    setIsThrowing3d(false)
  }

  const handleReset = () => {
    if (isThrowing) return
    reset()
  }

  const handleRollRef = useRef(handleRoll)
  useEffect(() => {
    handleRollRef.current = handleRoll
  })

  useEffect(() => {
    const rollOnSpaceBar = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.target !== document.body) return
      event.preventDefault()
      handleRollRef.current()
    }
    window.addEventListener('keydown', rollOnSpaceBar)
    return () => window.removeEventListener('keydown', rollOnSpaceBar)
  }, [])

  // En 2D le tirage est connu dès le clic : la dernière entrée reste cachée
  // pendant l'animation. En 3D l'entrée n'est créée qu'à la fin du lancer.
  const visibleHistory = animationMode === '2d' && isThrowing ? history.slice(1) : history

  return (
    <div className="app">
      <Header
        diceCount={dice.length}
        onDiceCountChange={setDiceCount}
        appearance={appearance}
        onAppearanceChange={setAppearance}
        onReset={handleReset}
        controlsDisabled={isThrowing}
        animationMode={animationMode}
        onAnimationModeChange={setAnimationMode}
        throwSettings={throwSettings}
        onThrowSettingsChange={setThrowSettings}
      />
      <main className="app-main">
        <div className="app-dice-area" ref={arenaRef}>
          {animationMode === '2d' ? (
            <DiceGrid
              dice={dice}
              scrambledValues={scrambledValues}
              isThrowing={isThrowing}
              appearance={appearance}
              onToggleHold={toggleDieHold}
            />
          ) : (
            <Suspense fallback={<div className="app-scene-fallback" />}>
              <DiceScene3D
                dice={dice}
                appearance={appearance}
                settings={throwSettings}
                throwRequestCount={throwRequest3d}
                disabled={isThrowing}
                onToggleHold={toggleDieHold}
                onRollResolved={handleRollResolved}
              />
            </Suspense>
          )}
          <RollTotal total={sumDice(dice)} isRolling={isThrowing} />
        </div>
        <RollHistory entries={visibleHistory} />
      </main>
      <footer className="app-footer">
        <RollButton onRoll={handleRoll} disabled={isThrowing} />
      </footer>
    </div>
  )
}

export default App
