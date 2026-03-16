import { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Pencil, Check, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAPIUrl } from '../utils/api';

interface Comment {
  id?: number;
  text: string;
  author?: string;
  created_at?: string;
  updated_at?: string | null;
  entity_type: 'task' | 'subtask';
  entity_id: number;
}

interface Props {
  entityType: 'task' | 'subtask';
  entityId: number;
  currentUser: { name: string; avatar: string };
}

export default function CommentSection({ entityType, entityId, currentUser }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const storageKey = `${entityType}-${entityId}-comments`;

  // Load comments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setComments(JSON.parse(saved));
    }
  }, [entityType, entityId, storageKey]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      // Save to localStorage first for instant feedback
      const comment: Comment = {
        id: Date.now(),
        text: newComment,
        author: currentUser.name,
        created_at: new Date().toISOString(),
        updated_at: null,
        entity_type: entityType,
        entity_id: entityId
      };

      const updated = [...comments, comment];
      setComments(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // Try to persist to backend
      try {
        await fetch(getAPIUrl('/comments'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId,
            text: newComment
          })
        });
      } catch (e) {
        console.log('Backend comment save skipped (developing offline)');
      }

      setNewComment('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = (id: number | undefined) => {
    if (!id) return;
    const updated = comments.filter(c => c.id !== id);
    setComments(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleStartEdit = (comment: Comment) => {
    if (!comment.id) return;
    setEditingId(comment.id);
    setEditingText(comment.text);
  };

  const handleSaveEdit = (id: number) => {
    if (!editingText.trim()) return;
    const updated = comments.map(c =>
      c.id === id ? { ...c, text: editingText.trim(), updated_at: new Date().toISOString() } : c
    );
    setComments(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setEditingId(null);
    setEditingText('');
  };

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-zinc-700"
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>Commentaires</span>
          {comments.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {comments.length}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-zinc-200">
          {/* Comments list */}
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-2">Aucun commentaire.</p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="group flex gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <div className="text-lg shrink-0">{currentUser.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-zinc-700">{comment.author || currentUser.name}</span>
                    <div className="flex items-center gap-1">
                      {editingId === comment.id ? (
                        <button
                          onClick={() => handleSaveEdit(comment.id!)}
                          className="p-1 text-indigo-500 hover:text-indigo-700 transition-colors"
                          title="Enregistrer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(comment)}
                          className="p-1 text-zinc-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Modifier"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {editingId === comment.id ? (
                    <input
                      type="text"
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(comment.id!); if (e.key === 'Escape') { setEditingId(null); setEditingText(''); } }}
                      autoFocus
                      className="w-full mt-1 bg-white border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-sm text-zinc-600 mt-1 break-words">{comment.text}</p>
                  )}
                  {comment.created_at && (
                    <span className="text-xs text-zinc-400 mt-1 block">
                      {format(parseISO(comment.created_at), 'd MMM HH:mm', { locale: fr })}
                      {comment.updated_at && ' (modifié)'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add comment */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Ajouter un commentaire..."
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || isLoading}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-zinc-300 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


