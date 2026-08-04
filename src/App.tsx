import { useEffect, useState } from 'react'
import { DiceGrid } from './components/DiceGrid'
import { Header } from './components/Header'
import { RollButton } from './components/RollButton'
import { RollHistory } from './components/RollHistory'
import { RollTotal } from './components/RollTotal'
import { sumDice } from './domain/dice'
import { DEFAULT_DIE_APPEARANCE, type DieAppearance } from './domain/dieAppearance'
import { useDiceGame } from './hooks/useDiceGame'
import './App.css'

function App() {
  const { dice, rollCount, isRolling, history, roll, toggleDieHold, setDiceCount, reset } =
    useDiceGame()
  const [appearance, setAppearance] = useState<DieAppearance>(DEFAULT_DIE_APPEARANCE)

  useEffect(() => {
    const rollOnSpaceBar = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.target !== document.body) return
      event.preventDefault()
      roll()
    }
    window.addEventListener('keydown', rollOnSpaceBar)
    return () => window.removeEventListener('keydown', rollOnSpaceBar)
  }, [roll])

  // Le dernier lancer n'est révélé (total + historique) qu'à la fin de l'animation.
  const visibleHistory = isRolling ? history.slice(1) : history

  return (
    <div className="app">
      <Header
        diceCount={dice.length}
        onDiceCountChange={setDiceCount}
        appearance={appearance}
        onAppearanceChange={setAppearance}
        onReset={reset}
      />
      <main className="app-main">
        <div className="app-dice-area">
          <DiceGrid
            dice={dice}
            rollCount={rollCount}
            appearance={appearance}
            onToggleHold={toggleDieHold}
          />
          <RollTotal total={sumDice(dice)} isRolling={isRolling} />
        </div>
        <RollHistory entries={visibleHistory} />
      </main>
      <footer className="app-footer">
        <RollButton onRoll={roll} disabled={isRolling} />
      </footer>
    </div>
  )
}

export default App
