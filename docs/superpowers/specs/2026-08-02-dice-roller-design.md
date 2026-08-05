# Dice Roller — Design MVP (2026-08-02)

## Objectif

Site web permettant de lancer des dés à 6 faces. Aucun compte, aucune persistance :
chaque ouverture repart aux paramètres par défaut (1 dé).

## Comportement

- À l'ouverture, l'interface est directement visible avec 1 dé affichant la face 1.
- Header repliable, replié par défaut : ne montrent alors que le bouton
  « Réglages » et « Recentrer ». Déplié, il affiche tous les contrôles
  (nombre de dés, couleurs, panneaux Animation et Tests, Réinitialiser).
- Contrôle du nombre de dés (boutons − / +), borné entre 1 et 10.
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

- Bascule 2D/3D en survol, en haut à droite de la zone de dés (`AnimationModeToggle`),
  hors des réglages pour rester accessible en permanence.
- Popover « Animation » dans le header : quatre curseurs partagés
  (puissance du lancer 0–3, rebond 0–0,95, friction 0–4, gravité 0,1–3, pas de
  0,01) via `ThrowSettings` (`src/animation/throwSettings.ts`), appliqués aux deux
  moteurs, plus un bouton « Réglages par défaut ». La gravité garde un plancher
  et l'amortissement 3D un minimum : sans eux les dés ne se poseraient jamais.
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

## Itération 5 (2026-08-05) — lisibilité du lancer 3D

- Un dé bloqué porte un cadenas flottant au-dessus de lui (sprite billboardé
  teinté de la couleur des points, semi-transparent pour laisser lire les
  points), à la place de l'anneau au sol.
- Les dés bloqués quittent le plateau : ils s'alignent en colonne sur le bord
  gauche, face visible = leur valeur. La zone de jeu (`playArea`) se réduit
  d'autant — lancers et grille de rangement s'y adaptent. Débloquer un dé le
  repose à l'emplacement libre le plus central du plateau ; un dé qui se
  trouvait là où la colonne apparaît est déplacé de la même façon.
- Le résultat n'est validé que si TOUS les dés lancés sont immobiles ET lisibles :
  face supérieure quasi horizontale (`alignment > 0.96`) et posée au sol
  (`y < 0.85 × taille du dé`, donc pas en équilibre sur un autre dé).
- Un dé « cassé » (de travers, empilé, ou encore en mouvement) est automatiquement
  relancé au bout de 5 s ; le délai repart à zéro à chaque relance.
- La grille de rangement (création des dés, recentrage) s'adapte à la largeur
  réelle du plateau : nombre de colonnes puis espacement réduits pour tenir entre
  les murs sur écran étroit. Les dés rangés sont endormis (`body.sleep()`) pour
  qu'aucun contact résiduel ne les fasse rouler.

## Itération 6 (2026-08-05) — effets de combinaison

- `src/domain/combos.ts` : `findCombo` retourne le plus grand groupe de dés
  identiques (≥ 3) → paliers `triple` (3), `quad` (4), `quint` (5+).
- Effets déclenchés à la révélation des valeurs uniquement (fin d'animation 2D,
  résolution 3D), jamais sur l'état initial ni pendant un lancer. Les flammes
  brûlent ensuite indéfiniment (allumage sur `COMBO_FLAME_FADE_IN_MS`). Pendant
  un nouveau jet, seuls les dés bloqués de la combinaison continuent de brûler
  (`keepComboOnHeldDice`) ; à la résolution, la combinaison réellement présente
  fait autorité et éteint tout le reste. Extinction aussi au « Réinitialiser »
  et au changement du nombre de dés :
  - triple → flammes jaunes/oranges autour des dés concernés
  - quad → flammes rouges/oranges, plus larges et plus nerveuses
  - quint → flammes bleues + bouquet final feu d'artifice plein écran
- Rendu par mode : en 2D dégradés radiaux CSS animés (`DieFlames`), en 3D
  particules sprites qui montent et s'estompent (`emitFlames`/`advanceFlames`).
  Couleurs et durée partagées via `src/animation/comboEffects.ts`.
- Feu d'artifice : `Fireworks`, canvas plein écran (fusées + gerbes d'étincelles
  avec gravité et traînées) sur un voile sombre momentané, `pointer-events: none`.
- Flammes intensifiées (2026-08-05) : en 2D trois couches superposées (halo,
  langues extérieures, cœur incandescent) vacillant à des rythmes différents ;
  en 3D particules plus grosses, plus nombreuses, avec dérive latérale et
  mélange additif plafonné à `FLAME_MAX_OPACITY` pour éviter la saturation.
- Les murs avant et arrière du plateau 3D épousent les bords bas et haut
  réellement visibles à l'écran (`edgeFloorZ`) : les dés sont lancés depuis le
  bas de l'écran et peuvent rouler jusqu'en haut.
- Panneau « Tests » du header : force 3, 4 ou 5 dés identiques via
  `forceCombination`, qui garantit exactement la taille demandée (les autres dés
  sont répartis sur les faces restantes). En 2D le lancer est animé normalement.

## Hors périmètre MVP (itérations futures préparées)

- Couleurs, animations de lancer, customisation des dés (couleurs, nombre de faces).
  Le nombre de faces est déjà une constante du domaine ; les composants sont
  factorisés pour accueillir ces évolutions sans refonte.
- Tests automatisés (écartés à la demande pour ce MVP).
