# Dice Roller — Design MVP (2026-08-02)

## Objectif

Site web permettant de lancer des dés à 6 faces. Aucun compte, aucune persistance :
chaque ouverture repart aux paramètres par défaut (1 dé).

## Comportement

- À l'ouverture, l'interface est directement visible avec 1 dé affichant la face 1.
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

## Itération 2 (2026-08-05) — fonctionnalités et design inspirés des dice rollers existants

Recherche (FlipSimu, UplUp, DnD Dice Roller, avis d'apps mobiles) → ajouts :

- Total du lancer affiché sous les dés, révélé à la fin de l'animation.
- Historique de session (20 derniers lancers, valeurs dans l'ordre + total, en mémoire
  uniquement), le dernier lancer n'apparaissant qu'après l'animation.
- Bouton « Réinitialiser » dans le header : dés remis face 1, blocages levés,
  historique vidé ; le nombre de dés et les couleurs sont conservés.
- Couleurs du dé (fond / points) réglables dans le header, appliquées à tous les dés.
- Barre espace pour lancer (desktop) ; bouton de lancer désactivé pendant l'animation.
- Design : fond gris-bleu clair, surfaces blanches, accent indigo pour le bouton de
  lancer, dés avec ombre portée, thème centralisé en variables CSS dans `index.css`.
- Mobile : dés et espacements réduits via `--die-size`, bouton de lancer pleine
  largeur, `safe-area-inset-bottom`, cibles tactiles ≥ 40 px, header sur plusieurs
  lignes sans perte d'information.

## Hors périmètre MVP (itérations futures préparées)

- Couleurs, animations de lancer, customisation des dés (couleurs, nombre de faces).
  Le nombre de faces est déjà une constante du domaine ; les composants sont
  factorisés pour accueillir ces évolutions sans refonte.
- Tests automatisés (écartés à la demande pour ce MVP).
