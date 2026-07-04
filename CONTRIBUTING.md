# Contribuer à Pronote-MMI

Merci de l'intérêt ! Voici comment participer : 

---
> [!WARNING]
> This is experimental software, primarily built with AI.
## Avant de commencer

- Vérifie qu'une issue n'existe pas déjà pour ce que tu veux faire
- Pour une grosse fonctionnalité, ouvre une issue d'abord pour en discuter
- Lis le [README](README.md) pour installer le projet en local (en vrai juste forks le projet dans ton repo)

---

## Workflow

### 1. Forker et cloner

```bash
git clone https://github.com/Bebbou/MMI-ProNote.git
cd Pronote-MMI
```

### 2. Créer une branche

Nomme ta branche selon ce que tu fais :

```bash
git checkout -b feat/nom-de-la-fonctionnalite
git checkout -b fix/description-du-bug
```

### 3. Code

- **UNE** fonctionnalité par branche, **UN** sujet par commit
- Teste avant de soumettre (par pitié)

### 4. Commit

Utilise des messages clairs en français ou en anglais :

```
feat: ajout de la page statistiques des notes
fix: correction de l'affichage de l'EDT sur mobile
refactor: simplification du middleware requireRole
```
(Dédicace a Lilian qui m'a expliqué comment ça fonctionne)
### 5. Ouvrir une Pull Request

- Décris ce que tu as fait et pourquoi
- Fais référence à l'issue liée si elle existe (`Closes #12`)
- La PR doit cibler la branche `main` et pas une autre branche

---

## Règles de code

- **Frontend** : Globalement avec React, hooks en `use...`, CSS via 'CSS Modules'
- **Backend** : routes séparées par domaine dans `/routes`, pas dans `index.js`
- **Pas de secrets** : ne jamais commiter de fichier `.env` ou de clé en dur dans le code
- **Prisma** : toute modification de schéma passe par une migration (`npx prisma migrate dev`)

---

## Signaler un bug

Ouvre une issue avec :

1. Ce que tu faisais
2. Ce qui s'est passé (message d'erreur, comportement inattendu)
3. Ce qui était attendu


Bisous !
