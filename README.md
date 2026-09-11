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

- **Devoirs** — création, modification et suppression par les délégués et admins, mise à jour en temps réel pour tout le groupe via Socket.IO
- **Notes** — saisie personnelle de notes avec coefficient et calcul de moyenne par matière
- **Emploi du temps** — vrai calendrier daté, synchronisé automatiquement (toutes les heures) depuis le flux iCal ADE de chaque groupe ; vue navigable semaine par semaine, un jour à la fois sur mobile, détail d'un cours (salle, prof) au clic ; les URLs des flux se configurent par groupe dans le panel Admin
- **Chat** — messagerie temps réel par canaux (général, groupe, filière, personnalisés), réactions aux messages, accès aux canaux vérifié côté serveur (pas seulement filtré à l'affichage)
- **Documents** — partage de fichiers de cours (PDF) avec commentaires
- **Sondages** — création par les délégués/admins, vote en temps réel
- **Notifications push** — alertes navigateur/mobile même app fermée (PWA installable)
- **Profil** — consultation des informations de son compte, changement de mot de passe
- **Thèmes** — 5 thèmes visuels au choix (MMI, Sombre, Bleu, Pastel, Obsidian), sauvegardés par utilisateur
- **Mode Canvas** — vue alternative en widgets repositionnables (React Flow), positions persistées
- **Admin** — validation des comptes, changement de rôles, suppression d'utilisateurs, configuration des flux iCal de l'EDT
- **Authentification** — inscription avec validation manuelle par un admin, connexion par JWT, réinitialisation de mot de passe par email

---

## Stack technique

| Côté | Technologies |
|------|-------------|
| Frontend | React 19, React Router, Axios, CSS Modules, Vite, @xyflow/react |
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
- Une base PostgreSQL (locale ou hébergée, ex. Railway)
- npm évidemment

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Bebbou/MMI-ProNote.git
cd Pronote-MMI
```

### 2. Configurer le serveur

```bash
cd server
cp .env.example .env
# Remplir DATABASE_URL, JWT_SECRET et les clés VAPID dans .env
npm install
npx prisma migrate dev --name init
node index.js
```

### 3. Configurer le client

```bash
cd ../client
npm install
npm run dev
```

Le client tourne sur `http://localhost:5173`, le serveur sur `http://localhost:3000`.

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
| `RESEND_API_KEY` | Clé API [Resend](https://resend.com) pour l'envoi des emails de réinitialisation de mot de passe | `re_xxxxxxxx` |

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
│       ├── hooks/                # useSocket, useTheme, usePushNotifications
│       ├── pages/                # Une page par route
│       ├── widgets/              # Widgets du mode Canvas
│       └── sw.js                 # Service worker (notifications push)
├── server/                     # Backend Express
│   ├── middlewares/             # requireAuth, requireRole
│   ├── routes/                  # auth, admin, devoirs, notes, edt, profil,
│   │                            #   chat, documents, sondages, notifications
│   ├── services/                # edtSync (synchronisation des flux iCal ADE)
│   ├── utils/                   # push (notifications), chatAccess (autorisation par canal)
│   ├── prisma/
│   │   ├── schema.prisma        # Modèles de la base de données
│   │   └── migrations/          # Historique des migrations SQL
│   └── index.js                 # Point d'entrée du serveur
└── README.md
```

---

## Rôles utilisateurs

| Rôle | Droits |
|------|--------|
| `etudiant` | Lecture devoirs/EDT, gestion de ses propres notes, chat, vote aux sondages |
| `delegue` | + Création/modification/suppression de devoirs, création de sondages et annonces |
| `admin` | Accès complet, gestion des comptes, des rôles et de l'EDT |

> Les nouveaux comptes sont en attente de validation par un admin avant de pouvoir se connecter.

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
