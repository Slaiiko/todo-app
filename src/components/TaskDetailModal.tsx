import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Category, Subtask, Affaire, TaskAssignee } from '../types';
import { X, Calendar as CalendarIcon, Tag, AlignLeft, CheckSquare, Trash2, Plus, Briefcase, Users, ArchiveIcon, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getAPIUrl } from '../utils/api';
import remarkGfm from 'remark-gfm';
import CommentSection from './CommentSection';
import TimePicker from './TimePicker';

interface Props {
  task: Task | null;
  categories: Category[];
  affaires: Affaire[];
  onClose: () => void;
  onSave: (data: { task: Partial<Task>; subtasks: Subtask[]; assignees: TaskAssignee[] }) => void;
  onArchive?: (taskId: number) => void;
}

const avatarEmojis = ['👤', '👨', '👩', '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🔬', '👩‍🔬'];

export default function TaskDetailModal({ task, categories, affaires, onClose, onSave, onArchive }: Props) {
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [title, setTitle] = useState(task?.title || '');
  const [description_md, setDescriptionMd] = useState(task?.description_md || '');
  const [start_date, setStartDate] = useState(task?.start_date ? task.start_date.split('T')[0] : '');
  const [due_date, setDueDate] = useState(task?.due_date ? task.due_date.split('T')[0] : '');
  const [start_time, setStartTime] = useState(task?.start_time || '');
  const [end_time, setEndTime] = useState(task?.end_time || '');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>(task?.priority || 'Medium');
  const [category_id, setCategoryId] = useState<number | ''>(task?.category_id || '');
  const [affaire_id, setAffaireId] = useState<number | ''>(task?.affaire_id || '');
  const [kanban_column, setKanbanColumn] = useState(task?.kanban_column || 'To Do');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [childSubtaskTitles, setChildSubtaskTitles] = useState<Record<number, string>>({});
  const [openChildSubtaskForms, setOpenChildSubtaskForms] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState<number | ''>('');
  const [isMultiDay, setIsMultiDay] = useState(task && task.start_date && task.due_date && task.start_date.split('T')[0] !== task.due_date.split('T')[0]);
  const [recurrence_type, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | ''>((task?.recurrence_type || '') as any);
  const [recurrence_end_date, setRecurrenceEndDate] = useState(task?.recurrence_end_date ? task.recurrence_end_date.split('T')[0] : '');

  useEffect(() => {
    if (task?.id) {
      if (task.assignees && task.assignees.length > 0) {
        setAssignees(task.assignees);
      } else {
        fetchAssignees();
      }
    } else {
      setAssignees([]);
    }
  }, [task?.id, task?.assignees]);

  // Update all fields when task changes (for editing existing tasks)
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescriptionMd(task.description_md || '');
      setStartDate(task.start_date ? task.start_date.split('T')[0] : '');
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setStartTime(task.start_time || '');
      setEndTime(task.end_time || '');
      setPriority(task.priority || 'Medium');
      setCategoryId(task.category_id || '');
      setAffaireId(task.affaire_id || '');
      setKanbanColumn(task.kanban_column || 'To Do');
      setSubtasks(task.subtasks || []);
      setNewSubtask('');
      setChildSubtaskTitles({});
      setOpenChildSubtaskForms({});
      setRecurrenceType((task.recurrence_type || '') as any);
      setRecurrenceEndDate(task.recurrence_end_date ? task.recurrence_end_date.split('T')[0] : '');
      setIsMultiDay(task.start_date && task.due_date && task.start_date.split('T')[0] !== task.due_date.split('T')[0]);
    }
  }, [task?.id]);

  const fetchAssignees = async () => {
    if (!task?.id) return;
    try {
      const res = await fetch(getAPIUrl(`/tasks/${task.id}/assignees`));
      const data = await res.json();
      setAssignees(data);
    } catch (e) {
      console.log('Could not fetch assignees');
    }
  };

  useEffect(() => {
    if (start_time && !start_date) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setDueDate(today);
    }
  }, [start_time, start_date]);

  useEffect(() => {
    if (!start_date || !due_date) return;
    if (due_date > start_date && !isMultiDay) {
      setIsMultiDay(true);
    }
  }, [start_date, due_date, isMultiDay]);

  useEffect(() => {
    if (!start_date || !start_time || !end_time) return;

    const [startHour, startMinute] = start_time.split(':').map(Number);
    const [endHour, endMinute] = end_time.split(':').map(Number);
    const startMinutes = (startHour * 60) + startMinute;
    const endMinutes = (endHour * 60) + endMinute;

    if (endMinutes < startMinutes && due_date === start_date) {
      const nextDay = new Date(`${start_date}T00:00:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = formatLocalDate(nextDay);
      setDueDate(nextDayStr);
      setIsMultiDay(true);
    }
  }, [start_date, due_date, start_time, end_time]);

  useEffect(() => {
    if (!isMultiDay && start_date && due_date !== start_date) {
      setDueDate(start_date);
    }
  }, [isMultiDay, start_date]);

  const addAssignee = async () => {
    if (!newAssigneeName.trim()) return;

    if (task?.id) {
      try {
        const res = await fetch(getAPIUrl('/task-assignees'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: task.id,
            assignee_name: newAssigneeName,
            assignee_avatar: '👤'
          })
        });
        const assignee = await res.json();
        setAssignees([...assignees, assignee]);
        setNewAssigneeName('');
      } catch (e) {
        console.log('Could not add assignee');
      }
    } else {
      const optimisticAssignee: TaskAssignee = {
        id: -Date.now(),
        task_id: 0,
        assignee_name: newAssigneeName,
        assignee_avatar: '👤'
      };
      setAssignees([...assignees, optimisticAssignee]);
      setNewAssigneeName('');
    }
  };

  const deleteAssignee = async (id: number) => {
    if (id > 0) {
      try {
        await fetch(getAPIUrl(`/task-assignees/${id}`), { method: 'DELETE' });
      } catch (e) {
        console.log('Could not delete assignee from API:', e);
      }
    }
    setAssignees(assignees.filter(a => a.id !== id));
  };

  const handleSave = async () => {
    try {
      if (isSaving) {
        console.log('⚠️ Already saving, ignoring duplicate click');
        return;
      }
      
      console.log('🟢 SAVE BUTTON CLICKED');
      setIsSaving(true);

      if (start_date && due_date && due_date < start_date) {
        setIsSaving(false);
        alert('La date de fin ne peut pas être avant la date de début.');
        return;
      }

      let normalizedDueDate = due_date;
      if (start_date && due_date && start_time && end_time && due_date === start_date) {
        const [startHour, startMinute] = start_time.split(':').map(Number);
        const [endHour, endMinute] = end_time.split(':').map(Number);
        const startMinutes = (startHour * 60) + startMinute;
        const endMinutes = (endHour * 60) + endMinute;

        if (endMinutes < startMinutes) {
          const nextDay = new Date(`${start_date}T00:00:00`);
          nextDay.setDate(nextDay.getDate() + 1);
          normalizedDueDate = formatLocalDate(nextDay);
        }
      }
      
      const taskTitle = title.trim() || 'Sans titre';
      
      const saveData = {
        task: {
          id: task?.id,
          title: taskTitle,
          description_md,
          start_date: start_date ? `${start_date}T00:00:00.000Z` : null,
          due_date: normalizedDueDate ? `${normalizedDueDate}T00:00:00.000Z` : null,
          start_time: start_time || null,
          end_time: end_time || null,
          priority,
          category_id: category_id === '' ? null : Number(category_id),
          affaire_id: affaire_id === '' ? null : Number(affaire_id),
          kanban_column,
          recurrence_type: recurrence_type || null,
          recurrence_end_date: recurrence_end_date ? `${recurrence_end_date}T00:00:00.000Z` : null
        },
        subtasks,
        assignees
      };
      
      console.log('📤 Sending to parent handler');
      
      const result = await onSave(saveData);
      console.log('✅ Parent handler completed:', result);
      
      setIsSaving(false);
    } catch (err) {
      console.error('❌ Error in handleSave:', err);
      setIsSaving(false);
      alert('Erreur lors de l\'enregistrement: ' + String(err));
    }
  };

  const getDirectChildSubtasks = (parentSubtaskId: number | null) => {
    return subtasks.filter((subtask) => {
      const rawParentId = (subtask as any).parent_subtask_id ?? (subtask as any).parentSubtaskId ?? null;
      const normalizedParentId = rawParentId == null ? null : Number(rawParentId);
      return normalizedParentId === parentSubtaskId;
    });
  };

  const getDescendantSubtaskIds = (subtaskId: number, sourceSubtasks: Subtask[]): number[] => {
    const directChildren = sourceSubtasks
      .filter((subtask) => {
        const rawParentId = (subtask as any).parent_subtask_id ?? (subtask as any).parentSubtaskId ?? null;
        const normalizedParentId = rawParentId == null ? null : Number(rawParentId);
        return normalizedParentId === subtaskId;
      })
      .map((subtask) => Number(subtask.id));

    return directChildren.flatMap((childId) => [childId, ...getDescendantSubtaskIds(childId, sourceSubtasks)]);
  };

  const toggleChildSubtaskForm = (subtaskId: number) => {
    setOpenChildSubtaskForms((current) => ({
      ...current,
      [subtaskId]: !current[subtaskId]
    }));
  };

  const addSubtask = async (parentSubtaskId: number | null = null) => {
    const titleToCreate = parentSubtaskId === null
      ? newSubtask.trim()
      : (childSubtaskTitles[parentSubtaskId] || '').trim();

    if (!titleToCreate) return;

    if (task?.id) {
      try {
        const res = await fetch(getAPIUrl('/subtasks'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: task.id,
            title: titleToCreate,
            parent_subtask_id: parentSubtaskId,
            parentSubtaskId: parentSubtaskId
          })
        });
        const sub = await res.json();
        if (parentSubtaskId != null && sub?.id != null) {
          fetch(getAPIUrl(`/subtasks/${sub.id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parent_subtask_id: Number(parentSubtaskId),
              parentSubtaskId: Number(parentSubtaskId)
            })
          }).catch((error) => console.warn('Background parent re-attach failed:', error));
        }
        const normalizedParentSubtaskId = parentSubtaskId == null ? null : Number(parentSubtaskId);
        setSubtasks((current) => [
          ...current,
          {
            ...sub,
            parent_subtask_id: normalizedParentSubtaskId,
            parentSubtaskId: normalizedParentSubtaskId
          }
        ]);
      } catch (e) {
        console.log('Could not add subtask to backend');
      }
    } else {
      const optimisticSubtask: Subtask = {
        id: -Date.now() - Math.floor(Math.random() * 1000),
        task_id: 0,
        parent_subtask_id: parentSubtaskId,
        title: titleToCreate,
        is_complete: false
      };
      setSubtasks((current) => [...current, optimisticSubtask]);
    }

    if (parentSubtaskId === null) {
      setNewSubtask('');
      return;
    }

    setChildSubtaskTitles((current) => ({
      ...current,
      [parentSubtaskId]: ''
    }));
    setOpenChildSubtaskForms((current) => ({
      ...current,
      [parentSubtaskId]: false
    }));
  };

  const toggleSubtask = async (id: number, is_complete: boolean) => {
    try {
      await fetch(getAPIUrl(`/subtasks/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete })
      });
    } catch (e) {
      console.log('Could not toggle subtask');
    }
    setSubtasks((current) => current.map(s => s.id === id ? { ...s, is_complete } : s));
  };

  const deleteSubtask = async (id: number) => {
    try {
      if (id > 0) {
        await fetch(getAPIUrl(`/subtasks/${id}`), { method: 'DELETE' });
      }
    } catch (e) {
      console.log('Could not delete subtask');
    }

    setSubtasks((current) => {
      const descendants = getDescendantSubtaskIds(id, current);
      const idsToRemove = new Set([id, ...descendants]);
      return current.filter((subtask) => !idsToRemove.has(subtask.id));
    });
  };

  const renderSubtaskTree = (parentSubtaskId: number | null = null, level = 0): React.ReactNode => {
    const childSubtasks = getDirectChildSubtasks(parentSubtaskId);

    if (childSubtasks.length === 0) {
      return null;
    }

    return (
      <div className={level === 0 ? 'space-y-2' : 'ml-6 mt-2 space-y-2 border-l border-zinc-200 pl-3'}>
        {childSubtasks.map((subtask) => (
          <div key={subtask.id} className="space-y-2">
            <div className="flex items-center gap-2 group bg-zinc-50 p-2 rounded-lg border border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
              <input
                type="checkbox"
                checked={subtask.is_complete}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSubtask(subtask.id, e.target.checked);
                }}
                className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-transform hover:scale-110"
              />
              <span
                onClick={() => toggleSubtask(subtask.id, !subtask.is_complete)}
                className={`flex-1 text-sm cursor-pointer transition-colors duration-300 ${subtask.is_complete ? 'line-through text-zinc-400' : 'text-zinc-700'}`}
              >
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => toggleChildSubtaskForm(subtask.id)}
                className="p-1.5 text-zinc-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-indigo-50"
                title="Ajouter une sous-tâche à cette sous-tâche"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSubtask(subtask.id);
                }}
                className="p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {openChildSubtaskForms[subtask.id] && (
              <div className="ml-6 flex items-center gap-2 bg-white p-2 rounded-lg border border-zinc-200">
                <input
                  type="text"
                  value={childSubtaskTitles[subtask.id] || ''}
                  onChange={(e) => setChildSubtaskTitles((current) => ({
                    ...current,
                    [subtask.id]: e.target.value
                  }))}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask(subtask.id)}
                  placeholder="Ajouter une sous-sous-tâche..."
                  className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => addSubtask(subtask.id)}
                  disabled={!(childSubtaskTitles[subtask.id] || '').trim()}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-zinc-300 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}

            {renderSubtaskTree(subtask.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200/50"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-2xl font-bold text-zinc-900">{task?.id ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-4">
            <motion.button 
              whileTap={{ scale: 0.8 }}
              className={`shrink-0 transition-colors ${task?.id && task?.is_complete ? 'text-indigo-500' : 'text-zinc-300 hover:text-indigo-400'}`}
            >
              <CheckCircle2 className="w-8 h-8" />
            </motion.button>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de la tâche (optionnel)"
              className="flex-1 text-3xl font-bold text-zinc-900 placeholder-zinc-300 border-none focus:outline-none focus:ring-0 bg-transparent"
              autoFocus
            />
          </div>

          {/* SECTION PLANIFICATION */}
          <div className="space-y-2 pb-4 border-b border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Planification
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              {/* Début */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <CalendarIcon className="w-5 h-5 text-zinc-400" />
                <span className="text-xs text-zinc-500 font-medium">Début:</span>
                <input
                  type="date"
                  value={start_date}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-zinc-700 font-medium"
                />
              </div>

              {/* Fin */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <CalendarIcon className="w-5 h-5 text-zinc-400" />
                <span className="text-xs text-zinc-500 font-medium">Fin:</span>
                <input
                  type="date"
                  value={due_date}
                  onChange={e => {
                    const nextDueDate = e.target.value;
                    setDueDate(nextDueDate);
                    if (start_date && nextDueDate > start_date) {
                      setIsMultiDay(true);
                    }
                  }}
                  className={`bg-transparent border-none focus:outline-none text-zinc-700 font-medium ${
                    !isMultiDay ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={!isMultiDay ? 'Auto-synchronisé avec la date de début' : ''}
                />
                <input
                  type="checkbox"
                  checked={isMultiDay}
                  onChange={e => {
                    setIsMultiDay(e.target.checked);
                    if (!e.target.checked && start_date) {
                      setDueDate(start_date);
                    }
                  }}
                  className="w-4 h-4 cursor-pointer ml-auto"
                  title="Multi-jour"
                />
              </div>
            </div>

            {/* Heures */}
            <div className="flex items-center gap-4">
              <TimePicker 
                value={start_time}
                onChange={setStartTime}
                label="Début (heure)"
              />

              <TimePicker 
                value={end_time}
                onChange={setEndTime}
                label="Fin (heure)"
              />
            </div>
          </div>

          {/* SECTION RÉCURRENCE */}
          <div className="space-y-2 pb-4 border-b border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Récurrence
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Type de récurrence */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <select
                  value={recurrence_type}
                  onChange={e => setRecurrenceType(e.target.value as any)}
                  className="bg-transparent border-none focus:outline-none text-zinc-700 font-medium cursor-pointer text-sm flex-1"
                >
                  <option value="">Pas de récurrence</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="yearly">Annuelle</option>
                </select>
              </div>

              {/* Fin de récurrence */}
              {recurrence_type && (
                <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                  <CalendarIcon className="w-5 h-5 text-zinc-400" />
                  <span className="text-xs text-zinc-500 font-medium">Fin:</span>
                  <input
                    type="date"
                    value={recurrence_end_date}
                    onChange={e => setRecurrenceEndDate(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-zinc-700 font-medium"
                    placeholder="Optionnel"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION DÉTAIL */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Détail
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {/* Affaire */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <Briefcase className="w-5 h-5 text-zinc-400" />
                <select
                  value={affaire_id}
                  onChange={e => setAffaireId(e.target.value ? Number(e.target.value) : '')}
                  className="bg-transparent border-none focus:outline-none text-zinc-700 font-medium cursor-pointer text-sm"
                >
                  <option value="">Affaire</option>
                  {affaires.map(a => (
                    <option key={a.id} value={a.id}>{a.number} - {a.name}</option>
                  ))}
                </select>
              </div>

              {/* Personne ajoutée */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <Users className="w-5 h-5 text-zinc-400" />
                <select
                  value={primaryAssigneeId}
                  onChange={e => setPrimaryAssigneeId(e.target.value ? Number(e.target.value) : '')}
                  className="bg-transparent border-none focus:outline-none text-zinc-700 font-medium cursor-pointer text-sm"
                >
                  <option value="">Personne</option>
                  {assignees.length > 0 && assignees.map(a => (
                    <option key={a.id} value={a.id}>{a.assignee_avatar} {a.assignee_name}</option>
                  ))}
                </select>
              </div>

              {/* Catégorie */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <Tag className="w-5 h-5 text-zinc-400" />
                <select
                  value={category_id}
                  onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  className="bg-transparent border-none focus:outline-none text-zinc-700 font-medium cursor-pointer text-sm"
                >
                  <option value="">Catégorie</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* À faire (Kanban) */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <AlertCircle className="w-5 h-5 text-zinc-400" />
                <select
                  value={kanban_column}
                  onChange={e => setKanbanColumn(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-zinc-700 font-medium cursor-pointer text-sm"
                >
                  <option value="To Do">À faire</option>
                  <option value="In Progress">En cours</option>
                  <option value="Done">Terminé</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              {/* Priorité */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                <div className={`w-3 h-3 rounded-full transition-colors duration-200 ${priority === 'High' ? 'bg-red-500' : priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="bg-transparent border-none focus:outline-none text-zinc-700 font-medium cursor-pointer text-sm"
                >
                  <option value="Low">Basse</option>
                  <option value="Medium">Moyenne</option>
                  <option value="High">Haute</option>
                </select>
              </div>
            </div>

            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-2 text-zinc-700 font-semibold">
                <AlignLeft className="w-5 h-5" />
                <h3>Description (Markdown)</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 h-56">
                <textarea
                  value={description_md}
                  onChange={e => setDescriptionMd(e.target.value)}
                  placeholder="Ajoutez des détails, des liens ou des notes..."
                  className="w-full h-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                />
                <div className="w-full h-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg overflow-y-auto prose prose-sm prose-zinc max-w-none">
                  {description_md ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{description_md}</ReactMarkdown>
                  ) : (
                    <p className="text-zinc-400 italic">L'aperçu apparaîtra ici...</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-700 font-semibold">
                <CheckSquare className="w-5 h-5" />
                <h3>Sous-tâches</h3>
              </div>
              
              <div className="space-y-1">
                {renderSubtaskTree()}
                <div className="flex items-center gap-2 mt-2 bg-white p-2 rounded-lg border border-zinc-200">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask(null)}
                    placeholder="Ajouter une sous-tâche..."
                    className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button onClick={() => addSubtask(null)} disabled={!newSubtask.trim()} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-zinc-300 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-700 font-semibold">
                <Users className="w-5 h-5" />
                <h3>Personnes assignées</h3>
              </div>
              
              <div className="space-y-1">
                {assignees.length > 0 ? (
                  assignees.map(assignee => (
                    <motion.div
                      key={assignee.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 group bg-gradient-to-r from-indigo-50 to-transparent p-2 rounded-lg border border-indigo-100 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-semibold">
                        {assignee.assignee_avatar}
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-700">{assignee.assignee_name}</span>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => deleteAssignee(assignee.id)} 
                        className="p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-3 px-3 bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-200 text-zinc-400 text-sm">
                    Aucune personne assignée
                  </div>
                )}
              </div>

              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-2">
                <div className="font-semibold text-sm text-zinc-700">Ajouter une personne</div>
                
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newAssigneeName}
                    onChange={e => setNewAssigneeName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addAssignee()}
                    placeholder="Nom de la personne..."
                    className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                  />
                  <motion.button 
                    onClick={addAssignee} 
                    disabled={!newAssigneeName.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all font-medium flex items-center justify-center gap-1 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {task?.id && (
            <>
              <CommentSection 
                entityType="task" 
                entityId={task.id} 
                currentUser={{ name: 'Vous', avatar: '👤' }}
              />
            </>
          )}
        </div>

        <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-between gap-3">
          {task?.id && (
            <>
              <button
                onClick={() => {
                  onArchive?.(task.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-zinc-600 font-medium hover:bg-zinc-200 rounded-xl transition-colors"
              >
                <ArchiveIcon className="w-4 h-4" />
                Archiver
              </button>
            </>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-6 py-2.5 text-zinc-600 font-medium hover:bg-zinc-200 rounded-xl transition-colors">
              Annuler
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className={`px-8 py-2.5 bg-indigo-600 text-white font-medium rounded-xl transition-all shadow-sm cursor-pointer ${
                isSaving 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-indigo-700'
              }`}
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


