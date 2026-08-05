# dice-roller

Lanceur de dés à 6 faces. Aucun compte, aucune persistance : chaque ouverture
repart aux paramètres par défaut.

Spécification détaillée et historique des itérations :
`docs/superpowers/specs/2026-08-02-dice-roller-design.md`.

## Contraintes responsive — à vérifier à CHAQUE changement d'interface

Ces règles ont été posées par l'utilisateur au fil du développement. Toute
modification touchant la mise en page, la taille des dés, le header, le footer
ou les panneaux d'information doit être relue à travers cette liste.

### 1. Structure imposée

- Header en haut, footer en bas avec le bouton de lancer, et **entre les deux la
  zone de dés qui occupe tout l'espace restant**.
- Le header est repliable et **replié par défaut** : il ne montre alors que
  « Réglages » et « Recentrer ».
- La bascule 2D/3D est en survol, en haut à droite de la zone de dés — jamais
  dans les réglages.

### 2. Tout doit tenir à l'écran

- **Portrait comme paysage sur téléphone : header, zone de dés et footer sont
  visibles simultanément**, sans scroll de la page.
- `#root` est en `height: 100svh` avec `overflow: hidden` : c'est la zone de dés
  qui absorbe l'espace, et le bloc latéral (total, analyse Yam's, historique)
  qui défile si nécessaire — jamais du contenu tronqué en silence.
- En paysage court (`orientation: landscape` et `max-height: 560px`), **la hauteur
  est la ressource rare** : la barre du navigateur peut ne laisser que ~280 px.
  Tout ce qui n'est pas les dés doit alors céder la place — le total passe en
  surimpression dans un coin, l'historique se réduit à une bande de pastilles
  sans titre, et les dés grossissent (76 px) au lieu de rétrécir.
- Ne jamais empiler des blocs pleine largeur sous les dés en paysage : chaque
  bloc coûte directement de la taille de dé.

### 3. Aucune perte d'information ni dégradation fonctionnelle

- Toutes les fonctions restent accessibles sur téléphone ; on ne supprime pas un
  contrôle, on le compacte.
- Cibles tactiles d'au moins ~32 px de côté, 40 px en usage courant.
- Seule exception admise : le **détail des conditions de blocage** de l'analyse
  Yam's, réservé aux écrans d'au moins 700 px de large **et** 560 px de haut.
  Sur téléphone, on n'affiche que le nom de la combinaison et son pourcentage.
- L'analyse Yam's s'affiche en **bandeaux discrets aux bords de la zone de dés** :
  combinaisons du tirage à gauche, probabilités du prochain lancer à droite.
  Leur largeur est réservée en `padding-inline` sur `.app-dice-area`, donc ils ne
  recouvrent jamais les dés ni le canvas 3D. Vérifier qu'il reste au moins deux
  dés par rangée après déduction des bandeaux.

### 4. Scène 3D

- La grille de rangement doit **tenir dans la largeur réelle du plateau** :
  nombre de colonnes puis espacement réduits sur écran étroit, de sorte que les
  dés ne se chevauchent ni ne se repoussent au recentrage.
- **Aucun dé ne doit être caché** : les murs avant et arrière épousent les bords
  bas et haut réellement visibles, en tenant compte du fait que c'est l'arête
  supérieure arrière d'un dé qui sort de l'écran en premier.
- La colonne des dés bloqués (bord gauche) réduit d'autant la zone de jeu, qui
  doit rester utilisable.

### 5. Vérification

Après toute modification d'interface, contrôler au minimum ces formats :

| Format | Taille | Points de vigilance |
|---|---|---|
| Téléphone portrait | 390 × 844 | dés lisibles, footer atteignable au pouce |
| Téléphone paysage | 844 × 390 | header + dés + footer visibles ensemble |
| Petit téléphone paysage | 640 × 360 | cas le plus contraint en hauteur |
| Desktop | 1280 × 800 | détail des conditions Yam's affiché |

L'utilisateur vérifie lui-même dans son navigateur : ne pas piloter le Browser
pane sans demande explicite. Fournir l'URL du serveur de dev suffit.

## Commandes

```bash
npm run dev
npm run build
npm run lint
npx tsc -b
```
