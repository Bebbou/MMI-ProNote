import { useState, useEffect } from "react";
import { Bell, Smartphone, Share, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePushNotifications, synchroniserAbonnement } from "../hooks/usePushNotifications";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { estInstalle, enSommeil, mettreEnSommeil } from "../utils/pwa";
import { toast } from "./Toast";
import styles from "./PwaPrompts.module.css";

// Délai avant la première invitation : on laisse l'utilisateur voir la page d'abord
const DELAI_MS = 3000;

// Invitations affichées une seule à la fois, par ordre d'importance :
//  1. iPhone/iPad dans Safari : sans installation, aucune notification n'est possible
//  2. installer l'application (Chrome, Edge, Android)
//  3. activer les notifications
// "Plus tard" met l'invitation en sommeil (quelques jours) pour ne pas harceler.
export default function PwaPrompts() {
  const { user } = useAuth();
  const push = usePushNotifications();
  const { installable, installer } = useInstallPrompt();
  const [pret, setPret] = useState(false);
  const [, rafraichir] = useState(0);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPret(true), DELAI_MS);
    return () => clearTimeout(t);
  }, []);

  // Déjà abonné sur cet appareil ? On s'assure que le serveur le sait
  useEffect(() => {
    if (user?.id) synchroniserAbonnement(user.id);
  }, [user?.id]);

  let mode = null;
  if (pret && user) {
    if (push.needsInstall && !enSommeil("pwa-install")) mode = "ios";
    else if (installable && !estInstalle() && !enSommeil("pwa-install")) mode = "install";
    else if (push.isSupported && push.permission === "default" && !enSommeil("pwa-notif")) mode = "notif";
  }
  if (!mode) return null;

  function plusTard(cle, jours) {
    mettreEnSommeil(cle, jours);
    rafraichir((n) => n + 1);
  }

  async function installerApp() {
    setOccupe(true);
    const resultat = await installer();
    setOccupe(false);
    if (resultat === "dismissed") plusTard("pwa-install", 14);
  }

  async function activerNotifications() {
    setOccupe(true);
    const ok = await push.enable();
    setOccupe(false);
    if (ok) toast("Notifications activées");
    else if (Notification.permission === "denied") plusTard("pwa-notif", 30);
    else toast("Impossible d'activer les notifications", "error");
  }

  const contenu = {
    ios: {
      icone: <Smartphone size={20} strokeWidth={1.5} />,
      titre: "Installe l'application",
      texte: (
        <>
          Sur iPhone, c'est la seule façon de recevoir les notifications. Appuie sur{" "}
          <Share size={13} strokeWidth={1.5} className={styles.inline} /> <strong>Partager</strong> puis sur{" "}
          <strong>« Sur l'écran d'accueil »</strong>.
        </>
      ),
      fermer: () => plusTard("pwa-install", 14),
      libelleFermer: "Plus tard",
    },
    install: {
      icone: <Smartphone size={20} strokeWidth={1.5} />,
      titre: "Installe Pronote-MMI",
      texte: "Un accès direct depuis ton écran d'accueil, plus rapide, et les notifications même app fermée.",
      action: { libelle: "Installer", onClick: installerApp },
      fermer: () => plusTard("pwa-install", 14),
      libelleFermer: "Plus tard",
    },
    notif: {
      icone: <Bell size={20} strokeWidth={1.5} />,
      titre: "Ne rate plus un devoir",
      texte:
        "Une alerte pour les nouveaux devoirs, les évaluations, les cours, et un rappel la veille des échéances.",
      action: { libelle: "Activer", onClick: activerNotifications },
      fermer: () => plusTard("pwa-notif", 7),
      libelleFermer: "Non merci",
    },
  }[mode];

  return (
    <div className={styles.carte} role="dialog" aria-live="polite" aria-label={contenu.titre}>
      <button className={styles.fermer} onClick={contenu.fermer} aria-label="Fermer">
        <X size={14} strokeWidth={1.5} />
      </button>
      <div className={styles.icone}>{contenu.icone}</div>
      <div className={styles.corps}>
        <h3 className={styles.titre}>{contenu.titre}</h3>
        <p className={styles.texte}>{contenu.texte}</p>
        <div className={styles.actions}>
          {contenu.action && (
            <button className={styles.principal} onClick={contenu.action.onClick} disabled={occupe}>
              {occupe ? "…" : contenu.action.libelle}
            </button>
          )}
          <button className={styles.secondaire} onClick={contenu.fermer}>
            {contenu.libelleFermer}
          </button>
        </div>
      </div>
    </div>
  );
}
