import { useState, useEffect, useRef } from "react";
import { useChatChannel } from "../hooks/useChatChannel";
import { Hash, Plus, Trash2, Send, X, MessageSquare, Pencil, Reply, SmilePlus, ChevronUp, BarChart2 } from "lucide-react";
import SondageCard from "./SondageCard";
import api from "../api/index.js";
import styles from "./ChatPanel.module.css";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export default function ChatPanel() {
  const {
    user, socket,
    channels, setChannels,
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

  const [open, setOpen] = useState(false);
  const [newChannelForm, setNewChannelForm] = useState(false);
  const [newChannelNom, setNewChannelNom] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [emojiPickerFor, setEmojiPickerFor] = useState(null);

  const [sondages, setSondages] = useState([]);
  const [sondageForm, setSondageForm] = useState(false);
  const [sondageQuestion, setSondageQuestion] = useState("");
  const [sondageOptions, setSondageOptions] = useState(["", ""]);

  const isPrivileged = ["admin", "delegue"].includes(user?.role);

  useEffect(() => {
    if (!activeChannel) return;
    api.get(`/sondages/channel/${activeChannel.id}`).then(r => setSondages(r.data));
    setSondageForm(false);
  }, [activeChannel]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (s) => setSondages(prev => [s, ...prev]);
    const onMaj = (s) => setSondages(prev => prev.map(p => p.id === s.id ? s : p));
    const onDel = ({ id }) => setSondages(prev => prev.filter(s => s.id !== id));
    socket.on("nouveauSondage", onNew);
    socket.on("sondageMaj", onMaj);
    socket.on("sondageSupprime", onDel);
    return () => {
      socket.off("nouveauSondage", onNew);
      socket.off("sondageMaj", onMaj);
      socket.off("sondageSupprime", onDel);
    };
  }, [socket]);

  async function handleCreateSondage(e) {
    e.preventDefault();
    const opts = sondageOptions.filter(o => o.trim());
    if (opts.length < 2) return;
    await api.post("/sondages", { question: sondageQuestion, options: opts, channelId: activeChannel.id });
    setSondageForm(false);
    setSondageQuestion("");
    setSondageOptions(["", ""]);
  }

  const bottomRef = useRef(null);
  const messagesRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  const totalUnread = Object.values(unreadByChannel).reduce((a, b) => a + b, 0);

  // Smart scroll
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const onScroll = () => {
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      isAtBottomRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open]);

  async function handleCreateChannel(e) {
    const { default: api } = await import("../api/index.js");
    e.preventDefault();
    const { data } = await api.post("/chat/channels", { nom: newChannelNom, description: newChannelDesc });
    setChannels(prev => [...prev, data]);
    setActiveChannel(data);
    setNewChannelForm(false);
    setNewChannelNom("");
    setNewChannelDesc("");
  }

  async function handleDeleteChannel(channel) {
    const { default: api } = await import("../api/index.js");
    await api.delete(`/chat/channels/${channel.id}`);
  }

  function getReactionCount(reactions) {
    const map = {};
    for (const r of reactions) {
      map[r.emoji] = (map[r.emoji] || []);
      map[r.emoji].push(r.user);
    }
    return map;
  }

  return (
    <div className={`${styles.panel} ${open ? styles.panelOpen : ""}`}>
      <button className={styles.toggleBtn} onClick={() => setOpen(v => !v)}>
        {open ? <X size={16} strokeWidth={1.5} /> : <MessageSquare size={16} strokeWidth={1.5} />}
        {!open && <span>Chat</span>}
        {!open && totalUnread > 0 && <span className={styles.badge}>{totalUnread}</span>}
      </button>

      {open && (
        <div className={styles.inner}>
          {/* Canaux */}
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
                  {(unreadByChannel[c.id] || 0) > 0 && activeChannel?.id !== c.id && (
                    <span className={styles.channelBadge}>{unreadByChannel[c.id]}</span>
                  )}
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
              {isPrivileged && (
                <button className={styles.sondageBtn} onClick={() => setSondageForm(v => !v)} title="Créer un sondage">
                  <BarChart2 size={13} strokeWidth={1.5} />
                </button>
              )}
            </div>

            {sondageForm && (
              <form className={styles.sondageForm} onSubmit={handleCreateSondage}>
                <input placeholder="Question" value={sondageQuestion}
                  onChange={e => setSondageQuestion(e.target.value)} required className={styles.sondageInput} />
                {sondageOptions.map((opt, i) => (
                  <div key={i} className={styles.sondageOptionRow}>
                    <input placeholder={`Option ${i + 1}`} value={opt}
                      onChange={e => setSondageOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                      className={styles.sondageInput} />
                    {sondageOptions.length > 2 && (
                      <button type="button" className={styles.removeOptBtn}
                        onClick={() => setSondageOptions(prev => prev.filter((_, j) => j !== i))}>
                        <X size={11} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}
                {sondageOptions.length < 6 && (
                  <button type="button" className={styles.addOptBtn}
                    onClick={() => setSondageOptions(prev => [...prev, ""])}>+ Option</button>
                )}
                <div className={styles.sondageFormActions}>
                  <button type="submit" className={styles.sondageSubmit}>Créer</button>
                  <button type="button" className={styles.sondageCancel} onClick={() => setSondageForm(false)}>Annuler</button>
                </div>
              </form>
            )}

            <div className={styles.messages} ref={messagesRef}>
              {hasMore && (
                <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
                  <ChevronUp size={13} strokeWidth={1.5} />
                  {loadingMore ? "Chargement…" : "Messages précédents"}
                </button>
              )}
              {messages.length === 0 && sondages.length === 0 && <p className={styles.empty}>Aucun message. Sois le premier !</p>}
              {sondages.map(s => (
                <SondageCard
                  key={s.id}
                  sondage={s}
                  currentUserId={user?.id}
                  isPrivileged={isPrivileged && (user?.role === "admin" || s.auteur.id === user?.id)}
                  onUpdate={updated => setSondages(prev => prev.map(p => p.id === updated.id ? updated : p))}
                  onDelete={id => setSondages(prev => prev.filter(s => s.id !== id))}
                />
              ))}
              {messages.map((msg, i) => {
                // eslint-disable-next-line eqeqeq
                const isMe = msg.auteur.id == user?.id;
                const showDate = i === 0 || formatDate(msg.createdAt) !== formatDate(messages[i - 1].createdAt);
                const reactionMap = getReactionCount(msg.reactions || []);

                return (
                  <div key={msg.id}>
                    {showDate && <div className={styles.dateSep}>{formatDate(msg.createdAt)}</div>}
                    <div className={`${styles.message} ${isMe ? styles.messageMe : ""}`}
                      onMouseLeave={() => setEmojiPickerFor(null)}>
                      <span className={`${styles.auteur} ${isMe ? styles.auteurMe : ""}`}>
                        {isMe ? "Vous" : msg.auteur.nom}
                      </span>

                      {/* Citation de réponse */}
                      {msg.replyTo && (
                        <div className={styles.replyQuote}>
                          <span className={styles.replyQuoteAuteur}>{msg.replyTo.auteur.nom}</span>
                          <span className={styles.replyQuoteContent}>{msg.replyTo.content}</span>
                        </div>
                      )}

                      {/* Bulle */}
                      {editingId === msg.id ? (
                        <form className={styles.editForm} onSubmit={handleEditMessage}>
                          <input
                            value={editInput}
                            onChange={e => setEditInput(e.target.value)}
                            autoFocus
                          />
                          <button type="submit"><Send size={12} strokeWidth={1.5} /></button>
                          <button type="button" onClick={() => setEditingId(null)}><X size={12} strokeWidth={1.5} /></button>
                        </form>
                      ) : (
                        <div className={styles.bubble}>
                          <span>{msg.content}</span>
                          {msg.editedAt && <span className={styles.editedLabel}>(modifié)</span>}
                          <span className={styles.time}>{formatTime(msg.createdAt)}</span>
                          <div className={styles.msgActions}>
                            <button className={styles.actionBtn} title="Réagir"
                              onClick={() => setEmojiPickerFor(prev => prev === msg.id ? null : msg.id)}>
                              <SmilePlus size={11} strokeWidth={1.5} />
                            </button>
                            <button className={styles.actionBtn} title="Répondre"
                              onClick={() => setReplyingTo(msg)}>
                              <Reply size={11} strokeWidth={1.5} />
                            </button>
                            {isMe && (
                              <button className={styles.actionBtn} title="Modifier"
                                onClick={() => { setEditingId(msg.id); setEditInput(msg.content); }}>
                                <Pencil size={11} strokeWidth={1.5} />
                              </button>
                            )}
                            {user?.role === "admin" && (
                              <button className={styles.actionBtn} title="Supprimer"
                                onClick={() => handleDeleteMessage(msg.id)}>
                                <Trash2 size={11} strokeWidth={1.5} />
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

            {/* Typing indicator */}
            {typingLabel && <div className={styles.typing}>{typingLabel}</div>}

            {/* Répondre à */}
            {replyingTo && (
              <div className={styles.replyBar}>
                <Reply size={12} strokeWidth={1.5} />
                <span>Répondre à <strong>{replyingTo.auteur.nom}</strong> : {replyingTo.content.slice(0, 40)}{replyingTo.content.length > 40 ? "…" : ""}</span>
                <button onClick={() => setReplyingTo(null)}><X size={12} strokeWidth={1.5} /></button>
              </div>
            )}

            {activeChannel?.type === "annonce" && !["admin", "delegue"].includes(user?.role) ? (
              <div className={styles.readOnly}>Canal en lecture seule — seuls les admins peuvent écrire.</div>
            ) : (
            <form className={styles.inputArea} onSubmit={handleSend}>
              <textarea
                ref={textareaRef}
                className={styles.msgInput}
                placeholder={`#${activeChannel?.nom ?? "..."}`}
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
                <Send size={14} strokeWidth={1.5} />
              </button>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
