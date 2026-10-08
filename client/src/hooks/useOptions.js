import { useState, useEffect, useCallback } from "react";
import api from "../api/index.js";

// Options (anglais renforcé...) de la promo de l'utilisateur, avec son appartenance
export function useOptions() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const recharger = useCallback(() => {
    api
      .get("/options")
      .then((res) => setOptions(res.data))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger]);

  return { options, setOptions, loading, recharger };
}
