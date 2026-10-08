# Pronote-MMI

Application web pour les étudiants MMI, l'idée c'est : 
- gestion des devoirs, notes et emploi du temps
- chat en temps réel, documents partagés, sondages et annonces
- le tout avec mises à jour instantanées entre membres d'un même groupe

---
> [!WARNING]
> This is experimental software, primarily built with AI.

## Utilisation de l'Intelligence Artificielle (avant tout, autant le mettre ici x))

Ce projet est réalisé MAJORITAIREMENT avec l'aide de l'Intelligence Artificielle. Je suis réellement loin d'avoir le niveau pour réaliser ce projet, mais sa réalisation me permet de progresser et de mieux comprendre comment réellement réaliser un "Logiciel" à un niveau professionnel.

En bref, si vous me dites : "Aaahh, c'est de l'IA", je répondrai que, pour la majorité, oui. Mais au moins, je sais exactement comment fonctionne l'intégralité du projet et ce que fait chaque partie.

## Fonctionnalités

- **Devoirs et évaluations** — créés par les délégués, professeurs et admins, avec consignes, commentaires et mise à jour en temps réel (Socket.IO). Agenda regroupé par échéance (dépassée, aujourd'hui, demain...), filtres par type, matière et audience, recherche
- **Audience d'un devoir** — son groupe, une **option** transversale aux groupes (ex. « Anglais renforcé » : des élèves répartis dans plusieurs TD), ou, pour un professeur ou un admin, toute une promo ou un autre groupe
- **Options** — chaque élève choisit les siennes dans son Profil ; les admins créent et suppriment les options de la promo
- **Notes** — saisie personnelle de notes avec coefficient et calcul de moyenne par matière
- **Emploi du temps** — vrai calendrier daté, synchronisé automatiquement (toutes les heures) depuis le flux iCal ADE de chaque groupe ; vue navigable semaine par semaine, un jour à la fois sur mobile, détail d'un cours (salle, prof) au clic ; les URLs des flux se configurent par groupe dans le panel Admin
- **Chat** — messagerie temps réel par canaux (général, groupe, filière, personnalisés), réactions aux messages, accès aux canaux vérifié côté serveur (pas seulement filtré à l'affichage)
- **Documents** — cours (PDF) avec commentaires, **cloisonnés par promo** : une promo ne voit que ses propres cours. Publiés par les professeurs (qui gèrent les leurs) et les admins ; espace de stockage plafonné
- **Sondages** — création par les délégués/admins, vote en temps réel
- **Notifications** — cloche dans l'application (historique de 30 jours, même sans push), alertes push navigateur/mobile app fermée, **rappel automatique la veille d'une échéance** pour ceux qui n'ont pas rendu, préférences par catégorie (devoirs, rappels, cours, annonces)
- **Application installable (PWA)** — invitation à l'installation (indispensable sur iPhone pour recevoir les notifications) et à l'activation des notifications
- **Profil** — informations du compte, options, notifications (état, test, préférences), thème, changement de mot de passe
- **Thèmes** — 5 thèmes visuels au choix (MMI, Sombre, Bleu, Pastel, Obsidian), sauvegardés par utilisateur
- **MMIparty** — raccourci vers [MMIparty](https://play.mmiparty.fr/), le projet d'une étudiante de la promo
- **Admin** — validation des comptes, changement de rôles, suppression d'utilisateurs (avec recherche, filtres par promo, groupe et rôle, pagination), configuration des flux iCal de l'EDT
- **Authentification** — inscription avec validation manuelle par un admin, connexion par JWT, réinitialisation de mot de passe par email

---

## Stack technique

| Côté | Technologies |
|------|-------------|
| Frontend | React 19, React Router, Axios, CSS Modules, Vite (PWA) |
| Backend | Node.js, Express, Socket.IO |
| Base de données | PostgreSQL via Prisma ORM |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Notifications | web-push (Web Push API) + Service Worker |
| Emploi du temps | node-ical (synchronisation des flux ADE) |
| Emails | Resend (réinitialisation de mot de passe) |

---

## Déploiement

- **Frontend** — [Netlify](https://netlify.com) (build automatique à chaque push sur `main`)
- **Backend + base de données** — [Railway](https://railway.app) (`npm start` lance `prisma migrate deploy` avant de démarrer le serveur)

---

## Prérequis

- [Node.js](https://nodejs.org) v18 ou supérieur
- [Docker](https://www.docker.com/products/docker-desktop/) pour la base PostgreSQL locale (ou n'importe quelle base PostgreSQL)
- npm évidemment

---

## Installation (développement local)

La base de développement est **locale** : elle n'a aucun lien avec la production (Railway), on peut donc créer et casser des données sans risque.

### 1. Cloner le dépôt et lancer la base

```bash
git clone https://github.com/Bebbou/MMI-ProNote.git
cd MMI-ProNote
docker compose up -d
```

### 2. Configurer et lancer le serveur

```bash
cd server
cp .env.example .env
# Dans .env : DATABASE_URL="postgresql://postgres:dev@localhost:5432/pronote_mmi" et un JWT_SECRET
npm install
npm run db:push     # crée les tables d'après le schéma
npm run seed        # comptes et données de test (voir ci-dessous)
npm run dev
```

> **`db:push` et non `migrate`** : l'historique de migrations suppose que les tables de base existent déjà (il ne construit pas une base vide). `prisma migrate deploy` ne sert qu'en production. **Ne lance jamais `prisma migrate dev`** sur la base de production : il peut proposer de la réinitialiser.

### 3. Lancer le client

```bash
cd client
npm install
npm run dev
```

Le client tourne sur `http://localhost:5173`, le serveur sur `http://localhost:3000`.

### Comptes de test

`npm run seed` crée un compte par rôle, tous avec le mot de passe défini dans [`server/scripts/seed.js`](server/scripts/seed.js) : `admin@test.local`, `delegue@test.local`, `prof@test.local`, `eleve.a1@test.local`, `eleve.a2@test.local`, `eleve.b1@test.local` (MMI2) et `eleve.mmi3@test.local` (MMI3), avec une option, des devoirs ciblés différemment et deux cours de promos différentes. Le script refuse de tourner si `DATABASE_URL` ne pointe pas vers la machine locale.

Sans clé Resend, le lien de « mot de passe oublié » s'affiche dans la console du serveur.

### Vérifier que tout fonctionne

```bash
cd server
npm test            # tests unitaires et de routes (base simulée)
npm run smoke       # vérifications de bout en bout sur la base locale (serveur lancé)
```

La CI GitHub (`.github/workflows/ci.yml`) rejoue les tests, le lint, le build du client et ces vérifications sur une base PostgreSQL jetable.

---

## Variables d'environnement

Fichier `server/.env` (copie de `.env.example`) :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion à la base PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Clé secrète pour signer les tokens JWT | `une_chaine_aleatoire_longue` |
| `CLIENT_ORIGIN` | URL(s) du frontend autorisée(s) en CORS — plusieurs origines séparées par des virgules (ex. pendant une migration d'hébergeur) | `https://monsite.netlify.app` |
| `VAPID_EMAIL` | Email de contact pour les notifications push | `ton@email.com` |
| `VAPID_PUBLIC_KEY` | Clé publique VAPID (`npx web-push generate-vapid-keys`) | — |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID | — |
| `RESEND_API_KEY` | Clé API [Resend](https://resend.com) pour les emails de réinitialisation de mot de passe. L'envoi à d'autres adresses que la tienne exige un nom de domaine vérifié chez Resend | `re_xxxxxxxx` |
| `MAX_DOCS_MB` | Plafond de stockage des cours (PDF), en Mo — optionnel, 350 par défaut (le volume Railway fait 500 Mo) | `350` |

---

## Structure du projet

```
Pronote-MMI/
├── client/                     # Frontend React
│   └── src/
│       ├── api/                # Client HTTP Axios (token auto-injecté)
│       ├── assets/              # Logo MMI, images
│       ├── components/          # Composants partagés (Layout, PageTitle,
│       │                        #   MmiDecor, Toast, ConfirmModal, Skeleton...)
│       ├── context/             # AuthContext (état global auth)
│       ├── hooks/                # useSocket, useTheme, usePushNotifications, useNotifications,
│       │                        #   useInstallPrompt, useOptions
│       ├── pages/                # Une page par route
│       ├── utils/                # echeance (agenda des devoirs), pwa, temps
│       └── sw.js                 # Service worker (cache hors-ligne, notifications push)
├── server/                     # Backend Express
│   ├── middlewares/             # requireAuth, requireRole
│   ├── routes/                  # auth, admin, devoirs, options, notes, edt, profil,
│   │                            #   chat, documents, sondages, notifications
│   ├── services/                # edtSync (flux iCal ADE), rappels (rappel la veille d'une échéance)
│   ├── scripts/                 # seed (données de test), smoke (vérifications de bout en bout)
│   ├── tests/                   # tests unitaires et de routes (Vitest + supertest)
│   ├── utils/                   # notifier (envoi central), push, devoirAccess, documentAccess,
│   │                            #   chatAccess : règles de visibilité et d'accès
│   ├── prisma/
│   │   ├── schema.prisma        # Modèles de la base de données
│   │   └── migrations/          # Historique des migrations SQL
│   └── index.js                 # Point d'entrée du serveur
├── docker-compose.yml          # Base PostgreSQL locale
└── README.md
```

---

## Rôles utilisateurs

| Rôle | Droits |
|------|--------|
| `etudiant` | Lecture des devoirs, cours de sa promo et EDT, gestion de ses propres notes, chat, vote aux sondages, choix de ses options |
| `delegue` | + Création/modification/suppression de devoirs (pour son groupe ou une option, hors devoirs d'un professeur), sondages et annonces |
| `professeur` | Publie des cours (pour la promo de son choix) et crée des devoirs et évaluations pour un groupe, une promo entière ou une option ; ne gère que ses propres contenus |
| `admin` | Accès complet, gestion des comptes, des rôles, des options, des groupes et de l'EDT |

> Les nouveaux comptes sont en attente de validation par un admin avant de pouvoir se connecter. Un professeur s'inscrit comme un élève ; l'admin lui attribue ensuite le rôle dans le panel Admin.

---

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md). Merci de respecter le [Code de conduite](CODE_OF_CONDUCT.md).

## Sécurité

Une faille de sécurité à signaler ? Voir [SECURITY.md](SECURITY.md)

NE PAS METTRE L'ISSUE EN PUBLIQUE.

## Crédits

Voir [CREDITS.md](CREDITS.md) — testeurs, ressources et outils utilisés.

## Licence

Ce projet est sous licence MIT — voir [LICENSE](LICENSE).

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue">
</p>
