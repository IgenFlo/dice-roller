import { FACE_COUNT } from './dice';
import { YAMS_OBJECTIVES, countFaces, type FaceCounts, type YamsObjective } from './yams';

export interface ObjectiveChance {
  readonly objective: YamsObjective;
  readonly probability: number;
  /** Dés à bloquer pour atteindre cette probabilité, triés. */
  readonly keptValues: readonly number[];
}

/**
 * Probabilité exacte de réussir chaque objectif au prochain lancer, en essayant
 * tous les blocages possibles et en retenant le meilleur. Les objectifs déjà
 * réussis par le tirage courant sont écartés.
 */
export function bestNextRollChances(values: readonly number[]): ObjectiveChance[] {
  const currentCounts = countFaces(values);
  const pending = YAMS_OBJECTIVES.filter(objective => !objective.isAchieved(currentCounts));
  if (pending.length === 0) return [];

  const best = new Map<string, ObjectiveChance>();
  for (let keepMask = 0; keepMask < 1 << values.length; keepMask++) {
    const keptValues = values.filter((_, index) => (keepMask >> index) & 1);
    const successes = countSuccesses(keptValues, values.length - keptValues.length, pending);
    const outcomes = FACE_COUNT ** (values.length - keptValues.length);

    pending.forEach((objective, index) => {
      const probability = successes[index] / outcomes;
      const current = best.get(objective.id);
      if (current !== undefined && current.probability >= probability) return;
      best.set(objective.id, {
        objective,
        probability,
        keptValues: [...keptValues].sort((first, second) => first - second),
      });
    });
  }

  return [...best.values()]
    .filter(chance => chance.probability > 0)
    .sort((first, second) => second.probability - first.probability);
}

function countSuccesses(
  keptValues: readonly number[],
  rerollCount: number,
  objectives: readonly YamsObjective[],
): number[] {
  const counts = [...countFaces(keptValues)];
  const successes = new Array<number>(objectives.length).fill(0);

  const visitOutcome = (remaining: number): void => {
    if (remaining === 0) {
      objectives.forEach((objective, index) => {
        if (objective.isAchieved(counts as FaceCounts)) successes[index]++;
      });
      return;
    }
    for (let face = 1; face <= FACE_COUNT; face++) {
      counts[face]++;
      visitOutcome(remaining - 1);
      counts[face]--;
    }
  };
  visitOutcome(rerollCount);

  return successes;
}

export function describeKeptValues(keptValues: readonly number[]): string {
  if (keptValues.length === 0) return 'tout relancer';
  const allSame = keptValues.every(value => value === keptValues[0]);
  return allSame ? `bloquer les ${keptValues[0]}` : `bloquer ${keptValues.join(' ')}`;
}
