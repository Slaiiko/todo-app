import { Task, Subtask } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Clock, Trash2, Edit2, Briefcase, MessageCircle, ChevronDown, Plus, AlertCircle, Palette, Copy, ImagePlus, X, Pencil, Check } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { memo, useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import SubtaskList from './SubtaskList';
import { getAPIUrl } from '../utils/api';
import EntityDocuments from './EntityDocuments';
import TaskImageThumb from './TaskImageThumb';

interface TaskRowProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task, isComplete: boolean) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (id: number) => void;
  hoveredId: number | null;
  setHoveredId: (id: number | null) => void;
  deletingId: number | null;
  expandedTaskIds: Set<number>;
  toggleExpanded: (taskId: number) => void;
  commentsMap: Record<string, any[]>;
  handleToggleSubtask: (subtaskId: number, isComplete: boolean) => Promise<void>;
  handleDeleteSubtask: (subtaskId: number) => Promise<void>;
  onAddSubtask?: (taskId: number, title: string, parentSubtaskId?: number) => Promise<void>;
  onAddAlert?: (taskId: number, taskTitle: string, subtaskId?: number, subtaskTitle?: string) => void;
  onValidateTask?: (taskId: number, taskTitle: string, subtaskId?: number, subtaskTitle?: string) => void;
  currentUserName?: string;
}

const TaskRowComponent = ({
  task,
  index,
  onEdit,
  onToggleComplete,
  onDelete,
  onDuplicate,
  hoveredId,
  setHoveredId,
  deletingId,
  expandedTaskIds,
  toggleExpanded,
  commentsMap,
  handleToggleSubtask,
  handleDeleteSubtask,
  onAddSubtask,
  onAddAlert,
  onValidateTask,
  currentUserName,
}: TaskRowProps) => {
  const [showAddFormOnExpand, setShowAddFormOnExpand] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [taskCommentsLocal, setTaskCommentsLocal] = useState<any[]>([]);
  const [newTaskComment, setNewTaskComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [selectedColor, setSelectedColor] = useState(task.bg_color || '#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hasThumbnail, setHasThumbnail] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const taskImageInputRef = useRef<HTMLInputElement>(null);

  const appointmentId = Number((task as any)._appointmentId || 0);
  const isAppointmentEntry = Boolean((task as any)._isAppointment && appointmentId > 0);
  const commentStorageKey = isAppointmentEntry
    ? `appointment-${appointmentId}-comments`
    : `task-${task.id}-comments`;

  const loadTaskComments = () => {
    try {
      const saved = localStorage.getItem(commentStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTaskCommentsLocal(Array.isArray(parsed) ? parsed : []);
      } else {
        setTaskCommentsLocal([]);
      }
    } catch {
      setTaskCommentsLocal([]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showColorPicker]);

  useEffect(() => {
    loadTaskComments();
  }, [commentStorageKey]);

  const handleColorChange = async (color: string) => {
    setSelectedColor(color);
    try {
      await fetch(getAPIUrl(`/tasks/${task.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bg_color: color })
      });
    } catch (error) {
      console.error('Failed to update task color:', error);
    }
  };

  const handleTaskImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Image read failed'));
        reader.readAsDataURL(file);
      });

      const response = await fetch(getAPIUrl(`/tasks/${task.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: dataUrl })
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('taskMoved'));
      }
    } catch (error) {
      console.error('Failed to update task image:', error);
      alert('Erreur lors de l\'ajout de la photo.');
    } finally {
      if (taskImageInputRef.current) {
        taskImageInputRef.current.value = '';
      }
    }
  };

  const handleDeleteTaskThumbnail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (task.image_data) {
        const response = await fetch(getAPIUrl(`/tasks/${task.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_data: null })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        window.dispatchEvent(new CustomEvent('taskMoved'));
        return;
      }

      const docsResponse = await fetch(getAPIUrl(`/documents/task/${task.id}`));
      if (!docsResponse.ok) {
        throw new Error(`HTTP ${docsResponse.status}`);
      }

      const docs = await docsResponse.json();
      const imageDoc = Array.isArray(docs)
        ? docs.find((doc: any) => {
            const mimeType = String(doc?.mime_type || '').toLowerCase();
            const dataUrl = String(doc?.data_url || '');
            return mimeType.startsWith('image/') || dataUrl.startsWith('data:image/');
          })
        : null;

      if (!imageDoc?.id) {
        return;
      }

      const deleteResponse = await fetch(getAPIUrl(`/documents/${imageDoc.id}`), {
        method: 'DELETE'
      });

      if (!deleteResponse.ok) {
        throw new Error(`HTTP ${deleteResponse.status}`);
      }

      window.dispatchEvent(new CustomEvent('taskMoved'));
    } catch (error) {
      console.error('Failed to delete task thumbnail:', error);
      alert('Erreur lors de la suppression de la vignette.');
    }
  };

  const handleResetTaskFocusTime = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const nextValidation = Number(task.validation_time_spent || 0) || 0;
      const response = await fetch(getAPIUrl(`/tasks/${task.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus_time_spent: 0,
          time_spent: nextValidation
        })
      });
      if (response.ok) {
        window.dispatchEvent(new CustomEvent('taskMoved'));
      }
    } catch (error) {
      console.error('Failed to reset task focus time:', error);
    }
  };

  const handleResetTaskValidationTime = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const nextFocus = Number(task.focus_time_spent || 0) || 0;
      const response = await fetch(getAPIUrl(`/tasks/${task.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validation_time_spent: 0,
          time_spent: nextFocus
        })
      });
      if (response.ok) {
        window.dispatchEvent(new CustomEvent('taskMoved'));
      }
    } catch (error) {
      console.error('Failed to reset task validation time:', error);
    }
  };
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !task.is_complete;
  const completedSubtasks = task.subtasks?.filter(s => s.is_complete).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const taskCommentsCandidate = taskCommentsLocal.length > 0
    ? taskCommentsLocal
    : (commentsMap[commentStorageKey] || []);
  const taskComments = Array.isArray(taskCommentsCandidate) ? taskCommentsCandidate : [];
  const isDeleting = deletingId === task.id;
  const isExpanded = expandedTaskIds.has(task.id);
  const directTaskTime = Number(task.time_spent || 0) || 0;
  const taskFocusTime = Number(task.focus_time_spent || 0) || 0;
  const taskValidationTime = Number(task.validation_time_spent || 0) || 0;
  const knownTaskTime = taskFocusTime + taskValidationTime;
  const legacyTaskTime = directTaskTime > knownTaskTime ? directTaskTime - knownTaskTime : 0;
  const subtasksList = Array.isArray(task.subtasks) ? task.subtasks : [];
  const subtasksTotalTime = subtasksList.length > 0
    ? subtasksList.reduce((total, subtask) => total + (Number(subtask.time_spent || 0) || 0), 0)
    : (Number(task.subtasks_time_spent || 0) || 0);
  const subtasksFocusTime = subtasksList.reduce((total, subtask) => total + (Number((subtask as any).focus_time_spent || 0) || 0), 0);
  const subtasksValidationTime = subtasksList.reduce((total, subtask) => total + (Number((subtask as any).validation_time_spent || 0) || 0), 0);
  const subtasksKnownTime = subtasksFocusTime + subtasksValidationTime;
  const subtasksLegacyTime = subtasksTotalTime > subtasksKnownTime ? subtasksTotalTime - subtasksKnownTime : 0;

  const handleAddTaskComment = () => {
    const text = newTaskComment.trim();
    if (!text) return;

    const comment = {
      id: Date.now(),
      text,
      author: currentUserName || 'Anonyme',
      created_at: new Date().toISOString(),
      entity_type: isAppointmentEntry ? 'appointment' : 'task',
      entity_id: isAppointmentEntry ? appointmentId : task.id,
    };

    const updated = [...taskComments, comment];
    setTaskCommentsLocal(updated);
    localStorage.setItem(commentStorageKey, JSON.stringify(updated));
    setNewTaskComment('');
  };

  const handleDeleteTaskComment = (commentId: number) => {
    const updated = taskComments.filter((comment) => Number((comment as any)?.id) !== Number(commentId));
    setTaskCommentsLocal(updated);
    localStorage.setItem(commentStorageKey, JSON.stringify(updated));
  };

  const handleStartEditComment = (comment: any) => {
    setEditingCommentId(Number(comment?.id));
    setEditingCommentText(String(comment?.text || ''));
  };

  const handleSaveEditComment = (commentId: number) => {
    if (!editingCommentText.trim()) return;
    const updated = taskComments.map((comment) =>
      Number((comment as any)?.id) === commentId
        ? { ...comment, text: editingCommentText.trim(), updated_at: new Date().toISOString() }
        : comment
    );
    setTaskCommentsLocal(updated);
    localStorage.setItem(commentStorageKey, JSON.stringify(updated));
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  // Reset showAddFormOnExpand after 100ms to allow SubtaskList to capture it
  useEffect(() => {
    if (showAddFormOnExpand) {
      const timer = setTimeout(() => {
        setShowAddFormOnExpand(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddFormOnExpand]);

  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.15 }}
      style={{ backgroundColor: selectedColor }}
      className={`group relative px-4 py-3 rounded-xl transition-all hover:shadow-md ${
        isOverdue 
          ? 'border-2 border-red-500 hover:border-red-600 shadow-md shadow-red-200/50' 
          : 'border border-zinc-200 hover:border-zinc-300'
      }`}
      onMouseEnter={() => setHoveredId(task.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      <div className="flex items-start gap-3">

            {/* Subtask toggle button */}
            {totalSubtasks > 0 && (
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => toggleExpanded(task.id)}
                className={`shrink-0 text-zinc-400 hover:text-indigo-600 relative z-10 transition-transform duration-200 ${isExpanded ? 'text-indigo-600' : ''}`}
              >
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </motion.button>
            )}

            <motion.button 
              whileTap={{ scale: 0.8 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // If we have validation modal handler, open it instead of direct completion
                if (onValidateTask) {
                  onValidateTask(task.id, task.title);
                } else {
                  onToggleComplete(task, !task.is_complete);
                }
              }}
              className={`shrink-0 transition-colors relative z-10 ${task.is_complete ? 'text-indigo-500' : 'text-zinc-300 hover:text-indigo-400'}`}
            >
              {task.is_complete ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <Circle className="w-7 h-7" />
              )}
            </motion.button>
            
            <div className="flex-1 min-w-0 cursor-pointer relative z-10" onClick={() => onEdit(task)}>
              <div className="flex items-center gap-2">
                <h3 className={`font-medium text-lg truncate transition-colors duration-300 ${task.is_complete ? 'line-through text-zinc-500' : 'text-zinc-900'}`}>
                  {task.title || 'Sans titre'}
                </h3>
                {(task as any)._occurrenceCount && (task as any)._occurrenceCount > 1 && (
                  <span className="inline-flex items-center justify-center text-xs font-bold text-white bg-orange-500 rounded-full px-2 py-1 whitespace-nowrap">
                    {(task as any)._occurrenceCount} fois
                  </span>
                )}
              </div>

              {/* Progress bar for subtasks */}
              {totalSubtasks > 0 && (
                <div className="mt-2 w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400" style={{ width: `${progressPercent}%` }} />
                </div>
              )}

              <div className="flex items-center flex-wrap gap-2 mt-2">
                {isOverdue && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    En retard
                  </span>
                )}
                {task.category_name && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${task.category_color || 'bg-zinc-100 text-zinc-700'}`}>
                    {task.category_name}
                  </span>
                )}
                {task.affaire_name && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-1 rounded-lg">
                    <Briefcase className="w-3 h-3" />
                    {task.affaire_number}
                  </span>
                )}
                {taskComments.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-1 rounded-lg">
                    <MessageCircle className="w-3 h-3" />
                    {taskComments.length}
                  </span>
                )}
                {task.created_at && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg" title={`Créé le ${format(parseISO(task.created_at), 'PPpp', { locale: fr })}`}>
                    <Clock className="w-3 h-3" />
                    Créé {format(parseISO(task.created_at), 'PPp', { locale: fr })}
                  </span>
                )}
                {taskFocusTime > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    Focus · {Math.floor(taskFocusTime / 60)}h {taskFocusTime % 60}min
                    <button
                      type="button"
                      onClick={handleResetTaskFocusTime}
                      className="ml-1 text-purple-500 hover:text-red-600 transition-colors"
                      title="Remettre le temps Focus à 0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {taskValidationTime > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    Validation · {Math.floor(taskValidationTime / 60)}h {taskValidationTime % 60}min
                    <button
                      type="button"
                      onClick={handleResetTaskValidationTime}
                      className="ml-1 text-indigo-500 hover:text-red-600 transition-colors"
                      title="Remettre le temps Validation à 0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {legacyTaskTime > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 bg-zinc-100 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    Temps · {Math.floor(legacyTaskTime / 60)}h {legacyTaskTime % 60}min
                  </span>
                )}
                {subtasksFocusTime > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    Sous-tâches Focus · {Math.floor(subtasksFocusTime / 60)}h {subtasksFocusTime % 60}min
                  </span>
                )}
                {subtasksValidationTime > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    Sous-tâches Validation · {Math.floor(subtasksValidationTime / 60)}h {subtasksValidationTime % 60}min
                  </span>
                )}
                {subtasksLegacyTime > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-fuchsia-700 bg-fuchsia-50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    Sous-tâches Temps · {Math.floor(subtasksLegacyTime / 60)}h {subtasksLegacyTime % 60}min
                  </span>
                )}
              </div>
              <EntityDocuments entityType="task" entityId={task.id} />
            </div>

            {hoveredId === task.id && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-1 relative"
              >
                <input
                  ref={taskImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleTaskImageSelected}
                />
                <div className="relative" ref={pickerRef}>
                  <button
                    type="button"
                    className="p-2 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all pointer-events-auto cursor-pointer hover:scale-110 active:scale-90"
                    title="Changer la couleur"
                    onClick={() => {
                      setShowColorPicker(!showColorPicker);
                    }}
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                  {showColorPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute left-0 bg-white rounded-lg shadow-lg p-3 z-50 mt-2 border border-gray-200"
                      style={{ 
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      <HexColorPicker 
                        color={selectedColor} 
                        onChange={handleColorChange}
                      />
                      <div 
                        className="mt-3 h-8 rounded border-2 border-gray-300 cursor-pointer"
                        style={{ backgroundColor: selectedColor }}
                        title={selectedColor}
                      />
                    </motion.div>
                  )}
                </div>

                <motion.button 
                  type="button"
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    taskImageInputRef.current?.click();
                  }} 
                  className="p-2 text-zinc-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all pointer-events-auto cursor-pointer"
                  title="Ajouter une photo"
                >
                  <ImagePlus className="w-4 h-4" />
                </motion.button>
                <motion.button 
                  type="button"
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAddFormOnExpand(true);
                    if (!isExpanded) {
                      toggleExpanded(task.id);
                    }
                  }} 
                  className="p-2 text-zinc-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all pointer-events-auto cursor-pointer"
                  title="Ajouter une sous-tâche"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
                <motion.button 
                  type="button"
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(task);
                  }} 
                  className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all pointer-events-auto cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </motion.button>
                <motion.button 
                  type="button"
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddAlert?.(task.id, task.title);
                  }} 
                  className="p-2 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all pointer-events-auto cursor-pointer"
                  title="Signaler une alerte"
                >
                  <AlertCircle className="w-4 h-4" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCommentsPanel((current) => !current);
                  }}
                  className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all pointer-events-auto cursor-pointer"
                  title={showCommentsPanel ? 'Masquer commentaires' : 'Afficher commentaires'}
                >
                  <MessageCircle className="w-4 h-4" />
                </motion.button>
                {onDuplicate && (
                  <motion.button 
                    type="button"
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.9 }} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDuplicate(task.id);
                    }} 
                    className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all pointer-events-auto cursor-pointer"
                    title="Dupliquer"
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                )}
                <motion.button 
                  type="button"
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(task.id);
                  }} 
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all pointer-events-auto cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}

            <div className="relative shrink-0">
              <TaskImageThumb
                taskId={task.id}
                imageData={task.image_data}
                alt={task.title || 'Photo de la tâche'}
                className="w-20 h-20 rounded-xl object-cover border border-zinc-200 shadow-sm"
                onHasImageChange={setHasThumbnail}
              />
              {hoveredId === task.id && hasThumbnail && (
                <button
                  type="button"
                  onClick={handleDeleteTaskThumbnail}
                  className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-zinc-200 text-zinc-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition-colors"
                  title="Supprimer la vignette"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

      <AnimatePresence>
        {showCommentsPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-zinc-100 bg-zinc-50/50 p-4 mt-3 -mx-4 overflow-hidden"
          >
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-zinc-700 text-sm font-semibold">
                <MessageCircle className="w-4 h-4" />
                {isAppointmentEntry ? 'Commentaires du rendez-vous' : 'Commentaires de la tâche'}
              </div>

              {taskComments.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucun commentaire.</p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {taskComments.map((comment, index) => {
                    const cId = Number((comment as any)?.id ?? 0);
                    const isEditing = editingCommentId === cId;
                    return (
                      <div key={cId || `${commentStorageKey}-${index}`} className="group/comment bg-white border border-zinc-200 rounded-lg p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-zinc-500 mb-1">{String((comment as any)?.author || 'Anonyme')}</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleSaveEditComment(cId); }
                                  if (e.key === 'Escape') { setEditingCommentId(null); setEditingCommentText(''); }
                                }}
                                autoFocus
                                className="w-full bg-zinc-50 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            ) : (
                              <p className="text-sm text-zinc-700 break-words">{String((comment as any)?.text || '')}</p>
                            )}
                            {(comment as any)?.updated_at && !isEditing && (
                              <p className="text-[10px] text-zinc-400 mt-0.5">modifié</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <button type="button" onClick={() => handleSaveEditComment(cId)} className="p-1 text-indigo-500 hover:text-indigo-700 rounded" title="Enregistrer">
                                <Check className="w-3 h-3" />
                              </button>
                            ) : (
                              <button type="button" onClick={() => handleStartEditComment(comment)} className="p-1 text-zinc-300 hover:text-indigo-500 rounded opacity-0 group-hover/comment:opacity-100 transition-opacity" title="Modifier">
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteTaskComment(cId)}
                              className="p-1 text-zinc-300 hover:text-red-600 rounded opacity-0 group-hover/comment:opacity-100 transition-opacity"
                              title="Supprimer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTaskComment}
                  onChange={(e) => setNewTaskComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTaskComment();
                    }
                  }}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTaskComment}
                  disabled={!newTaskComment.trim()}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-zinc-100 bg-zinc-50/50 p-4 mt-3 -mx-4 -mb-3 overflow-hidden"
          >
            <SubtaskList
              subtasks={task.subtasks || []}
              taskId={task.id}
              taskTitle={task.title}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onEditTask={() => onEdit(task)}
              onAddSubtask={onAddSubtask}
              onAddAlert={onAddAlert}
              onValidateSubtask={onValidateTask}
              initialShowAddForm={showAddFormOnExpand}
              currentUserName={currentUserName}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};

export default memo(TaskRowComponent);


