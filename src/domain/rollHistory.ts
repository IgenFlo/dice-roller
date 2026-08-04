import { sumDice, type Die } from './dice';

export const MAX_HISTORY_LENGTH = 20;

export interface RollHistoryEntry {
  readonly id: number;
  readonly values: readonly number[];
  readonly total: number;
}

export function createRollHistoryEntry(rollNumber: number, dice: readonly Die[]): RollHistoryEntry {
  return {
    id: rollNumber,
    values: dice.map(die => die.value),
    total: sumDice(dice),
  };
}

export function appendRollHistoryEntry(
  history: readonly RollHistoryEntry[],
  entry: RollHistoryEntry,
): RollHistoryEntry[] {
  return [entry, ...history].slice(0, MAX_HISTORY_LENGTH);
}
