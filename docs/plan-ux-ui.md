# Plan UX / UI de Pronote-MMI

Rédigé le 2026-11-10. À exécuter lot par lot par un modèle moins coûteux, **une session
neuve par lot**. Chaque lot liste ses fichiers, les valeurs exactes à écrire et la
vérification qui prouve qu'il est terminé.

## Règles pour l'exécutant

- Répondre en français, aucun emoji, aucun `git add` / `git commit` / `git push`.
- **Présentation uniquement.** Aucun changement de logique, de route, d'appel API, de
  schéma ou de dépendance. Si un changement visuel demande de toucher à la logique,
  s'arrêter et le signaler.
- **Le système de notes est hors périmètre** : `client/src/pages/Notes.jsx`,
  `NotesWidget.jsx` et tout le serveur ne sont pas modifiés. Seule exception :
  `Notes.module.css` reçoit les remplacements mécaniques du lot 2, comme tous les
  autres fichiers CSS.
- Ne modifier que les fichiers listés dans le lot. Lire un fichier avant de le modifier.
- Aucune couleur en dur dans les modules CSS : uniquement les variables de
  `client/src/index.css`.
- Chaque changement doit rester correct dans les **5 thèmes** (`mmi`, `dark`, `bleu`,
  `pastel`, `obsidian`), à 375 px, 800 px (barre latérale réduite) et 1280 px.
- Fin de lot : `npm run lint` et `npm run build` dans `client/`, puis la vérification
  du lot. Rapporter la sortie réelle. Dire clairement ce qui n'a pas pu être vérifié.

---

## 1. Diagnostic (ce qui a été constaté)

Constaté dans le code et sur le rendu réel des pages Connexion, Accueil, Devoirs, EDT
et Profil, thème clair. **Limite** : le serveur local n'a pas pu être lancé (Docker
arrêté), donc les pages ont été vues en état de chargement, sans données. Les cartes de
devoirs, les blocs de cours et les documents n'ont pas été vus remplis ; les lots 6 à 8
commencent pour cette raison par une étape d'observation.

Ce qui est déjà bon et qu'on garde : l'identité tirée du logo MMI (rose, bleu hachuré,
orange, barre tricolore, cercles brisés), la police Montserrat, la grille bento de
l'accueil, les 5 thèmes, le focus clavier visible, les cibles tactiles de 44 px.

Ce qui empêche l'interface d'avoir l'air finie :

| Constat | Mesure |
|---|---|
| Pas d'échelle typographique | 28 tailles de police différentes, dont 0,6 rem (9,6 px), illisible |
| Texte globalement petit | le corps est à 0,8 - 0,875 rem, les titres de page à 1,25 rem seulement |
| Pas d'échelle de rayons | 12 valeurs de `border-radius` (3, 4, 5, 6, 8, 10, 11, 12, 14, 16, 20 px) |
| Boutons recopiés partout | `background: var(--accent-solid)` déclaré 32 fois dans 16 fichiers |
| Ombres incohérentes | 9 `box-shadow` en dur à côté de 10 usages de `var(--shadow)` |
| Trois façons d'attendre | texte "Chargement…" (11 fois), "…" dans les tuiles, squelettes (8 fois) |
| États vides sans forme | 5 styles différents, une simple phrase grise |
| En-têtes de page refaits à la main | chaque page reconstruit titre + sous-titre + bouton |
| Contenu sans largeur maximale | sur grand écran, les champs du Profil font toute la largeur |
| Bas de barre latérale lourd | trois boutons encadrés identiques (thème, MMIparty, déconnexion) |
| Mouvement non maîtrisé | 103 transitions, `prefers-reduced-motion` respecté dans 2 fichiers seulement |
| Alerte disproportionnée | "notifications bloquées" du Profil s'affiche en rouge comme une erreur |
| Page de connexion nue | ni logo ni décor, alors que le reste de l'application en a |
| Police bloquante | Montserrat chargée par `@import` dans le CSS, ce qui retarde le premier rendu |
| Contrôles natifs clairs en thème sombre | pas de `color-scheme`, donc sélecteurs de date et barres de défilement clairs |

## 2. Direction

**Consolider, puis soigner.** On ne change pas d'identité : on la rend régulière. Une
interface paraît "jolie" quand les tailles, les rayons, les espaces et les mouvements
obéissent à peu de règles, appliquées partout. Les lots 1 à 3 posent ces règles, les
lots 4 à 10 les appliquent page par page, le lot 11 ajoute les finitions.

Écarté :
- une bibliothèque de composants (shadcn, MUI) ou Tailwind : nouvelle dépendance,
  réécriture de 11 000 lignes, et perte de ce que Lino a construit et sait expliquer ;
- un nouveau thème graphique : l'identité MMI est le point fort du projet ;
- une bibliothèque d'animation : les transitions CSS suffisent pour ce qui est prévu.

---

## Lot 0 : préparer l'environnement (à faire par Lino)

Sans données, impossible de juger le rendu. Avant le lot 4 :

1. Démarrer Docker Desktop, puis à la racine : `docker compose up -d`.
2. Dans `server/` : `npm run db:push`, `npm run seed`, `npm run dev`.
3. Se connecter avec un compte du seed (identifiants dans `server/scripts/seed.js`).

Les lots 1 à 3 peuvent être faits sans serveur.

---

## Lot 1 : fondations (jetons de design)

Fichiers : `client/src/index.css`, `client/index.html`.
Effet visible attendu : presque aucun. On pose le vocabulaire.

### 1.1 Chargement de la police

- Supprimer la ligne `@import url("https://fonts.googleapis.com/...")` de `index.css`.
- Dans `client/index.html`, dans `<head>` :

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" />
```

Pourquoi : un `@import` n'est découvert qu'après le téléchargement du CSS ; un `<link>`
est chargé en parallèle. Si une politique CSP existe dans `netlify.toml`, vérifier
qu'elle autorise déjà ces deux domaines (elle le doit, la police fonctionne aujourd'hui).

### 1.2 Jetons communs à tous les thèmes

Ajouter un bloc `:root { ... }` **séparé**, placé avant le bloc
`:root, [data-theme="mmi"]` (ces valeurs ne dépendent pas du thème) :

```css
:root {
  /* Typographie : 7 tailles, rien en dessous de 12 px */
  --fs-xs: 0.75rem;    /* 12 px : légendes, badges, métadonnées */
  --fs-sm: 0.8125rem;  /* 13 px : texte secondaire, boutons */
  --fs-base: 0.875rem; /* 14 px : texte courant */
  --fs-md: 1rem;       /* 16 px : titres de carte, champs sur mobile */
  --fs-lg: 1.25rem;    /* 20 px : titres de section */
  --fs-xl: 1.5rem;     /* 24 px : titres de page */
  --fs-2xl: 2rem;      /* 32 px : grands chiffres */

  /* Rayons : 3 tailles et la pilule */
  --radius-sm: 6px;    /* badges, petites puces */
  --radius-md: 10px;   /* boutons, champs */
  --radius-lg: 16px;   /* cartes, panneaux, modales */
  --radius-full: 999px;

  /* Espacement (pour le nouveau code et les lots 3 à 10) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-8: 3rem;

  /* Mouvement */
  --dur-fast: 120ms;
  --dur: 180ms;
  --dur-slow: 280ms;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);

  /* Mise en page */
  --content-max: 1200px;
  --form-max: 560px;
}
```

### 1.3 Jetons par thème

- Ajouter `--shadow-lg` dans chaque thème, sous `--shadow-sm` :
  - `mmi` : `0 12px 32px rgba(0, 0, 0, 0.12)`
  - `dark` : `0 12px 32px rgba(0, 0, 0, 0.6)`
  - `bleu` : `0 12px 32px rgba(70, 156, 208, 0.18)`
  - `pastel` : `0 12px 32px rgba(232, 96, 154, 0.16)`
  - `obsidian` : `0 12px 32px rgba(0, 0, 0, 0.7)`
- Ajouter `color-scheme: light;` dans `mmi`, `bleu`, `pastel` et `color-scheme: dark;`
  dans `dark`, `obsidian`. Pourquoi : le navigateur dessine alors les contrôles natifs
  (sélecteur de date, cases à cocher, barres de défilement) dans la bonne teinte.

### 1.4 Base globale (dans `index.css`, après le sélecteur `body` existant)

```css
body {
  font-size: var(--fs-base);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3 {
  line-height: 1.2;
  letter-spacing: -0.01em;
}

::selection {
  background: var(--tint-pink);
  color: var(--text);
}

/* Une seule règle pour toute l'application : les animations décoratives s'effacent
   pour les personnes qui ont demandé moins de mouvement dans leur système. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Fusionner les propriétés de `body` dans le bloc `body` existant plutôt que d'en créer un
second. Ne pas toucher aux deux blocs `prefers-reduced-motion` de `Dashboard.module.css`.

Barre de défilement : remplacer `width: 4px` par `8px`, et le fond du curseur
`var(--accent)` par `var(--border)`, avec
`::-webkit-scrollbar-thumb:hover { background: var(--text-faint); }`. Pourquoi : une
barre rose vif attire l'œil sur un élément qui ne porte aucune information.

### 1.5 Vérification du lot 1

`npm run lint`, `npm run build`. Ouvrir `/login` : la police est toujours Montserrat
(`getComputedStyle(document.body).fontFamily`), et
`getComputedStyle(document.documentElement).getPropertyValue("--fs-xl")` renvoie `1.5rem`.

---

## Lot 2 : normalisation mécanique des CSS

Fichiers : tous les `*.module.css` de `client/src/pages/` et `client/src/components/`.
Aucun fichier `.jsx`. C'est du remplacement de valeurs, fichier par fichier.

### 2.1 Tailles de police

Remplacer chaque `font-size` en rem par un jeton, selon cette table :

| Valeur actuelle | Jeton |
|---|---|
| 0.6, 0.62, 0.625, 0.65, 0.675, 0.68, 0.7, 0.72, 0.725, 0.75, 0.775, 0.78 rem | `var(--fs-xs)` |
| 0.8, 0.825 rem | `var(--fs-sm)` |
| 0.85, 0.875, 0.9 rem | `var(--fs-base)` |
| 0.95, 1 rem | `var(--fs-md)` |
| 1.1, 1.15, 1.25 rem | `var(--fs-lg)` |
| 1.75 rem | `var(--fs-2xl)` |

Ne pas toucher : `font-size: 16px` (protège du zoom automatique d'iOS sur les champs),
les tailles en px des textes SVG (`.anneauNombre`, `.anneauLegende`), le `clamp(...)` de
`.titreHero`, le `3.5rem` de `NotFound`.

Attention : les petites tailles montent à 12 px. Des libellés peuvent passer à la ligne
(barre de navigation mobile, en-têtes de colonnes de l'EDT, badges). Les contrôler à
375 px au lot de la page concernée, pas ici.

### 2.2 Rayons

| Valeur actuelle | Jeton |
|---|---|
| 4, 5, 6 px | `var(--radius-sm)` |
| 8, 10, 11 px | `var(--radius-md)` |
| 12, 14, 16 px | `var(--radius-lg)` |
| 20 px | `var(--radius-full)` |

Ne pas toucher : `50%` (cercles), les `3px` (segments de la barre tricolore et autres
traits fins), les rayons composés comme `0 10px 10px 0`.

### 2.3 Ombres

Remplacer les 9 `box-shadow: 0 ...` en dur :
- flou jusqu'à 8 px : `var(--shadow-sm)` ;
- flou de 12 à 16 px : `var(--shadow)` ;
- flou de 20 px et plus (menus, modales, élément glissé) : `var(--shadow-lg)`.

Ne pas toucher aux `box-shadow: inset ...` (ce sont des contours, pas des ombres).

### 2.4 Vérification du lot 2

Dans `client/src` :

```bash
grep -rhoE "font-size: [0-9.]+rem" --include=*.css . | sort | uniq -c
```

ne doit lister que `3.5rem`. Même contrôle pour `border-radius: [0-9]+px` (seuls les
`3px` restent) et `box-shadow: 0` (aucun résultat). Puis lint et build.

---

## Lot 3 : composants partagés

Créer quatre composants dans `client/src/components/`, chacun avec son module CSS. Ne
les brancher nulle part dans ce lot, sauf le test indiqué en 3.5. Les lots suivants les
adoptent page par page.

Pourquoi des composants plutôt que des classes globales : le projet utilise les CSS
Modules partout, et un composant React porte aussi le comportement (attribut `disabled`,
`aria-busy`, icône). C'est aussi le réflexe attendu d'un développeur React : une règle
visuelle écrite une fois, pas 32.

### 3.1 `Button.jsx`

```jsx
export default function Button({ variant = "primary", size = "md", icon: Icon, loading = false,
                                 className = "", children, ...props }) { ... }
```

- Rend un `<button type="button">` par défaut (`type` peut être écrasé par `props`).
- `variant` : `primary` (fond `--accent-solid`, texte `--on-accent-solid`),
  `secondary` (fond `--bg-card`, bordure `--border`, texte `--text` ; au survol bordure
  `--accent`, texte `--accent-text`), `ghost` (sans bordure, texte `--text-faint` ; au
  survol fond `--bg-input`), `danger` (bordure `--border`, texte `--danger-text` ; au
  survol fond `--tint-danger`).
- `size` : `md` (hauteur minimale 40 px, `padding: 0 1rem`, `--fs-sm`), `sm` (32 px,
  `padding: 0 0.75rem`, `--fs-xs`).
- Commun : `display: inline-flex`, `gap: 0.4rem`, `font-weight: 600`,
  `font-family: inherit`, `border-radius: var(--radius-md)`, `cursor: pointer`,
  `transition: background var(--dur), border-color var(--dur), color var(--dur), transform var(--dur-fast)`,
  `:active { transform: scale(0.98); }`,
  `:disabled { opacity: 0.55; cursor: not-allowed; }`.
- `Icon` : composant lucide, rendu avec `size={16} strokeWidth={1.5} aria-hidden="true"`.
- `loading` : désactive le bouton, pose `aria-busy="true"`.
- `@media (pointer: coarse)` : `min-height: 44px` pour les deux tailles.

### 3.2 `EmptyState.jsx`

```jsx
export default function EmptyState({ icon: Icon, title, children, action }) { ... }
```

Bloc centré, `padding: var(--space-8) var(--space-4)` : icône lucide de 28 px dans une
pastille ronde de 56 px (fond `--tint-pink`, couleur `--accent-text`), titre (`--fs-md`,
600, `--text`), texte d'aide (`children`, `--fs-sm`, `--text-faint`, largeur maximale
36ch), puis `action` (un `Button`) facultatif.

### 3.3 `PageHeader.jsx`

```jsx
export default function PageHeader({ title, subtitle, children }) { ... }
```

- Utilise `PageTitle` pour le titre (ne pas dupliquer la barre tricolore).
- `subtitle` : paragraphe `--fs-base`, `--text-faint`, `margin-top: 0.5rem`.
- `children` : zone d'actions à droite.
- Mise en page : `display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3);`.
- Dans `PageTitle.module.css` : `.title` passe à `font-size: var(--fs-xl)` et
  `letter-spacing: -0.02em`. C'est le seul changement visible de ce lot.

### 3.4 `LoadingState.jsx`

```jsx
export default function LoadingState({ label = "Chargement" }) { ... }
```

Rend `SkeletonCards` (déjà dans `Skeleton.jsx`) dans un conteneur
`role="status" aria-live="polite"` avec le libellé dans un `<span>` masqué visuellement.
Lire `Skeleton.jsx` d'abord et réutiliser ses props, sans le modifier.

### 3.5 Vérification du lot 3

Lint et build. Monter provisoirement les quatre composants dans `NotFound.jsx`,
vérifier leur rendu dans les thèmes `mmi` et `dark` (texte de la page et styles
calculés ; une capture pour le rendu), puis **retirer** ce montage provisoire.

---

## Lot 4 : la coquille (barre latérale, largeur, navigation mobile)

Fichiers : `components/Layout.jsx`, `Layout.module.css`, `MmiDecor.module.css`.

1. **Largeur maximale.** `.main` : ajouter `width: 100%; max-width: calc(var(--content-max) + 4rem); margin-inline: auto;`.
   Vérifier que l'EDT reste utilisable ; s'il est à l'étroit, lui laisser toute la largeur.
2. **Bloc utilisateur.** Ajouter une pastille ronde de 36 px avec les initiales (fond
   `--tint-pink`, texte `--accent-text`, 600) à gauche du nom. Initiales : première
   lettre des deux premiers mots de `user.nom`, en majuscules. C'est la seule logique
   autorisée dans ce lot.
3. **Lien actif.** `.active` garde son fond teinté et gagne un repère : `position: relative`
   et un `::before` de 3 px de large, hauteur 60 %, à gauche, fond `--accent`,
   `border-radius: var(--radius-full)`.
4. **Bas de barre latérale.** `.themeBtn`, `.partyBtn`, `.logout` perdent leur bordure
   (`border: 1px solid transparent`) et prennent l'allure d'un lien de navigation :
   alignés à gauche, même `padding` et même `gap` que `.navLink`, fond `--bg-dark` au
   survol. Ajouter un filet `border-top: 1px solid var(--border)` et
   `padding-top: var(--space-3)` au-dessus de ce groupe. La déconnexion garde son
   survol rouge. En mode réduit (769 - 1024 px), ils restent centrés.
5. **Barre réduite.** Vérifier que chaque lien de navigation a un `title` égal à son
   libellé quand le libellé est masqué ; l'ajouter s'il manque.
6. **Navigation mobile.** Libellés à `--fs-xs`. Contrôler à 375 px qu'aucun des cinq
   libellés ne passe à la ligne ; sinon réduire le `padding` horizontal, pas la police.
   L'onglet actif reçoit un trait de 3 px en haut, couleur `--accent`. Ajouter
   `padding-bottom: env(safe-area-inset-bottom)` à `.bottomNav` si absent.
7. **Décor.** Dans `MmiDecor.module.css`, masquer aussi les formes entre 769 et 1024 px
   si elles passent sous le bouton "Personnaliser" ou la cloche (constaté à 800 px).
8. **Transitions.** Remplacer les durées `0.15s` et `0.12s` du fichier par `var(--dur)`.

Vérification : captures de `/dashboard` à 1280, 800 et 375 px en `mmi` et `dark`.
Navigation complète au clavier (Tab) dans la barre latérale.

---

## Lot 5 : Accueil

Fichiers : `pages/Dashboard.jsx` (en-tête seulement), `Dashboard.module.css`,
`components/widgets/EdtWidget.jsx`, `DevoirsWidget.jsx`, `SemaineWidget.jsx`,
`WidgetCard.jsx`. **Pas `NotesWidget.jsx`.**

1. **En-tête.** Remplacer le bloc `.entete` par `PageHeader` (titre "Bienvenue, ...",
   sous-titre groupe et rôle, bouton "Personnaliser" en `Button variant="secondary"
   size="sm"`). Supprimer `.entete`, `.subtitle`, `.toolbarBtn` du CSS s'ils ne servent
   plus (le bouton "Réinitialiser" passe aussi à `Button`).
2. **Tuiles.** `.tuile` : `padding: 1.1rem 1.25rem`, transition
   `transform var(--dur), border-color var(--dur), box-shadow var(--dur)`, survol
   `transform: translateY(-2px); box-shadow: var(--shadow);`.
3. **Tuile principale.** `.tuileHero` :
   `background: linear-gradient(135deg, var(--tint-pink), var(--bg-card) 60%);`.
   Vérifier le contraste du texte dans les 5 thèmes.
4. **Hiérarchie.** `.etiquette` : `text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;`.
   `.grand` et `.anneauNombre` : `font-variant-numeric: tabular-nums`.
5. **Chargement.** Dans les trois widgets autorisés, remplacer "Chargement…" et "…" par
   un bloc squelette (`Skeleton`) aux dimensions du contenu final, pour que la tuile ne
   change pas de taille quand les données arrivent. La tuile Moyenne garde son "…".
6. **Entrée en scène.** Les tuiles apparaissent en fondu montant :

```css
@keyframes tuileEntree {
  from { opacity: 0; transform: translateY(8px); }
}
.tuile { animation: tuileEntree var(--dur-slow) var(--ease) backwards; }
.tuile:nth-child(2) { animation-delay: 40ms; }
.tuile:nth-child(3) { animation-delay: 80ms; }
.tuile:nth-child(4) { animation-delay: 120ms; }
.tuile:nth-child(5) { animation-delay: 160ms; }
```

   Contrôler que cela ne perturbe pas `useFlip` (réordonner les widgets dans le panneau
   "Personnaliser" doit rester fluide). Si conflit, retirer l'animation d'entrée.
7. **Bandeau d'erreur.** Icône lucide `WifiOff` à gauche, bouton "Réessayer" en `Button`.

Vérification : avec le serveur, puis serveur coupé (états d'erreur). Captures en `mmi`,
`dark`, `obsidian`, à 1280 et 375 px.

---

## Lots 6, 7, 8 : Devoirs, EDT, Documents (un lot par page)

Ces pages n'ont pas été vues avec des données. **Étape 1 obligatoire de chaque lot** :
lancer l'application avec le seed, lire la page (texte, puis une capture à 1280 et une
à 375 px) et écrire une courte liste de ce qui ne respecte pas les règles ci-dessous
avant toute modification.

Règles communes à appliquer :

- En-tête : `PageHeader`.
- Tous les boutons : `Button`. Correspondance : action principale `primary` ; annuler,
  modifier, réinitialiser `secondary` ; icônes seules et bascules `ghost` ; supprimer
  `danger`. Supprimer du module CSS les classes devenues inutiles (`.cancelBtn`,
  `.editBtn`, `.deleteBtn`, `.submitBtn`, `.resetBtn`, etc.) après avoir vérifié par
  grep qu'elles ne sont plus référencées.
- Chargement : `LoadingState` à la place de tout "Chargement…" de niveau page. Les
  "Chargement…" des fils de commentaires deviennent trois lignes de squelette.
- État vide : `EmptyState` avec une icône, un titre et une phrase qui dit quoi faire.
- Cartes : `border-radius: var(--radius-lg)`, `padding` de 1rem à 1.25rem, survol
  `box-shadow: var(--shadow-sm)`, pas de déplacement (réservé aux tuiles de l'accueil).
- Modales : `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-lg)`, fond de
  l'overlay avec `backdrop-filter: blur(3px)`, largeur maximale `var(--form-max)`.
- Filtres en puces : `border-radius: var(--radius-full)`, hauteur minimale 32 px
  (44 px au tactile), état actif en fond `--tint-pink` et texte `--accent-text`.
- Champs : hauteur minimale 40 px, `border-radius: var(--radius-md)`, bordure `--accent`
  au focus.
- Durées de transition : `var(--dur)`.

Points propres à chaque page :

**Lot 6, Devoirs** (`Devoirs.jsx`, `Devoirs.module.css`) :
- États vides : onglet "À rendre" vide : icône `PartyPopper` ou `CheckCircle2`, titre
  "Rien à rendre", phrase rassurante ; onglet "Historique" vide ; recherche sans
  résultat (icône `SearchX`, bouton "Effacer les filtres").
- La carte d'un devoir en retard (`.lateBadge`, `.sectionRetard`) doit se distinguer
  par un liseré gauche `--danger`, pas seulement par un badge.
- Vérifier que `.echeancePrincipal` est l'élément le plus visible de la carte après le titre.
- Fichier de 1 000 lignes : ne pas réorganiser le JSX, uniquement remplacer les
  éléments visés.

**Lot 7, EDT** (`EDT.jsx`, `EDT.module.css`) :
- Remplacer le texte "Chargement de l'emploi du temps…" (`.etatGrille`) par un voile
  léger sur la grille avec trois blocs squelette, sans décaler la grille.
- La colonne du jour (`.today`, `.dayHeaderToday`) : fond `--tint-pink` sur toute la
  hauteur de la colonne, pas seulement l'en-tête.
- Blocs de cours (`.bloc`) : `border-radius: var(--radius-md)`, liseré gauche de 3 px
  dans la couleur du cours, `--fs-xs` au minimum pour l'heure et la salle. Contrôler
  qu'un cours d'une heure reste lisible à 12 px ; sinon masquer la salle dans le bloc
  (elle reste dans la fenêtre de détail).
- Semaine sans cours : `EmptyState` (icône `CalendarOff`) au lieu d'une grille vide.
- Navigation de semaine : `Button variant="secondary" size="sm"` avec les icônes
  `ChevronLeft` / `ChevronRight` à la place des flèches en texte.

**Lot 8, Documents** (`Documents.jsx`, `Documents.module.css`) :
- États : "Chargement…" (ligne 444) vers `LoadingState` ; "Aucun document disponible."
  (ligne 459) vers `EmptyState` (icône `FolderOpen`).
- `.stockageAlerte` : style d'information neutre (voir lot 9, point 3), pas d'alerte rouge
  sauf si le stockage est réellement plein.
- Les badges matière, prof et type (`.matiereBadge`, `.profBadge`, `.typeBadge`) : même
  hauteur, même rayon `--radius-sm`, même taille `--fs-xs`.

Vérification de chaque lot : lint, build, parcours complet de la page (créer, modifier,
supprimer, filtrer, commenter selon le rôle du compte de test), captures `mmi` et `dark`
à 1280 et 375 px.

---

## Lot 9 : Profil et Admin

Fichiers : `Profil.jsx`, `Profil.module.css`, `PreferencesNotifications.*`,
`MesOptions.*`, `Admin.jsx`, `Admin.module.css`.

1. **Profil en cartes.** Chaque section (identité, options, apparence, notifications,
   mot de passe) devient une carte : fond `--bg-card`, bordure `--border`,
   `border-radius: var(--radius-lg)`, `padding: var(--space-5)`, titre de section en
   `<h2>` `--fs-md` 600 à l'intérieur de la carte.
2. **Largeur.** La page est limitée à `max-width: 760px`. Le formulaire de mot de passe
   à `var(--form-max)`.
3. **Message "notifications bloquées".** C'est une information, pas une erreur : fond
   `--bg-input`, bordure `--border`, texte `--text-muted`, icône lucide `Info`
   (`--blue-text`) à gauche. Le rouge reste réservé aux vraies erreurs.
4. **Aperçus de thème.** `.themeActive` : bordure 2 px `--accent` et une coche lucide
   `Check` dans une pastille en haut à droite, pour ne pas reposer sur la seule couleur.
5. **MesOptions.** "Chargement…" vers deux lignes de squelette.
6. **Boutons.** Tous en `Button`.
7. **Admin.** En-tête `PageHeader`, boutons `Button` (`.validateBtn` en `primary`,
   `.deleteBtn` en `danger`), modale selon les règles communes. Ne pas toucher aux
   filtres ni à la logique. Le texte de confirmation de suppression n'est pas modifié.

Vérification : comptes étudiant et admin du seed ; changement de thème depuis le Profil
dans les 5 thèmes ; captures `mmi` et `obsidian`.

---

## Lot 10 : Connexion, inscription, mot de passe, 404

Fichiers : `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`,
`Login.module.css`, `NotFound.jsx`, `NotFound.module.css`, `PasswordInput.module.css`.

1. **Logo.** Au-dessus du titre de la carte, le logo `src/assets/logo_mmi.png` en 56 px,
   centré. En thème sombre, reprendre la pastille blanche déjà utilisée dans
   `Layout.module.css` (`.logo`).
2. **Décor.** Afficher `MmiDecor` derrière la carte (`.page` en `position: relative`,
   la carte en `z-index: 1`). C'est la première chose que voit un nouvel utilisateur :
   elle doit porter l'identité.
3. **Carte.** `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow)`,
   `padding: var(--space-6)`, largeur maximale 400 px. Titre en `--fs-xl`, sous-titre
   `--fs-base`.
4. **Champs.** Hauteur minimale 44 px, `border-radius: var(--radius-md)`, libellés
   `--fs-sm` 600.
5. **Bouton.** `Button` pleine largeur (`className` avec `width: 100%`), `loading`
   pendant l'envoi si un état d'envoi existe déjà (ne pas en créer un).
6. **Messages.** `.error` et `.info` : même gabarit (icône, fond teinté, rayon
   `--radius-md`), `role="alert"` pour l'erreur s'il manque.
7. **404.** `EmptyState` avec une icône `Compass` et un `Button` "Retour à l'accueil".

Vérification : les quatre pages à 375 et 1280 px, thèmes `mmi` et `dark`, saisie
complète au clavier, message d'erreur affiché avec un mauvais mot de passe.

---

## Lot 11 : finitions et contrôle final

Fichiers : `Toast.module.css`, `ConfirmModal.module.css`, `NotificationsBell.module.css`,
`PwaPrompts.module.css`, `AppFooter.module.css`.

1. Toast, modale de confirmation, panneau de la cloche : `border-radius: var(--radius-lg)`
   (toast : `--radius-md`), `box-shadow: var(--shadow-lg)`, animations d'entrée ramenées
   à `var(--dur-slow) var(--ease)`.
2. `ConfirmModal` : boutons en `Button` (`danger` pour confirmer une suppression,
   `secondary` pour annuler), overlay avec `backdrop-filter: blur(3px)`.
3. Contrôle de contraste : pour chaque thème, vérifier un ratio d'au moins 4,5:1 pour
   `--text-faint` sur `--bg-page` et sur `--bg-card`, et pour `--on-accent-solid` sur
   `--accent-solid`. Calculer par script, ne pas estimer à l'œil. Corriger la variable
   du thème si un ratio est insuffisant, et le signaler.
4. Recherche de restes : aucun `font-size` en rem brut, aucun `box-shadow: 0`, aucune
   classe CSS orpheline dans les modules touchés.
5. Relecture : `/ergonomie` sur l'ensemble, puis `/review` avant commit.

---

## Options à décider par Lino (non incluses dans les lots)

1. **Thèmes sombres avec relief.** Aujourd'hui `--bg-card` et `--bg-page` sont identiques
   en `dark` et `obsidian` (choix assumé, "à plat"). Éclaircir légèrement les cartes
   (`#151515` en `dark`, `#1c1929` en `obsidian`) donnerait de la profondeur. Deux lignes
   dans `index.css`.
2. **Salutation selon l'heure** ("Bonjour" / "Bonsoir") sur l'accueil : petite logique,
   donc hors du périmètre "présentation uniquement".
3. **Couleur de la barre du navigateur** (`theme-color`) fixée au rose quel que soit le
   thème : la faire suivre le thème demande une ligne dans `useTheme.js`.
4. **Police hébergée dans le projet** au lieu de Google Fonts : plus rapide et sans
   requête vers un tiers, mais ajoute des fichiers au dépôt.

## Remarques hors périmètre (signalées, à ne pas corriger sans accord)

- `client/src/App.css` n'est importé nulle part : c'est un reste du gabarit Vite.
- `client/dev-dist/` (fichiers générés du service worker) est suivi par git.
- La croix de suppression de `Notes.jsx` est un caractère texte, pas une icône lucide
  comme ailleurs. Non corrigé : le système de notes n'est pas touché.
