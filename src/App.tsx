import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_THROW_SETTINGS,
  type AnimationMode,
  type ThrowSettings,
} from './animation/throwSettings'
import { AnimationModeToggle } from './components/AnimationModeToggle'
import { DiceGrid } from './components/DiceGrid'
import { Fireworks } from './components/Fireworks'
import { Header } from './components/Header'
import { RollButton } from './components/RollButton'
import { RollHistory } from './components/RollHistory'
import { RollTotal } from './components/RollTotal'
import { YamsPanel } from './components/YamsPanel'
import {
  findCombo,
  forceCombination,
  keepComboOnHeldDice,
  type Combo,
} from './domain/combos'
import { setDiceValues, sumDice, type Die } from './domain/dice'
import { YAMS_DICE_COUNT } from './domain/yams'
import { DEFAULT_DIE_APPEARANCE, type DieAppearance } from './domain/dieAppearance'
import { useDiceGame } from './hooks/useDiceGame'
import { useDiceThrow } from './hooks/useDiceThrow'
import './App.css'

const DiceScene3D = lazy(() =>
  import('./components/DiceScene3D').then(module => ({ default: module.DiceScene3D })),
)

interface ComboEffect {
  combo: Combo
  key: number
}

function App() {
  const { dice, rollCount, history, roll, applyRollResult, toggleDieHold, setDiceCount, reset } =
    useDiceGame()
  const [appearance, setAppearance] = useState<DieAppearance>(DEFAULT_DIE_APPEARANCE)
  const [animationMode, setAnimationMode] = useState<AnimationMode>('2d')
  const [throwSettings, setThrowSettings] = useState<ThrowSettings>(DEFAULT_THROW_SETTINGS)
  const [throwRequest3d, setThrowRequest3d] = useState(0)
  const [recenterRequest3d, setRecenterRequest3d] = useState(0)
  const [isThrowing3d, setIsThrowing3d] = useState(false)
  const [comboEffect, setComboEffect] = useState<ComboEffect | null>(null)
  const [fireworksKey, setFireworksKey] = useState(0)

  // Les flammes brûlent tant que la combinaison reste sur la table.
  const clearComboEffect = () => setComboEffect(null)

  const burnOnHeldDiceOnly = () => {
    setComboEffect(current => {
      if (current === null) return null
      const kept = keepComboOnHeldDice(current.combo, dice)
      // La clé change pour que la scène 3D réémette sur les seuls dés restants.
      return kept === null ? null : { combo: kept, key: current.key + 1 }
    })
  }

  // Le lancer résolu fait autorité : sans combinaison sur la table, tout s'éteint,
  // y compris les flammes conservées sur les dés bloqués pendant le jet.
  const revealCombo = (resolvedDice: readonly Die[]) => {
    const combo = findCombo(resolvedDice)
    setComboEffect(current => (combo === null ? null : { combo, key: (current?.key ?? 0) + 1 }))
    if (combo?.tier === 'quint') setFireworksKey(current => current + 1)
  }

  const handleDiceCountChange = (count: number) => {
    clearComboEffect()
    setDiceCount(count)
  }

  const arenaRef = useRef<HTMLDivElement>(null)
  const { isThrowing: isThrowing2d, scrambledValues, recenter } = useDiceThrow(
    dice,
    rollCount,
    arenaRef,
    throwSettings,
    animationMode === '2d',
    () => revealCombo(dice),
  )
  const isThrowing = animationMode === '2d' ? isThrowing2d : isThrowing3d

  const handleRoll = () => {
    if (isThrowing) return
    burnOnHeldDiceOnly()
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
    revealCombo(setDiceValues(dice, values))
  }

  const handleForceCombination = (comboSize: number) => {
    if (isThrowing) return
    clearComboEffect()
    const values = forceCombination(dice, comboSize)
    applyRollResult(values)
    // En 2D l'animation de lancer révélera la combinaison à son terme.
    if (animationMode === '3d') revealCombo(setDiceValues(dice, values))
  }

  const handleReset = () => {
    if (isThrowing) return
    clearComboEffect()
    reset()
    handleRecenter()
  }

  const handleRecenter = () => {
    if (isThrowing) return
    if (animationMode === '2d') {
      recenter()
      return
    }
    setRecenterRequest3d(count => count + 1)
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
  // L'analyse Yam's n'a de sens qu'une fois les 5 dés lancés et révélés.
  const showYamsPanel = dice.length === YAMS_DICE_COUNT && rollCount > 0 && !isThrowing

  return (
    <div className="app">
      <Header
        diceCount={dice.length}
        onDiceCountChange={handleDiceCountChange}
        appearance={appearance}
        onAppearanceChange={setAppearance}
        onReset={handleReset}
        onRecenter={handleRecenter}
        controlsDisabled={isThrowing}
        throwSettings={throwSettings}
        onThrowSettingsChange={setThrowSettings}
        onForceCombination={handleForceCombination}
      />
      <main className="app-main">
        <div className="app-dice-area" ref={arenaRef}>
          <AnimationModeToggle
            mode={animationMode}
            onModeChange={setAnimationMode}
            disabled={isThrowing}
          />
          {animationMode === '2d' ? (
            <DiceGrid
              dice={dice}
              scrambledValues={scrambledValues}
              isThrowing={isThrowing}
              appearance={appearance}
              combo={comboEffect?.combo ?? null}
              onToggleHold={toggleDieHold}
            />
          ) : (
            <Suspense fallback={<div className="app-scene-fallback" />}>
              <DiceScene3D
                dice={dice}
                appearance={appearance}
                settings={throwSettings}
                throwRequestCount={throwRequest3d}
                recenterRequestCount={recenterRequest3d}
                combo={comboEffect?.combo ?? null}
                comboKey={comboEffect?.key ?? 0}
                disabled={isThrowing}
                onToggleHold={toggleDieHold}
                onRollResolved={handleRollResolved}
              />
            </Suspense>
          )}
          <RollTotal total={sumDice(dice)} isRolling={isThrowing} />
        </div>
        {showYamsPanel && <YamsPanel dice={dice} />}
        <RollHistory entries={visibleHistory} />
      </main>
      <footer className="app-footer">
        <RollButton onRoll={handleRoll} disabled={isThrowing} />
      </footer>
      {fireworksKey > 0 && (
        <Fireworks key={fireworksKey} onDone={() => setFireworksKey(0)} />
      )}
    </div>
  )
}

export default App
