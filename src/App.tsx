import { useState } from 'react'
import { DiceGrid } from './components/DiceGrid'
import { Header } from './components/Header'
import { RollButton } from './components/RollButton'
import { DEFAULT_DIE_APPEARANCE, type DieAppearance } from './domain/dieAppearance'
import { useDiceGame } from './hooks/useDiceGame'
import './App.css'

function App() {
  const { dice, rollCount, roll, toggleDieHold, setDiceCount } = useDiceGame()
  const [appearance, setAppearance] = useState<DieAppearance>(DEFAULT_DIE_APPEARANCE)

  return (
    <div className="app">
      <Header
        diceCount={dice.length}
        onDiceCountChange={setDiceCount}
        appearance={appearance}
        onAppearanceChange={setAppearance}
      />
      <main className="app-main">
        <DiceGrid dice={dice} rollCount={rollCount} appearance={appearance} onToggleHold={toggleDieHold} />
      </main>
      <footer className="app-footer">
        <RollButton onRoll={roll} />
      </footer>
    </div>
  )
}

export default App
