import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "./useSocket";
import api from "../api/index.js";

export function useChatChannel() {
  const { user } = useAuth();
  const socket = useSocket();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannelState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inputRaw, setInputRaw] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadByChannel, setUnreadByChannel] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const activeChannelRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Chargement des canaux
  useEffect(() => {
    api.get("/chat/channels").then(res => {
      setChannels(res.data);
      if (res.data.length > 0) setActiveChannelState(res.data[0]);
    });
  }, []);

  // Socket : canaux
  useEffect(() => {
    if (!socket) return;
    const onNew = (c) => setChannels(prev => [...prev, c]);
    const onDel = ({ id }) => {
      setChannels(prev => prev.filter(c => c.id !== id));
      setActiveChannelState(prev => prev?.id === id ? null : prev);
    };
    socket.on("nouveauChannel", onNew);
    socket.on("channelSupprime", onDel);
    return () => { socket.off("nouveauChannel", onNew); socket.off("channelSupprime", onDel); };
  }, [socket]);

  // Changement de canal : charger messages + rejoindre room
  useEffect(() => {
    if (!activeChannel) return;
    if (activeChannelRef.current && activeChannelRef.current !== activeChannel.id) {
      socket?.emit("quitterChannel", activeChannelRef.current);
    }
    activeChannelRef.current = activeChannel.id;
    api.get(`/chat/channels/${activeChannel.id}/messages`).then(res => {
      setMessages(res.data.messages);
      setHasMore(res.data.hasMore);
    });
    socket?.emit("rejoindreChannel", activeChannel.id);
    setUnreadByChannel(prev => ({ ...prev, [activeChannel.id]: 0 }));
    setTypingUsers({});
  }, [activeChannel, socket]);

  // Socket : messages + typing + réactions
  useEffect(() => {
    if (!socket) return;

    const onMsg = (msg) => {
      if (msg.channelId === activeChannelRef.current) {
        // eslint-disable-next-line eqeqeq
        if (msg.auteur.id != user?.id) setMessages(prev => [...prev, msg]);
        setTypingUsers(prev => { const n = { ...prev }; delete n[msg.auteur.id]; return n; });
      } else {
        setUnreadByChannel(prev => ({ ...prev, [msg.channelId]: (prev[msg.channelId] || 0) + 1 }));
      }
    };
    const onDel = ({ id }) => setMessages(prev => prev.filter(m => m.id !== id));
    const onEdit = ({ id, content, editedAt }) =>
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content, editedAt } : m));
    const onReaction = ({ messageId, reactions }) =>
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    const onTyping = ({ userId, nom, channelId }) => {
      if (channelId === activeChannelRef.current)
        setTypingUsers(prev => ({ ...prev, [userId]: nom }));
    };
    const onStopTyping = ({ userId }) =>
      setTypingUsers(prev => { const n = { ...prev }; delete n[userId]; return n; });

    socket.on("nouveauMessage", onMsg);
    socket.on("messageSupprime", onDel);
    socket.on("messageModifie", onEdit);
    socket.on("reactionMaj", onReaction);
    socket.on("userTyping", onTyping);
    socket.on("userStopTyping", onStopTyping);
    return () => {
      socket.off("nouveauMessage", onMsg);
      socket.off("messageSupprime", onDel);
      socket.off("messageModifie", onEdit);
      socket.off("reactionMaj", onReaction);
      socket.off("userTyping", onTyping);
      socket.off("userStopTyping", onStopTyping);
    };
  }, [socket, user]);

  function setActiveChannel(channel) {
    setActiveChannelState(channel);
  }

  async function loadMore() {
    if (!activeChannel || !hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const firstRealId = messages.find(m => typeof m.id === "number")?.id;
    if (!firstRealId) { setLoadingMore(false); return; }
    const res = await api.get(`/chat/channels/${activeChannel.id}/messages?before=${firstRealId}`);
    setMessages(prev => [...res.data.messages, ...prev]);
    setHasMore(res.data.hasMore);
    setLoadingMore(false);
  }

  function setInput(val) {
    setInputRaw(val);
    if (!activeChannel || !socket) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("startTyping", { channelId: activeChannel.id, nom: user.nom });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket?.emit("stopTyping", { channelId: activeChannel.id });
    }, 2000);
  }

  function handleSend(e) {
    e.preventDefault();
    if (!inputRaw.trim() || !activeChannel) return;
    const content = inputRaw.trim();

    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    socket?.emit("stopTyping", { channelId: activeChannel.id });

    setMessages(prev => [...prev, {
      id: `tmp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      channelId: activeChannel.id,
      auteur: { id: user.id, nom: user.nom },
      reactions: [],
      replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, auteur: replyingTo.auteur } : null,
      editedAt: null,
    }]);
    socket?.emit("envoyerMessage", {
      channelId: activeChannel.id,
      content,
      replyToId: replyingTo?.id ?? null,
    });
    setInputRaw("");
    setReplyingTo(null);
  }

  async function handleDeleteMessage(msgId) {
    await api.delete(`/chat/messages/${msgId}`);
  }

  async function handleEditMessage(e) {
    e.preventDefault();
    if (!editInput.trim() || !editingId) return;
    await api.patch(`/chat/messages/${editingId}`, { content: editInput.trim() });
    setEditingId(null);
    setEditInput("");
  }

  async function handleReaction(msgId, emoji) {
    await api.post(`/chat/messages/${msgId}/reactions`, { emoji });
  }

  const typingList = Object.values(typingUsers);
  const typingLabel = typingList.length === 0 ? null
    : typingList.length === 1 ? `${typingList[0]} est en train d'écrire…`
    : `${typingList.join(", ")} écrivent…`;

  function formatTime(date) {
    return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  function formatDate(date) {
    return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  }

  return {
    user,
    socket,
    channels, setChannels,
    activeChannel, setActiveChannel,
    messages,
    hasMore, loadMore, loadingMore,
    input: inputRaw, setInput,
    typingLabel,
    unreadByChannel,
    editingId, setEditingId,
    editInput, setEditInput,
    replyingTo, setReplyingTo,
    handleSend,
    handleDeleteMessage,
    handleEditMessage,
    handleReaction,
    formatTime, formatDate,
  };
}
