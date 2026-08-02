import { DiceGrid } from './components/DiceGrid'
import { Header } from './components/Header'
import { RollButton } from './components/RollButton'
import { useDiceGame } from './hooks/useDiceGame'
import './App.css'

function App() {
  const { dice, roll, toggleDieHold, setDiceCount } = useDiceGame()

  return (
    <div className="app">
      <Header diceCount={dice.length} onDiceCountChange={setDiceCount} />
      <main className="app-main">
        <DiceGrid dice={dice} onToggleHold={toggleDieHold} />
      </main>
      <footer className="app-footer">
        <RollButton onRoll={roll} />
      </footer>
    </div>
  )
}

export default App
