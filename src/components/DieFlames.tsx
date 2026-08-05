import type { CSSProperties } from 'react'
import { COMBO_FLAME_COLORS, COMBO_FLAME_FADE_IN_MS } from '../animation/comboEffects'
import type { ComboTier } from '../domain/combos'
import './DieFlames.css'

interface DieFlamesProps {
  tier: ComboTier
}

interface FlameStyle extends CSSProperties {
  '--flame-core': string
  '--flame-hot': string
  '--flame-fade-in': string
}

export function DieFlames({ tier }: DieFlamesProps) {
  const [core, hot] = COMBO_FLAME_COLORS[tier]
  const style: FlameStyle = {
    '--flame-core': core,
    '--flame-hot': hot,
    '--flame-fade-in': `${COMBO_FLAME_FADE_IN_MS}ms`,
  }

  return <span className={`die-flames die-flames--${tier}`} style={style} aria-hidden="true" />
}
