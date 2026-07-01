import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import Layout from "../components/Layout";
import api from "../api/index.js";
import { Hash, Plus, Trash2, Send } from "lucide-react";
import styles from "./Chat.module.css";

export default function Chat() {
  const { user } = useAuth();
  const socket = useSocket();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [newChannelForm, setNewChannelForm] = useState(false);
  const [newChannelNom, setNewChannelNom] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const bottomRef = useRef(null);
  const activeChannelRef = useRef(null);

  // Chargement des canaux
  useEffect(() => {
    api.get("/chat/channels").then(res => {
      setChannels(res.data);
      if (res.data.length > 0) setActiveChannel(res.data[0]);
    });
  }, []);

  // Écoute Socket.IO pour les nouveaux canaux
  useEffect(() => {
    if (!socket) return;
    socket.on("nouveauChannel", (channel) => setChannels(prev => [...prev, channel]));
    socket.on("channelSupprime", ({ id }) => {
      setChannels(prev => prev.filter(c => c.id !== id));
      setActiveChannel(prev => prev?.id === id ? null : prev);
    });
    return () => {
      socket.off("nouveauChannel");
      socket.off("channelSupprime");
    };
  }, [socket]);

  // Chargement des messages + rejoindre la room socket quand on change de canal
  useEffect(() => {
    if (!activeChannel) return;

    // Quitter l'ancien canal
    if (activeChannelRef.current && activeChannelRef.current !== activeChannel.id) {
      socket?.emit("quitterChannel", activeChannelRef.current);
    }
    activeChannelRef.current = activeChannel.id;

    api.get(`/chat/channels/${activeChannel.id}/messages`).then(res => setMessages(res.data));
    socket?.emit("rejoindreChannel", activeChannel.id);
  }, [activeChannel, socket]);

  // Réception des nouveaux messages en temps réel
  useEffect(() => {
    if (!socket) return;
    socket.on("nouveauMessage", (msg) => {
      if (msg.channelId === activeChannelRef.current) {
        setMessages(prev => [...prev, msg]);
      }
    });
    return () => socket.off("nouveauMessage");
  }, [socket]);

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !activeChannel) return;
    socket?.emit("envoyerMessage", { channelId: activeChannel.id, content: input });
    setInput("");
  }

  async function handleCreateChannel(e) {
    e.preventDefault();
    const { data } = await api.post("/chat/channels", { nom: newChannelNom, description: newChannelDesc });
    setChannels(prev => [...prev, data]);
    setActiveChannel(data);
    setNewChannelForm(false);
    setNewChannelNom("");
    setNewChannelDesc("");
  }

  async function handleDeleteChannel(channel) {
    await api.delete(`/chat/channels/${channel.id}`);
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  }

  return (
    <Layout>
      <div className={styles.page}>
        {/* Sidebar canaux */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Canaux</span>
            {user?.role === "admin" && (
              <button className={styles.addBtn} onClick={() => setNewChannelForm(v => !v)} title="Créer un canal">
                <Plus size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          {newChannelForm && (
            <form className={styles.newChannelForm} onSubmit={handleCreateChannel}>
              <input
                placeholder="Nom du canal"
                value={newChannelNom}
                onChange={e => setNewChannelNom(e.target.value)}
                required
              />
              <input
                placeholder="Description (optionnel)"
                value={newChannelDesc}
                onChange={e => setNewChannelDesc(e.target.value)}
              />
              <button type="submit">Créer</button>
            </form>
          )}

          <div className={styles.channelList}>
            {channels.map(c => (
              <div
                key={c.id}
                className={`${styles.channelItem} ${activeChannel?.id === c.id ? styles.channelActive : ""}`}
                onClick={() => setActiveChannel(c)}
              >
                <Hash size={13} strokeWidth={1.5} />
                <span>{c.nom}</span>
                {user?.role === "admin" && c.type === "custom" && (
                  <button
                    className={styles.deleteChannelBtn}
                    onClick={e => { e.stopPropagation(); handleDeleteChannel(c); }}
                    title="Supprimer"
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Zone de messages */}
        <div className={styles.chatArea}>
          {activeChannel ? (
            <>
              <div className={styles.chatHeader}>
                <Hash size={15} strokeWidth={1.5} />
                <span className={styles.chatTitle}>{activeChannel.nom}</span>
                {activeChannel.description && (
                  <span className={styles.chatDesc}>{activeChannel.description}</span>
                )}
              </div>

              <div className={styles.messages}>
                {messages.length === 0 && (
                  <p className={styles.empty}>Aucun message pour l'instant. Sois le premier !</p>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.auteur.id === user?.id;
                  const showDate = i === 0 || formatDate(msg.createdAt) !== formatDate(messages[i - 1].createdAt);
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className={styles.dateSeparator}>{formatDate(msg.createdAt)}</div>
                      )}
                      <div className={`${styles.message} ${isMe ? styles.messageMe : ""}`}>
                        {!isMe && <span className={styles.msgAuteur}>{msg.auteur.nom}</span>}
                        <div className={styles.msgBubble}>
                          <span>{msg.content}</span>
                          <span className={styles.msgTime}>{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form className={styles.inputArea} onSubmit={handleSend}>
                <input
                  className={styles.msgInput}
                  placeholder={`Message dans #${activeChannel.nom}`}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className={styles.sendBtn} disabled={!input.trim()}>
                  <Send size={16} strokeWidth={1.5} />
                </button>
              </form>
            </>
          ) : (
            <div className={styles.noChannel}>Sélectionne un canal pour commencer.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
