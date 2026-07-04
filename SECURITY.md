# Politique de sécurité
> [!WARNING]
> This is experimental software, primarily built with AI.
## Versions maintenues

Ce projet est en développement actif sur la branche `main`. Seule la dernière version déployée en production (Vercel + Railway) est considérée comme à jour et suivie côté sécurité.

## Signaler une vulnérabilité

Si tu découvres une faille de sécurité (authentification, injection, fuite de données, accès non autorisé...), **merci de ne pas l'ouvrir en issue publique**.

À la place, contacte moi :

- **Email** : lino.volle.dev@gmail.com
- Décris la faille aussi précisément que possible : ce que tu as trouvé, comment le reproduire, l'impact potentiel

Tu peux t'attendre à une réponse sous **24h** !

## Ce qui est concerné

Vu le projet, sont particulièrement sensibles :
- L'authentification (JWT, mots de passe, réinitialisation par email)
- Les droits par rôle (étudiant / délégué / admin) et l'isolation entre groupes
- Les données personnelles des utilisateurs (notes, messages, documents)

---

Merci de contribuer à garder le projet sûr pour ceux qui l'utilisent !


Bisous x3