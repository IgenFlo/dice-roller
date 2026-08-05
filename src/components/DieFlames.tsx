import type { CSSProperties } from 'react'
import { COMBO_EFFECT_DURATION_MS, COMBO_FLAME_COLORS } from '../animation/comboEffects'
import type { ComboTier } from '../domain/combos'
import './DieFlames.css'

interface DieFlamesProps {
  tier: ComboTier
}

interface FlameStyle extends CSSProperties {
  '--flame-core': string
  '--flame-hot': string
  '--flame-duration': string
}

export function DieFlames({ tier }: DieFlamesProps) {
  const [core, hot] = COMBO_FLAME_COLORS[tier]
  const style: FlameStyle = {
    '--flame-core': core,
    '--flame-hot': hot,
    '--flame-duration': `${COMBO_EFFECT_DURATION_MS}ms`,
  }

  return <span className={`die-flames die-flames--${tier}`} style={style} aria-hidden="true" />
}
