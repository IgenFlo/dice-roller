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

## Itération 3 (2026-08-05) — lancer physique 2D

Le lancer simule un jet réel en vue de dessus, sans 3D ni dépendance :

- `src/animation/diceThrowPhysics.ts` : simulation pure (projection depuis le bas de
  la zone, rebonds sur les parois et entre dés, friction, hauteur simulée avec
  gravité rendue via le scale, arrêt sous un seuil de vitesse).
- `src/hooks/useDiceThrow.ts` : boucle `requestAnimationFrame`, transforms appliqués
  directement au DOM, défilement des faces proportionnel à la vitesse, retour en
  douceur vers la grille dé par dé (chaque dé révèle sa vraie valeur à son arrêt).
- Le résultat vient toujours du domaine ; l'animation est purement présentationnelle.
- Contrôles (lancer, nombre de dés, reset, clic sur dé) désactivés pendant le lancer.
- `prefers-reduced-motion` n'est volontairement pas respecté : l'animation du lancer
  est le cœur du produit (décision du 2026-08-05, l'OS de l'utilisateur a
  « Réduire les animations » activé) ; un réglage in-app reste possible plus tard.
- L'approche 3D (three.js + cannon-es, textures générées depuis les couleurs
  custom, permutation des faces pour respecter le tirage du domaine) reste cadrée
  comme itération possible.

## Itération 4 (2026-08-05) — réglages d'animation et mode 3D

- Popover « Animation » dans le header : toggle 2D/3D + trois curseurs partagés
  (puissance du lancer, rebond, friction) via `ThrowSettings`
  (`src/animation/throwSettings.ts`), appliqués aux deux moteurs.
- Mode 3D (`DiceScene3D`, three.js + cannon-es, chargé en lazy ~600 kB) : vrais
  cubes lancés sur un plateau invisible (murs = frustum), ombres portées sur le
  fond de l'app, textures des faces générées depuis les couleurs custom, clic
  raycasté pour bloquer un dé (anneau couleur des points), les dés restent où ils
  s'arrêtent.
- Source du résultat selon le mode : en 2D le domaine tire les valeurs
  (`rollDice`) et l'animation est décorative ; en 3D la physique EST le générateur
  aléatoire — la face supérieure détectée à l'arrêt est commise au domaine via
  `applyRollResult`/`setDiceValues` (total + historique à la résolution).
- Faces opposées des cubes 3D somment à 7 ; disposition partagée des points dans
  `src/domain/dieFaces.ts` (SVG 2D et textures 3D).

## Hors périmètre MVP (itérations futures préparées)

- Couleurs, animations de lancer, customisation des dés (couleurs, nombre de faces).
  Le nombre de faces est déjà une constante du domaine ; les composants sont
  factorisés pour accueillir ces évolutions sans refonte.
- Tests automatisés (écartés à la demande pour ce MVP).
