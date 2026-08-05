import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ThrowImpulse } from './animation/throwGesture'
import {
  DEFAULT_THROW_SETTINGS,
  type AnimationMode,
  type ThrowSettings,
} from './animation/throwSettings'
import { AnimationModeToggle } from './components/AnimationModeToggle'
import { DiceGrid } from './components/DiceGrid'
import { Fireworks } from './components/Fireworks'
import { GameModeToggle } from './components/GameModeToggle'
import { Header } from './components/Header'
import { PhotoFacesEditor } from './components/PhotoFacesEditor'
import { RollButton } from './components/RollButton'
import { RollHistory } from './components/RollHistory'
import { RollTotal } from './components/RollTotal'
import { YamsPanel } from './components/YamsPanel'
import { findCombo, keepComboOnHeldDice, type Combo } from './domain/combos'
import { FACE_COUNT, setDiceValues, sumDice, type Die } from './domain/dice'
import { YAMS_DICE_COUNT } from './domain/yams'
import type { DieAppearance } from './domain/dieAppearance'
import type { GameMode } from './domain/gameMode'
import { photoFaceCount, type PhotoFaces } from './domain/photoFaces'
import { useDiceGame } from './hooks/useDiceGame'
import { useDiceThrow } from './hooks/useDiceThrow'
import { loadPhotoFaces, savePhotoFaces } from './storage/photoFaces'
import { loadPreferences, savePreferences } from './storage/preferences'
import './App.css'

const DiceScene3D = lazy(() =>
  import('./components/DiceScene3D').then(module => ({ default: module.DiceScene3D })),
)

interface ComboEffect {
  combo: Combo
  key: number
}

// Lues une seule fois au chargement : ensuite l'état React fait autorité.
const initialPreferences = loadPreferences()

function App() {
  const { dice, rollCount, history, roll, applyRollResult, toggleDieHold, setDiceCount, reset } =
    useDiceGame(initialPreferences.diceCount)
  const [appearance, setAppearance] = useState<DieAppearance>(initialPreferences.appearance)
  const [animationMode, setAnimationMode] = useState<AnimationMode>(
    initialPreferences.animationMode,
  )
  const [gameMode, setGameMode] = useState<GameMode>(initialPreferences.gameMode)
  const [photoFaces, setPhotoFaces] = useState<PhotoFaces>(loadPhotoFaces)
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false)
  const [throwSettings, setThrowSettings] = useState<ThrowSettings>(DEFAULT_THROW_SETTINGS)
  const [throwImpulse, setThrowImpulse] = useState<ThrowImpulse | null>(null)
  const [isAiming, setIsAiming] = useState(false)
  const [throwRequest3d, setThrowRequest3d] = useState(0)
  const [recenterRequest3d, setRecenterRequest3d] = useState(0)
  const [isThrowing3d, setIsThrowing3d] = useState(false)
  const [comboEffect, setComboEffect] = useState<ComboEffect | null>(null)
  const [fireworksKey, setFireworksKey] = useState(0)

  // En mode photos, une face ne vaut plus un chiffre : combinaisons, flammes,
  // halos, feu d'artifice et analyse Yam's n'ont plus d'objet.
  const comboEffectsEnabled = gameMode === 'classic'

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
    if (!comboEffectsEnabled) return
    const combo = findCombo(resolvedDice)
    setComboEffect(current => (combo === null ? null : { combo, key: (current?.key ?? 0) + 1 }))
    if (combo?.tier === 'quint') setFireworksKey(current => current + 1)
  }

  const handleDiceCountChange = (count: number) => {
    clearComboEffect()
    setDiceCount(count)
  }

  const handleGameModeChange = (mode: GameMode) => {
    setGameMode(mode)
    clearComboEffect()
    // Le mode photos sans aucune photo n'a rien à montrer : on ouvre l'éditeur.
    if (mode === 'photos' && photoFaceCount(photoFaces) === 0) setIsPhotoEditorOpen(true)
  }

  const arenaRef = useRef<HTMLDivElement>(null)
  const { isThrowing: isThrowing2d, scrambledValues, recenter } = useDiceThrow(
    dice,
    rollCount,
    arenaRef,
    throwSettings,
    throwImpulse,
    animationMode === '2d',
    comboEffectsEnabled,
    () => revealCombo(dice),
  )
  const isThrowing = animationMode === '2d' ? isThrowing2d : isThrowing3d

  const handleRoll = (impulse: ThrowImpulse | null) => {
    if (isThrowing) return
    burnOnHeldDiceOnly()
    setThrowImpulse(impulse)
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
    savePreferences({ diceCount: dice.length, appearance, animationMode, gameMode })
  }, [dice.length, appearance, animationMode, gameMode])

  useEffect(() => {
    savePhotoFaces(photoFaces)
  }, [photoFaces])

  useEffect(() => {
    const rollOnSpaceBar = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.target !== document.body) return
      event.preventDefault()
      handleRollRef.current(null)
    }
    window.addEventListener('keydown', rollOnSpaceBar)
    return () => window.removeEventListener('keydown', rollOnSpaceBar)
  }, [])

  // En 2D le tirage est connu dès le clic : la dernière entrée reste cachée
  // pendant l'animation. En 3D l'entrée n'est créée qu'à la fin du lancer.
  const visibleHistory = animationMode === '2d' && isThrowing ? history.slice(1) : history
  // L'analyse Yam's n'a de sens qu'une fois les 5 dés lancés et révélés.
  const showYamsPanel =
    comboEffectsEnabled && dice.length === YAMS_DICE_COUNT && rollCount > 0 && !isThrowing
  const activeCombo = comboEffectsEnabled ? (comboEffect?.combo ?? null) : null

  return (
    <div className={isAiming ? 'app app--aiming' : 'app'}>
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
      />
      <main className="app-main">
        <div className="app-dice-area" ref={arenaRef}>
          <div className="app-mode-corner">
            <GameModeToggle
              mode={gameMode}
              onModeChange={handleGameModeChange}
              disabled={isThrowing}
            />
            {gameMode === 'photos' && (
              <button
                type="button"
                className="app-photo-button"
                onClick={() => setIsPhotoEditorOpen(true)}
              >
                Photos {photoFaceCount(photoFaces)}/{FACE_COUNT}
              </button>
            )}
          </div>
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
              photoFaces={photoFaces}
              combo={activeCombo}
              onToggleHold={toggleDieHold}
            />
          ) : (
            <Suspense fallback={<div className="app-scene-fallback" />}>
              <DiceScene3D
                dice={dice}
                appearance={appearance}
                photoFaces={photoFaces}
                aurasEnabled={comboEffectsEnabled}
                settings={throwSettings}
                throwImpulse={throwImpulse}
                throwRequestCount={throwRequest3d}
                recenterRequestCount={recenterRequest3d}
                combo={activeCombo}
                comboKey={comboEffect?.key ?? 0}
                disabled={isThrowing}
                onToggleHold={toggleDieHold}
                onRollResolved={handleRollResolved}
              />
            </Suspense>
          )}
          <RollTotal total={sumDice(dice)} isRolling={isThrowing} />
          {showYamsPanel && <YamsPanel dice={dice} />}
          {isPhotoEditorOpen && (
            <PhotoFacesEditor
              faces={photoFaces}
              onFacesChange={setPhotoFaces}
              onClose={() => setIsPhotoEditorOpen(false)}
            />
          )}
        </div>
        <RollHistory entries={visibleHistory} />
      </main>
      <footer className="app-footer">
        <RollButton onRoll={handleRoll} onAimingChange={setIsAiming} disabled={isThrowing} />
      </footer>
      {fireworksKey > 0 && (
        <Fireworks key={fireworksKey} onDone={() => setFireworksKey(0)} />
      )}
    </div>
  )
}

export default App
