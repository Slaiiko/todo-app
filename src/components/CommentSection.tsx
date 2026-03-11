import { useState, useEffect } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAPIUrl } from '../utils/api';

interface Comment {
  id?: number;
  text: string;
  created_at?: string;
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
        created_at: new Date().toISOString(),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-700 font-semibold">
        <MessageCircle className="w-5 h-5" />
        <h3>Commentaires</h3>
      </div>

      {/* Comments list */}
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
            <div className="text-lg shrink-0">{currentUser.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-zinc-700">{currentUser.name}</span>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors opacity-0 hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-sm text-zinc-600 mt-1 break-words">{comment.text}</p>
              {comment.created_at && (
                <span className="text-xs text-zinc-400 mt-1">
                  {format(parseISO(comment.created_at), 'd MMM HH:mm', { locale: fr })}
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
  );
}


