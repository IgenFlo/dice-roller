# Dice Roller — Design MVP (2026-08-02)

## Objectif

Site web permettant de lancer des dés à 6 faces. Aucun compte, aucune persistance :
chaque ouverture repart aux paramètres par défaut (1 dé).

## Comportement

- À l'ouverture, l'interface est directement visible avec 1 dé (jamais lancé, affiché « – »).
- Header : contrôle du nombre de dés (boutons − / +), borné entre 1 et 10.
- Zone centrale : les dés occupent tout l'espace entre header et footer, centrés.
- Footer : bouton « Lancer les dés ».
- Cliquer sur un dé bascule son blocage ; un dé bloqué n'est pas relancé.
- Changer le nombre de dés conserve les valeurs et blocages existants : augmenter
  ajoute des dés neufs à la fin, diminuer retire les derniers.

## Architecture

- Vite + React + TypeScript, sans dépendance supplémentaire.
- `src/domain/dice.ts` : logique métier pure, indépendante de React
  (`createDice`, `rollDice`, `toggleHold`, `resizeDice`), RNG injectable,
  constantes `MIN_DICE_COUNT`, `MAX_DICE_COUNT`, `FACE_COUNT`.
- `src/hooks/useDiceGame.ts` : pont entre le domaine et l'état React.
- `src/components/` : `Header`, `DiceGrid`, `Die`, `RollButton`, chacun avec son CSS.

## Hors périmètre MVP (itérations futures préparées)

- Couleurs, animations de lancer, customisation des dés (couleurs, nombre de faces).
  Le nombre de faces est déjà une constante du domaine ; les composants sont
  factorisés pour accueillir ces évolutions sans refonte.
- Tests automatisés (écartés à la demande pour ce MVP).
