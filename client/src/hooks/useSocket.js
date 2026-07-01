import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const SERVER_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let socket = null;

export function useSocket() {
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;

    const token = localStorage.getItem("token");
    socket = io(SERVER_URL, { auth: { token } });

    socket.on("connect", () => {
      socket.emit("rejoindreGroupe", user.groupeId);
    });

    initialized.current = true;

    return () => {
      socket?.disconnect();
      socket = null;
      initialized.current = false;
    };
  }, [user]);

  return socket;
}
