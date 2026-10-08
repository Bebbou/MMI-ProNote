import { useState, useEffect } from "react";
import api from "../api/index.js";
import { estIOS, estInstalle } from "../utils/pwa.js";

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Le service worker est généré par vite-plugin-pwa et servi à /sw.js (il gère aussi le
// cache hors-ligne). On réutilise son enregistrement s'il existe, sans jamais en
// désinscrire un autre : l'ancien code visait "/api/sw.js", une adresse qui n'existe pas
// (le serveur renvoyait la page d'accueil), donc aucun abonnement push n'a jamais pu être créé.
async function obtenirRegistration() {
  const existante = await navigator.serviceWorker.getRegistration();
  if (!existante) await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

async function creerAbonnement(reg) {
  const { data } = await api.get("/notifications/vapid-public-key");
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.key),
  });
}

// Au démarrage de la session : si l'utilisateur a déjà accepté les notifications, on
// (re)déclare son abonnement au serveur. Couvre un abonnement perdu côté serveur, un
// navigateur partagé entre deux comptes (l'abonnement passe au compte connecté) et un
// abonnement expiré (on en recrée un silencieusement). Une seule fois par page et par compte.
const dejaSynchronise = new Set();

export async function synchroniserAbonnement(userId) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
  if (Notification.permission !== "granted" || dejaSynchronise.has(userId)) return;
  dejaSynchronise.add(userId);
  try {
    const reg = await obtenirRegistration();
    const sub = (await reg.pushManager.getSubscription()) ?? (await creerAbonnement(reg));
    await api.post("/notifications/subscribe", sub.toJSON());
  } catch (err) {
    dejaSynchronise.delete(userId); // on réessaiera au prochain chargement
    console.warn("Synchronisation des notifications impossible :", err);
  }
}

export function usePushNotifications() {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // iPhone/iPad : le push n'existe que pour une app installée sur l'écran d'accueil
  const needsInstall = !isSupported && estIOS() && !estInstalle();

  const [permission, setPermission] = useState(isSupported ? Notification.permission : "denied");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub));
    });
  }, [isSupported]);

  async function enable() {
    if (!isSupported) return false;
    setLoading(true);
    setError("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const reg = await obtenirRegistration();
      const sub = (await reg.pushManager.getSubscription()) ?? (await creerAbonnement(reg));
      await api.post("/notifications/subscribe", sub.toJSON());
      setSubscribed(true);
      return true;
    } catch (err) {
      console.error("Erreur activation notifications:", err);
      setError("Impossible d'activer les notifications. Réessaie dans un instant.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api.delete("/notifications/subscribe", { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Erreur désactivation notifications:", err);
      setError("Impossible de désactiver les notifications.");
    } finally {
      setLoading(false);
    }
  }

  // Envoie une vraie notification à cet appareil pour vérifier que tout fonctionne
  async function sendTest() {
    setError("");
    try {
      await api.post("/notifications/test");
      return true;
    } catch (err) {
      setError(err.response?.data?.error ?? "Impossible d'envoyer la notification de test.");
      return false;
    }
  }

  return { isSupported, needsInstall, permission, subscribed, loading, error, enable, disable, sendTest };
}
