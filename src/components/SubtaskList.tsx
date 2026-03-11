import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Subtask } from '../types';
import { CheckCircle2, Circle, Trash2, MessageCircle, Send, X, ChevronDown, Pencil, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  subtasks: Subtask[];
  taskId: number;
  taskTitle?: string;
  onToggleSubtask: (id: number, isComplete: boolean) => void;
  onDeleteSubtask: (id: number) => void;
  onEditTask: () => void;
  onAddComment?: (subtaskId: number) => void;
  onAddSubtask?: (taskId: number, title: string) => Promise<void>;
  onAddAlert?: (taskId: number, taskTitle: string, subtaskId?: number, subtaskTitle?: string) => void;
  onValidateSubtask?: (taskId: number, taskTitle: string, subtaskId: number, subtaskTitle: string) => void;
  initialShowAddForm?: boolean;
  currentUserName?: string;
}

export default function SubtaskList({ 
  subtasks, 
  taskId, 
  taskTitle,
  onToggleSubtask, 
  onDeleteSubtask, 
  onEditTask,
  onAddComment,
  onAddSubtask,
  onAddAlert,
  onValidateSubtask,
  initialShowAddForm,
  currentUserName
}: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<number, any[]>>({});
  const [showCommentForm, setShowCommentForm] = useState<number | null>(null);
  const [newComments, setNewComments] = useState<Record<number, string>>({});
  const [showAllComments, setShowAllComments] = useState<Record<number, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm || false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Load comments from localStorage
  useEffect(() => {
    const allComments: Record<number, any[]> = {};
    if (subtasks) {
      subtasks.forEach(subtask => {
        const key = `subtask-${subtask.id}-comments`;
        const saved = localStorage.getItem(key);
        if (saved) {
          allComments[subtask.id] = JSON.parse(saved);
        }
      });
    }
    setCommentsMap(allComments);
  }, [subtasks]);

  // Auto-show add form when parent signals it
  useEffect(() => {
    if (initialShowAddForm) {
      setShowAddForm(true);
    }
  }, [initialShowAddForm]);

  const handleAddComment = (subtaskId: number) => {
    const text = newComments[subtaskId]?.trim();
    if (!text) return;

    const key = `subtask-${subtaskId}-comments`;
    const existing = commentsMap[subtaskId] || [];
    const comment = {
      id: Date.now(),
      text: text,
      author: currentUserName || 'Anonyme',
      created_at: new Date().toISOString(),
      updated_at: null,
      entity_type: 'subtask',
      entity_id: subtaskId
    };

    const updated = [...existing, comment];
    setCommentsMap({ ...commentsMap, [subtaskId]: updated });
    localStorage.setItem(key, JSON.stringify(updated));
    setNewComments({ ...newComments, [subtaskId]: '' });
    setShowCommentForm(null);
  };

  const handleEditComment = (subtaskId: number, commentId: number) => {
    const key = `subtask-${subtaskId}-comments`;
    const comments = commentsMap[subtaskId] || [];
    const comment = comments.find(c => c.id === commentId);
    
    if (comment) {
      setEditingCommentId(commentId);
      setEditingCommentText(comment.text);
    }
  };

  const handleSaveEditComment = (subtaskId: number, commentId: number) => {
    if (!editingCommentText.trim()) return;

    const key = `subtask-${subtaskId}-comments`;
    const comments = commentsMap[subtaskId] || [];
    const updated = comments.map(c => 
      c.id === commentId 
        ? { ...c, text: editingCommentText.trim(), updated_at: new Date().toISOString() }
        : c
    );

    setCommentsMap({ ...commentsMap, [subtaskId]: updated });
    localStorage.setItem(key, JSON.stringify(updated));
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = (subtaskId: number, commentId: number) => {
    const key = `subtask-${subtaskId}-comments`;
    const comments = commentsMap[subtaskId] || [];
    const updated = comments.filter(c => c.id !== commentId);

    setCommentsMap({ ...commentsMap, [subtaskId]: updated });
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const handleEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const handleSaveEditSubtask = async (subtaskId: number) => {
    const newTitle = editingSubtaskTitle.trim();
    if (!newTitle) return;

    try {
      const response = await fetch(getAPIUrl(`/subtasks/${subtaskId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });

      if (response.ok) {
        // Wait a small moment before dispatching to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        // Dispatch event to refresh tasks
        window.dispatchEvent(new CustomEvent('taskMoved'));
        setEditingSubtaskId(null);
        setEditingSubtaskTitle('');
      }
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  const handleAddSubtaskSubmit = async () => {
    if (!newSubtaskTitle.trim() || !onAddSubtask) return;
    
    setIsAddingSubtask(true);
    try {
      await onAddSubtask(taskId, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setShowAddForm(false);
    } catch (e) {
      console.error('Error adding subtask:', e);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  // Show nothing if no subtasks AND no form to add one
  if ((!subtasks || subtasks.length === 0) && !showAddForm) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 ml-8 space-y-2"
    >
      {subtasks.map((subtask) => {
        const comments = commentsMap[subtask.id] || [];
        const showForm = showCommentForm === subtask.id;

        return (
        <motion.div
          key={subtask.id}
          layout
          className="border rounded-lg transition-all duration-200 border-zinc-150 overflow-hidden"
        >
          <div 
            className={`p-3 bg-zinc-50 transition-all duration-200 ${
              hoveredId === subtask.id ? 'border-indigo-200 shadow-sm' : ''
            }`}
            onMouseEnter={() => setHoveredId(subtask.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="flex items-start gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.8 }}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Toggling subtask', subtask.id, 'to', !subtask.is_complete);
                  // If we have validation modal handler, open it instead of direct completion
                  if (onValidateSubtask && !subtask.is_complete) {
                    onValidateSubtask(taskId, taskTitle || '', subtask.id, subtask.title);
                  } else {
                    onToggleSubtask(subtask.id, !subtask.is_complete);
                  }
                }}
                className={`shrink-0 mt-1 transition-colors cursor-pointer pointer-events-auto ${
                  subtask.is_complete ? 'text-indigo-500 hover:text-indigo-600' : 'text-zinc-300 hover:text-indigo-400'
                }`}
              >
                <AnimatePresence mode="wait">
                  {subtask.is_complete ? (
                    <CheckCircle2 key="checked" className="w-5 h-5" />
                  ) : (
                    <Circle key="unchecked" className="w-5 h-5" />
                  )}
                </AnimatePresence>
              </motion.button>

              <div className="flex-1 min-w-0">
                {editingSubtaskId === subtask.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      autoFocus
                      value={editingSubtaskTitle}
                      onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          handleSaveEditSubtask(subtask.id);
                        } else if (e.key === 'Escape') {
                          setEditingSubtaskId(null);
                          setEditingSubtaskTitle('');
                        }
                      }}
                      className="flex-1 text-sm px-2 py-1 border border-amber-300 rounded bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEditSubtask(subtask.id);
                      }}
                      className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                    >
                      Enregistrer
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSubtaskId(null);
                        setEditingSubtaskTitle('');
                      }}
                      className="px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 rounded transition-colors"
                    >
                      Annuler
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p 
                      className={`text-sm transition-colors ${
                        subtask.is_complete ? 'line-through text-zinc-400' : 'text-zinc-700'
                      }`}
                    >
                      {subtask.title}
                    </p>
                    {subtask.time_spent ? (() => {
                      const timeSpent = typeof subtask.time_spent === 'string' ? parseInt(subtask.time_spent, 10) : subtask.time_spent;
                      if (!isNaN(timeSpent) && timeSpent > 0) {
                        return (
                          <div className="flex items-center gap-1 text-xs font-medium text-purple-600">
                            <Clock className="w-3 h-3" />
                            {Math.floor(timeSpent / 60)}h {timeSpent % 60}min
                          </div>
                        );
                      }
                      return null;
                    })() : null}
                  </div>
                )}
                {subtask.assignee_name && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {subtask.assignee_avatar} {subtask.assignee_name}
                  </p>
                )}
              </div>

              <div 
                className={`flex items-center gap-1.5 shrink-0 transition-opacity pointer-events-auto ${
                  hoveredId === subtask.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Comment form opened for subtask', subtask.id);
                      setShowCommentForm(subtask.id);
                    }}
                    className={`p-1.5 rounded transition-colors pointer-events-auto flex items-center gap-1 ${
                      comments.length > 0 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-zinc-400 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title="Ajouter un commentaire"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {comments.length > 0 && <span className="text-[10px] font-bold">{comments.length}</span>}
                  </motion.button>
                  
                  {comments.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setExpandedComments({ ...expandedComments, [subtask.id]: !expandedComments[subtask.id] })}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title={expandedComments[subtask.id] ? "Masquer commentaires" : "Afficher commentaires"}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        expandedComments[subtask.id] ? 'rotate-180' : ''
                      }`} />
                    </motion.button>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEditSubtask(subtask);
                  }}
                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors pointer-events-auto"
                  title="Éditer le titre"
                >
                  <Pencil className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddAlert?.(taskId, taskTitle || '', subtask.id, subtask.title);
                  }}
                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors pointer-events-auto"
                  title="Signaler une alerte"
                >
                  <AlertCircle className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Deleting subtask', subtask.id);
                    onDeleteSubtask(subtask.id);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors pointer-events-auto"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Comments display */}
            {comments.length > 0 && !showForm && expandedComments[subtask.id] && (
              <div className="mt-3 pt-3 border-t border-zinc-200 space-y-2">
                {(showAllComments[subtask.id] ? comments : comments.slice(0, 3)).map((comment, idx) => (
                  editingCommentId === comment.id ? (
                    <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <textarea
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-amber-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 h-16"
                      />
                      <div className="flex gap-2 justify-end">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditingCommentId(null)}
                          className="px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200 rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSaveEditComment(subtask.id, comment.id)}
                          className="px-2 py-1.5 text-xs bg-amber-600 text-white hover:bg-amber-700 rounded transition-colors flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Enregistrer
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      key={idx} 
                      className={`text-xs p-2 rounded border transition-all group ${
                        comment.updated_at 
                          ? 'bg-gray-50 text-gray-700 border-gray-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-1">
                            <span>💬</span> {comment.author}
                            {comment.updated_at && <span className="text-[10px] text-gray-500">(modifié)</span>}
                          </div>
                          <div className="text-[10px] opacity-70 mt-0.5">
                            {formatDistanceToNow(new Date(comment.created_at), { locale: fr, addSuffix: true })}
                            {comment.updated_at && ` • Modifié ${formatDistanceToNow(new Date(comment.updated_at), { locale: fr, addSuffix: true })}`}
                          </div>
                          <p className="mt-1">{comment.text}</p>
                        </div>
                        <div className="flex gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditComment(subtask.id, comment.id)}
                            className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                            title="Éditer"
                          >
                            <Pencil className="w-3 h-3" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteComment(subtask.id, comment.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
                {comments.length > 3 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAllComments({ ...showAllComments, [subtask.id]: !showAllComments[subtask.id] })}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 hover:underline"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${
                      showAllComments[subtask.id] ? 'rotate-180' : ''
                    }`} />
                    {showAllComments[subtask.id] ? 'Masquer' : `Voir ${comments.length - 3} commentaire(s) de plus`}
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Comment form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 py-2 bg-blue-50 border-t border-zinc-200 space-y-2"
              >
                <textarea
                  value={newComments[subtask.id] || ''}
                  onChange={(e) => setNewComments({ ...newComments, [subtask.id]: e.target.value })}
                  placeholder="Ajouter un commentaire..."
                  className="w-full text-xs p-2 bg-white border border-zinc-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 h-16"
                />
                <div className="flex gap-2 justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCommentForm(null)}
                    className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-300 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddComment(subtask.id)}
                    disabled={!newComments[subtask.id]?.trim()}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded transition-colors flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Envoyer
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
      })}

      {/* Add subtask form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            key="add-subtask-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-green-50 border rounded-lg border-green-200"
          >
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddSubtaskSubmit();
                  } else if (e.key === 'Escape') {
                    setShowAddForm(false);
                    setNewSubtaskTitle('');
                  }
                }}
                placeholder="Nom de la sous-tâche..."
                disabled={isAddingSubtask}
                className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleAddSubtaskSubmit}
                disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isAddingSubtask ? 'En cours...' : 'Ajouter'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSubtaskTitle('');
                }}
                disabled={isAddingSubtask}
                className="px-3 py-2 text-zinc-600 hover:bg-zinc-200 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}


