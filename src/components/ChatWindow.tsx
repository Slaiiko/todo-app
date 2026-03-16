import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Send, Trash2, X } from 'lucide-react';
import { Profile } from '../types';
import { getAPIUrl } from '../utils/api';

interface ChatMessage {
  id: number;
  sender_profile_id: number;
  recipient_profile_id: number;
  content: string;
  is_read: number;
  created_at: string;
}

interface ChatConversation {
  profile: Profile;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface Props {
  isOpen: boolean;
  currentProfile: Profile;
  profiles: Profile[];
  onClose: () => void;
}

export default function ChatWindow({ isOpen, currentProfile, profiles, onClose }: Props) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const availableProfiles = useMemo(
    () => profiles.filter((p) => p.id !== currentProfile.id && !p.is_archived),
    [profiles, currentProfile.id]
  );

  const selectedProfile = useMemo(
    () => availableProfiles.find((p) => p.id === selectedProfileId) || null,
    [availableProfiles, selectedProfileId]
  );

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(getAPIUrl(`/chat/conversations/${currentProfile.id}`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const safeData = Array.isArray(data) ? data : [];
      setConversations(safeData);

      if (!selectedProfileId && safeData.length > 0) {
        setSelectedProfileId(Number(safeData[0]?.profile?.id));
      }

      if (selectedProfileId) {
        const stillExists = safeData.some((item: any) => Number(item?.profile?.id) === Number(selectedProfileId));
        if (!stillExists) {
          const fallback = safeData[0]?.profile?.id ?? availableProfiles[0]?.id ?? null;
          setSelectedProfileId(fallback ? Number(fallback) : null);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (peerProfileId: number, silent = false) => {
    if (!silent) setIsLoadingMessages(true);
    try {
      const response = await fetch(getAPIUrl(`/chat/messages?profileA=${currentProfile.id}&profileB=${peerProfileId}`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
      setError(null);
      scrollToBottom();
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err?.message || 'Impossible de charger les messages');
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !selectedProfileId || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(getAPIUrl('/chat/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_profile_id: currentProfile.id,
          recipient_profile_id: selectedProfileId,
          content
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      setMessageInput('');
      await loadMessages(selectedProfileId, true);
      await loadConversations();
    } catch (err: any) {
      setError(err?.message || 'Envoi impossible');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedProfileId) return;
    if (!window.confirm('Supprimer toute la discussion avec ce profil ?')) return;

    try {
      const response = await fetch(getAPIUrl(`/chat/messages?profileA=${currentProfile.id}&profileB=${selectedProfileId}`), {
        method: 'DELETE'
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }
      setMessages([]);
      await loadConversations();
    } catch (err: any) {
      setError(err?.message || 'Suppression impossible');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadConversations();
  }, [isOpen, currentProfile.id]);

  useEffect(() => {
    if (!isOpen || !selectedProfileId) return;
    loadMessages(selectedProfileId);
  }, [isOpen, selectedProfileId]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      loadConversations();
      if (selectedProfileId) {
        loadMessages(selectedProfileId, true);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, selectedProfileId, currentProfile.id]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl h-[80vh] bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl flex"
          >
            <aside className="w-80 border-r border-zinc-700 flex flex-col bg-zinc-900/90">
              <div className="h-14 px-4 border-b border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-100 font-semibold">
                  <MessageCircle className="w-4 h-4" />
                  Discussion
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {availableProfiles.length === 0 && (
                  <p className="text-sm text-zinc-500 px-2 py-4">Aucun autre profil disponible.</p>
                )}

                {availableProfiles.map((profile) => {
                  const conversation = conversations.find((c) => Number(c.profile.id) === Number(profile.id));
                  const isActive = Number(selectedProfileId) === Number(profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfileId(profile.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isActive
                          ? 'bg-indigo-600/20 border-indigo-500/40'
                          : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center text-sm">
                          {profile.logo ? (
                            <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
                          ) : (
                            profile.avatar
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate">{profile.name}</p>
                          <p className="text-xs text-zinc-400 truncate">{conversation?.last_message || 'Aucun message'}</p>
                        </div>
                        {(conversation?.unread_count || 0) > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-white text-[11px] flex items-center justify-center">
                            {conversation?.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex-1 flex flex-col bg-zinc-900">
              <div className="h-14 px-4 border-b border-zinc-700 flex items-center justify-between">
                <div className="text-zinc-100 font-medium">
                  {selectedProfile ? `Conversation avec ${selectedProfile.name}` : 'Choisissez un profil'}
                </div>
                <button
                  onClick={handleDeleteConversation}
                  disabled={!selectedProfileId}
                  className="px-3 py-1.5 rounded-md text-sm text-red-300 bg-red-950/40 border border-red-800 hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!selectedProfileId && (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Sélectionne un profil pour discuter.</div>
                )}

                {selectedProfileId && isLoadingMessages && (
                  <div className="text-zinc-500 text-sm">Chargement des messages...</div>
                )}

                {selectedProfileId && !isLoadingMessages && messages.length === 0 && (
                  <div className="text-zinc-500 text-sm">Pas encore de message.</div>
                )}

                {selectedProfileId && messages.map((msg) => {
                  const isMine = Number(msg.sender_profile_id) === Number(currentProfile.id);
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${isMine ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'}`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-100/80' : 'text-zinc-400'}`}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="p-4 border-t border-zinc-700">
                {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
                <div className="flex items-center gap-2">
                  <input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={!selectedProfileId || isSending}
                    placeholder={selectedProfileId ? 'Écris un message...' : 'Sélectionne un profil'}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!selectedProfileId || isSending || !messageInput.trim()}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
