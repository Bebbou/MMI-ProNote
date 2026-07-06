import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/index.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // Au démarrage, vérifie que le token est toujours valable et
  // rafraîchit les infos utilisateur (rôle, groupe) depuis le serveur
  useEffect(() => {
    if (!token) return;

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      })
      .catch((err) => {
        // Token expiré ou compte supprimé : on déconnecte proprement.
        // Les erreurs réseau (serveur endormi) ne déconnectent pas.
        if (err.response?.status === 401 || err.response?.status === 404) {
          logout();
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(userData, jwt) {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", jwt);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
