// Qui voit et qui gère quel cours (issues #49 et #25) :
//  - voir : les admins voient tout ; les autres ne voient que les cours de leur promo ;
//    un professeur voit en plus ses propres cours, même destinés à une autre promo
//  - gérer (modifier/supprimer) : les admins gèrent tout, un professeur seulement les siens

export function peutVoirDocument(user, doc) {
  if (user.role === "admin") return true;
  if (user.role === "professeur" && doc.auteurId === user.id) return true;
  return doc.promo === user.promo;
}

export function peutGererDocument(user, doc) {
  if (user.role === "admin") return true;
  return user.role === "professeur" && doc.auteurId === user.id;
}
