import { useState, useEffect, useRef } from "react";
import { useChatChannel } from "../hooks/useChatChannel";
import Layout from "../components/Layout";
import api from "../api/index.js";
import { Hash, Plus, Trash2, Send, X, Pencil, Reply, SmilePlus, ChevronUp } from "lucide-react";
import styles from "./Chat.module.css";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export default function Chat() {
  const {
    user, channels, setChannels,
    activeChannel, setActiveChannel,
    messages, hasMore, loadMore, loadingMore,
    input, setInput,
    typingLabel,
    unreadByChannel,
    editingId, setEditingId, editInput, setEditInput,
    replyingTo, setReplyingTo,
    handleSend, handleDeleteMessage, handleEditMessage, handleReaction,
    formatTime, formatDate,
  } = useChatChannel();

  const [newChannelForm, setNewChannelForm] = useState(false);
  const [newChannelNom, setNewChannelNom] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [emojiPickerFor, setEmojiPickerFor] = useState(null);

  const bottomRef = useRef(null);
  const messagesRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  // Smart scroll
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const onScroll = () => {
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  function getReactionMap(reactions) {
    const map = {};
    for (const r of reactions) {
      if (!map[r.emoji]) map[r.emoji] = [];
      map[r.emoji].push(r.user);
    }
    return map;
  }

  return (
    <Layout>
      <div className={styles.page}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Canaux</span>
            {user?.role === "admin" && (
              <button className={styles.addBtn} onClick={() => setNewChannelForm(v => !v)}>
                <Plus size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          {newChannelForm && (
            <form className={styles.newChannelForm} onSubmit={handleCreateChannel}>
              <input placeholder="Nom du canal" value={newChannelNom} onChange={e => setNewChannelNom(e.target.value)} required />
              <input placeholder="Description (optionnel)" value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} />
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
                {(unreadByChannel[c.id] || 0) > 0 && activeChannel?.id !== c.id && (
                  <span className={styles.channelBadge}>{unreadByChannel[c.id]}</span>
                )}
                {user?.role === "admin" && c.type === "custom" && (
                  <button className={styles.deleteChannelBtn}
                    onClick={e => { e.stopPropagation(); handleDeleteChannel(c); }}>
                    <Trash2 size={11} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Zone messages */}
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

              <div className={styles.messages} ref={messagesRef}>
                {hasMore && (
                  <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
                    <ChevronUp size={14} strokeWidth={1.5} />
                    {loadingMore ? "Chargement…" : "Messages précédents"}
                  </button>
                )}
                {messages.length === 0 && (
                  <p className={styles.empty}>Aucun message pour l'instant. Sois le premier !</p>
                )}
                {messages.map((msg, i) => {
                  // eslint-disable-next-line eqeqeq
                  const isMe = msg.auteur.id == user?.id;
                  const showDate = i === 0 || formatDate(msg.createdAt) !== formatDate(messages[i - 1].createdAt);
                  const reactionMap = getReactionMap(msg.reactions || []);

                  return (
                    <div key={msg.id}>
                      {showDate && <div className={styles.dateSeparator}>{formatDate(msg.createdAt)}</div>}
                      <div
                        className={`${styles.message} ${isMe ? styles.messageMe : ""}`}
                        onMouseLeave={() => setEmojiPickerFor(null)}
                      >
                        <span className={`${styles.msgAuteur} ${isMe ? styles.msgAuteurMe : ""}`}>
                          {isMe ? "Vous" : msg.auteur.nom}
                        </span>

                        {/* Citation réponse */}
                        {msg.replyTo && (
                          <div className={styles.replyQuote}>
                            <span className={styles.replyQuoteAuteur}>{msg.replyTo.auteur.nom}</span>
                            <span className={styles.replyQuoteContent}>{msg.replyTo.content}</span>
                          </div>
                        )}

                        {/* Édition inline */}
                        {editingId === msg.id ? (
                          <form className={styles.editForm} onSubmit={handleEditMessage}>
                            <input value={editInput} onChange={e => setEditInput(e.target.value)} autoFocus />
                            <button type="submit"><Send size={13} strokeWidth={1.5} /></button>
                            <button type="button" onClick={() => setEditingId(null)}><X size={13} strokeWidth={1.5} /></button>
                          </form>
                        ) : (
                          <div className={styles.msgBubble}>
                            <span>{msg.content}</span>
                            {msg.editedAt && <span className={styles.editedLabel}>(modifié)</span>}
                            <span className={styles.msgTime}>{formatTime(msg.createdAt)}</span>
                            <div className={styles.msgActions}>
                              <button className={styles.actionBtn} title="Réagir"
                                onClick={() => setEmojiPickerFor(prev => prev === msg.id ? null : msg.id)}>
                                <SmilePlus size={13} strokeWidth={1.5} />
                              </button>
                              <button className={styles.actionBtn} title="Répondre"
                                onClick={() => setReplyingTo(msg)}>
                                <Reply size={13} strokeWidth={1.5} />
                              </button>
                              {isMe && (
                                <button className={styles.actionBtn} title="Modifier"
                                  onClick={() => { setEditingId(msg.id); setEditInput(msg.content); }}>
                                  <Pencil size={13} strokeWidth={1.5} />
                                </button>
                              )}
                              {user?.role === "admin" && (
                                <button className={styles.actionBtn} title="Supprimer"
                                  onClick={() => handleDeleteMessage(msg.id)}>
                                  <Trash2 size={13} strokeWidth={1.5} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Picker emoji */}
                        {emojiPickerFor === msg.id && (
                          <div className={styles.emojiPicker}>
                            {EMOJIS.map(emoji => (
                              <button key={emoji} className={styles.emojiBtn}
                                onClick={() => { handleReaction(msg.id, emoji); setEmojiPickerFor(null); }}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Réactions */}
                        {Object.keys(reactionMap).length > 0 && (
                          <div className={styles.reactions}>
                            {Object.entries(reactionMap).map(([emoji, users]) => {
                              // eslint-disable-next-line eqeqeq
                              const iMine = users.some(u => u.id == user?.id);
                              return (
                                <button key={emoji}
                                  className={`${styles.reaction} ${iMine ? styles.reactionMine : ""}`}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  title={users.map(u => u.nom).join(", ")}>
                                  {emoji} {users.length}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {typingLabel && <div className={styles.typingIndicator}>{typingLabel}</div>}

              {replyingTo && (
                <div className={styles.replyBar}>
                  <Reply size={13} strokeWidth={1.5} />
                  <span>Répondre à <strong>{replyingTo.auteur.nom}</strong> : {replyingTo.content.slice(0, 60)}{replyingTo.content.length > 60 ? "…" : ""}</span>
                  <button onClick={() => setReplyingTo(null)}><X size={13} strokeWidth={1.5} /></button>
                </div>
              )}

              {activeChannel?.type === "annonce" && !["admin", "delegue"].includes(user?.role) ? (
                <div className={styles.readOnly}>Canal en lecture seule — seuls les admins peuvent écrire.</div>
              ) : (
              <form className={styles.inputArea} onSubmit={handleSend}>
                <textarea
                  ref={textareaRef}
                  className={styles.msgInput}
                  placeholder={`Message dans #${activeChannel.nom}`}
                  value={input}
                  rows={1}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim()) handleSend(e);
                      e.target.style.height = "auto";
                    }
                  }}
                />
                <button type="submit" className={styles.sendBtn} disabled={!input.trim()}>
                  <Send size={16} strokeWidth={1.5} />
                </button>
              </form>
              )}
            </>
          ) : (
            <div className={styles.noChannel}>Sélectionne un canal pour commencer.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
