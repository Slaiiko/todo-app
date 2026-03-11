import { Task, Subtask } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Clock, Trash2, Edit2, Briefcase, MessageCircle, ChevronDown, Plus, AlertCircle, Palette, Copy } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { memo, useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import SubtaskList from './SubtaskList';

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
  onAddSubtask?: (taskId: number, title: string) => Promise<void>;
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
  const [selectedColor, setSelectedColor] = useState(task.bg_color || '#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

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

  const handleColorChange = async (color: string) => {
    setSelectedColor(color);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bg_color: color })
      });
    } catch (error) {
      console.error('Failed to update task color:', error);
    }
  };
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !task.is_complete;
  const completedSubtasks = task.subtasks?.filter(s => s.is_complete).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const taskComments = commentsMap[`task-${task.id}`] || [];
  const isDeleting = deletingId === task.id;
  const isExpanded = expandedTaskIds.has(task.id);

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
                {task.time_spent != null && Number(task.time_spent) > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    {Math.floor(Number(task.time_spent) / 60)}h {Number(task.time_spent) % 60}min
                  </span>
                )}
              </div>
            </div>

            {hoveredId === task.id && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-1 relative"
              >
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
          </div>

      <AnimatePresence>
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
