import { useEffect, useRef, useState } from 'react'
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

function App() {
  const { dice, rollCount, history, roll, toggleDieHold, setDiceCount, reset } = useDiceGame()
  const [appearance, setAppearance] = useState<DieAppearance>(DEFAULT_DIE_APPEARANCE)
  const arenaRef = useRef<HTMLDivElement>(null)
  const { isThrowing, scrambledValues } = useDiceThrow(dice, rollCount, arenaRef)

  const handleRoll = () => {
    if (isThrowing) return
    roll()
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

  // Le dernier lancer n'est révélé (total + historique) qu'à la fin de l'animation.
  const visibleHistory = isThrowing ? history.slice(1) : history

  return (
    <div className="app">
      <Header
        diceCount={dice.length}
        onDiceCountChange={setDiceCount}
        appearance={appearance}
        onAppearanceChange={setAppearance}
        onReset={handleReset}
        controlsDisabled={isThrowing}
      />
      <main className="app-main">
        <div className="app-dice-area" ref={arenaRef}>
          <DiceGrid
            dice={dice}
            scrambledValues={scrambledValues}
            isThrowing={isThrowing}
            appearance={appearance}
            onToggleHold={toggleDieHold}
          />
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
