import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import api from "../api/index.js";
import { Hash, Plus, Trash2, Send, X, MessageSquare } from "lucide-react";
import styles from "./ChatPanel.module.css";

export default function ChatPanel() {
  const { user } = useAuth();
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [newChannelForm, setNewChannelForm] = useState(false);
  const [newChannelNom, setNewChannelNom] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const activeChannelRef = useRef(null);

  useEffect(() => {
    api.get("/chat/channels").then(res => {
      setChannels(res.data);
      if (res.data.length > 0) setActiveChannel(res.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("nouveauChannel", (c) => setChannels(prev => [...prev, c]));
    socket.on("channelSupprime", ({ id }) => {
      setChannels(prev => prev.filter(c => c.id !== id));
      setActiveChannel(prev => prev?.id === id ? null : prev);
    });
    return () => {
      socket.off("nouveauChannel");
      socket.off("channelSupprime");
    };
  }, [socket]);

  useEffect(() => {
    if (!activeChannel) return;
    if (activeChannelRef.current && activeChannelRef.current !== activeChannel.id) {
      socket?.emit("quitterChannel", activeChannelRef.current);
    }
    activeChannelRef.current = activeChannel.id;
    api.get(`/chat/channels/${activeChannel.id}/messages`).then(res => setMessages(res.data));
    socket?.emit("rejoindreChannel", activeChannel.id);
  }, [activeChannel, socket]);

  useEffect(() => {
    if (!socket) return;
    socket.on("nouveauMessage", (msg) => {
      if (msg.channelId === activeChannelRef.current) {
        setMessages(prev => [...prev, msg]);
        if (!open) setUnread(u => u + 1);
      }
    });
    socket.on("messageSupprime", ({ id }) => {
      setMessages(prev => prev.filter(m => m.id !== id));
    });
    return () => {
      socket.off("nouveauMessage");
      socket.off("messageSupprime");
    };
  }, [socket, open]);

  async function handleDeleteMessage(msgId) {
    await api.delete(`/chat/messages/${msgId}`);
  }

  useEffect(() => {
    if (open) {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open]);

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
    <div className={`${styles.panel} ${open ? styles.panelOpen : ""}`}>
      {/* Bouton toggle */}
      <button className={styles.toggleBtn} onClick={() => setOpen(v => !v)}>
        {open ? <X size={16} strokeWidth={1.5} /> : <MessageSquare size={16} strokeWidth={1.5} />}
        {!open && <span>Chat</span>}
        {!open && unread > 0 && <span className={styles.badge}>{unread}</span>}
      </button>

      {open && (
        <div className={styles.inner}>
          {/* Liste canaux */}
          <div className={styles.channelBar}>
            <div className={styles.channelBarHeader}>
              <span className={styles.channelBarTitle}>Canaux</span>
              {user?.role === "admin" && (
                <button className={styles.addBtn} onClick={() => setNewChannelForm(v => !v)}>
                  <Plus size={13} strokeWidth={2} />
                </button>
              )}
            </div>

            {newChannelForm && (
              <form className={styles.newChannelForm} onSubmit={handleCreateChannel}>
                <input placeholder="Nom" value={newChannelNom} onChange={e => setNewChannelNom(e.target.value)} required />
                <input placeholder="Description" value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} />
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
                  <Hash size={11} strokeWidth={1.5} />
                  <span>{c.nom}</span>
                  {user?.role === "admin" && c.type === "custom" && (
                    <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); handleDeleteChannel(c); }}>
                      <Trash2 size={10} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className={styles.chatArea}>
            <div className={styles.chatHeader}>
              <Hash size={13} strokeWidth={1.5} />
              <span>{activeChannel?.nom ?? "—"}</span>
            </div>

            <div className={styles.messages}>
              {messages.length === 0 && (
                <p className={styles.empty}>Aucun message. Sois le premier !</p>
              )}
              {messages.map((msg, i) => {
                // eslint-disable-next-line eqeqeq
                const isMe = msg.auteur.id == user?.id;
                const showDate = i === 0 || formatDate(msg.createdAt) !== formatDate(messages[i - 1].createdAt);
                return (
                  <div key={msg.id}>
                    {showDate && <div className={styles.dateSep}>{formatDate(msg.createdAt)}</div>}
                    <div className={`${styles.message} ${isMe ? styles.messageMe : ""}`}>
                      {!isMe && <span className={styles.auteur}>{msg.auteur.nom}</span>}
                      <div className={styles.bubble}>
                        <span>{msg.content}</span>
                        <span className={styles.time}>{formatTime(msg.createdAt)}</span>
                        {user?.role === "admin" && (
                          <button className={styles.deleteMsgBtn} onClick={() => handleDeleteMessage(msg.id)}>
                            <Trash2 size={10} strokeWidth={1.5} />
                          </button>
                        )}
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
                placeholder={`#${activeChannel?.nom ?? "..."}`}
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button type="submit" className={styles.sendBtn} disabled={!input.trim()}>
                <Send size={14} strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
