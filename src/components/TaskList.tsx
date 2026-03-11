import { Task, Category, Affaire } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Clock, MoreVertical, Trash2, Edit2, Briefcase, MessageCircle, ChevronDown, Search, X } from 'lucide-react';
import { format, isPast, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAPIUrl } from '../utils/api';
import { useState, useEffect, useMemo } from 'react';
import SubtaskList from './SubtaskList';
import TaskRow from './TaskRow';

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task, isComplete: boolean) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (id: number) => void;
  onAddAlert?: (taskId: number, taskTitle: string, subtaskId?: number, subtaskTitle?: string) => void;
  onValidateTask?: (taskId: number, taskTitle: string, subtaskId?: number, subtaskTitle?: string) => void;
  selectedCategoryFilter?: number | null;
  selectedAffaireFilter?: number | null;
  categories?: Category[];
  affaires?: Affaire[];
  currentUserName?: string;
}

export default function TaskList({ tasks, onEdit, onToggleComplete, onDelete, onDuplicate, onAddAlert, onValidateTask, selectedCategoryFilter, selectedAffaireFilter, categories = [], affaires = [], currentUserName }: Props) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  
  // Advanced filters
  const [searchText, setSearchText] = useState('');
  const [filterAffaire, setFilterAffaire] = useState<number | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sync category filter when prop changes
  useEffect(() => {
    if (selectedCategoryFilter !== undefined) {
      setFilter(selectedCategoryFilter);
    }
  }, [selectedCategoryFilter]);

  // Sync affaire filter when prop changes
  useEffect(() => {
    if (selectedAffaireFilter !== undefined) {
      setFilterAffaire(selectedAffaireFilter);
    }
  }, [selectedAffaireFilter]);

  // Apply all filters - memoized to prevent unnecessary re-renders
  const filteredTasks = useMemo(() => tasks.filter(t => {
    // Category filter
    if (filter && t.category_id !== filter) return false;
    
    // Search filter
    if (searchText && !t.title.toLowerCase().includes(searchText.toLowerCase()) && !t.description_md?.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    
    // Affaire filter
    if (filterAffaire && t.affaire_id !== filterAffaire) return false;
    
    // Date range filter
    if (filterDateFrom || filterDateTo) {
      if (!t.due_date) return false;
      const taskDate = parseISO(t.due_date);
      if (filterDateFrom && filterDateTo) {
        const from = parseISO(filterDateFrom);
        const to = parseISO(filterDateTo);
        if (!isWithinInterval(taskDate, { start: from, end: to })) return false;
      } else if (filterDateFrom) {
        const from = parseISO(filterDateFrom);
        if (taskDate < from) return false;
      } else if (filterDateTo) {
        const to = parseISO(filterDateTo);
        if (taskDate > to) return false;
      }
    }
    
    return true;
  }), [tasks, filter, searchText, filterAffaire, filterDateFrom, filterDateTo]);

  // Load comments from localStorage
  useEffect(() => {
    const allComments: Record<string, any[]> = {};
    filteredTasks.forEach(task => {
      const key = `task-${task.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        allComments[key] = JSON.parse(saved);
      }
    });
    setCommentsMap(allComments);
  }, [filteredTasks]);

  const priorityColors = {
    High: 'text-red-500 bg-red-50',
    Medium: 'text-amber-500 bg-amber-50',
    Low: 'text-emerald-500 bg-emerald-50'
  };

  const priorityLabels = {
    High: 'Haute',
    Medium: 'Moyenne',
    Low: 'Basse'
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      onDelete(id);
      setDeletingId(null);
    }, 400); // Wait for shake animation
  };

  const toggleExpanded = (taskId: number) => {
    const newExpanded = new Set(expandedTaskIds);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTaskIds(newExpanded);
  };

  const urgentTasks = useMemo(() => filteredTasks.filter(t => !t.is_complete && t.kanban_column === 'Urgent' && !(t as any)._upcomingAppointment).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)), [filteredTasks]);
  const todoTasks = useMemo(() => filteredTasks.filter(t => !t.is_complete && t.kanban_column === 'To Do' && !(t as any)._upcomingAppointment).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)), [filteredTasks]);
  const inProgressTasks = useMemo(() => filteredTasks.filter(t => !t.is_complete && t.kanban_column === 'In Progress' && !(t as any)._upcomingAppointment).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)), [filteredTasks]);
  const upcomingAppointments = useMemo(() => filteredTasks.filter(t => !t.is_complete && (t as any)._upcomingAppointment).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter(t => t.is_complete), [filteredTasks]);

  const handleToggleSubtask = async (subtaskId: number, isComplete: boolean) => {
    try {
      console.log('Toggling subtask', subtaskId, 'to', isComplete);
      const response = await fetch(getAPIUrl(`/subtasks/${subtaskId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: isComplete })
      });
      if (response.ok) {
        console.log('Subtask toggled successfully');
        // Wait a small moment before dispatching to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        // Dispatch taskMoved event to trigger parent refresh
        window.dispatchEvent(new CustomEvent('taskMoved'));
      } else {
        console.error('Failed to toggle subtask, response not ok');
      }
    } catch (e) {
      console.error('Failed to toggle subtask:', e);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      console.log('Deleting subtask', subtaskId);
      const response = await fetch(getAPIUrl(`/subtasks/${subtaskId}`), { method: 'DELETE' });
      if (response.ok) {
        console.log('Subtask deleted successfully');
        // Wait a small moment before dispatching to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        // Dispatch taskMoved event to trigger parent refresh
        window.dispatchEvent(new CustomEvent('taskMoved'));
      } else {
        console.error('Failed to delete subtask, response not ok');
      }
    } catch (e) {
      console.error('Failed to delete subtask:', e);
    }
  };

  const handleAddSubtask = async (taskId: number, title: string) => {
    if (!title || !title.trim()) {
      console.log('No title provided');
      return;
    }

    try {
      console.log('Adding subtask to task', taskId, 'with title:', title);
      const response = await fetch(getAPIUrl('/subtasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, title: title.trim() })
      });
      if (response.ok) {
        console.log('Subtask added successfully');
        // Wait a small moment before dispatching to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        window.dispatchEvent(new CustomEvent('taskMoved'));
      } else {
        console.error('Failed to add subtask, response not ok');
        throw new Error('Failed to add subtask');
      }
    } catch (e) {
      console.error('Failed to add subtask:', e);
      throw e;
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    // Drag and drop functionality removed
  };


  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Filter Bar */}
      <motion.div className="space-y-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors font-medium text-sm"
        >
          <Search className="w-4 h-4" />
          Filtres avancés
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4"
            >
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Rechercher</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Titre ou description..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchText && (
                    <button
                      onClick={() => setSearchText('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category and Affaire Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Catégorie</label>
                  <select
                    value={filter || ''}
                    onChange={(e) => setFilter(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Affaire</label>
                  <select
                    value={filterAffaire || ''}
                    onChange={(e) => setFilterAffaire(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Toutes les affaires</option>
                    {affaires.map(affaire => (
                      <option key={affaire.id} value={affaire.id}>{affaire.number} - {affaire.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Du</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Au</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Reset Filters */}
              {(searchText || filterAffaire || filterDateFrom || filterDateTo || filter) && (
                <button
                  onClick={() => {
                    setSearchText('');
                    setFilterAffaire(null);
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilter(null);
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors font-medium text-sm"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-lg">Aucune tâche pour le moment. Créez-en une pour commencer !</p>
        </div>
      ) : (
        <>
          {/* URGENT Section */}
          {urgentTasks.length > 0 && (
            <motion.div layout className="mb-8">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-4">🔴 Urgent ({urgentTasks.length})</h3>
              <div className="space-y-3 p-3 rounded-xl">
                <AnimatePresence mode="popLayout">
                  {urgentTasks.map((task, index) => {
                    const columnTasks = urgentTasks;
                    return (
                      <TaskRow 
                        key={task.id} 
                        task={task} 
                        index={index} 
                        onEdit={onEdit} 
                        onToggleComplete={onToggleComplete} 
                        onDelete={handleDelete} 
                        hoveredId={hoveredId} 
                        setHoveredId={setHoveredId} 
                        deletingId={deletingId} 
                        expandedTaskIds={expandedTaskIds} 
                        toggleExpanded={toggleExpanded} 
                        commentsMap={commentsMap} 
                        handleToggleSubtask={handleToggleSubtask} 
                        handleDeleteSubtask={handleDeleteSubtask}
                        onAddSubtask={handleAddSubtask}
                        onAddAlert={onAddAlert}
                        onValidateTask={onValidateTask}
                        currentUserName={currentUserName}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* À FAIRE Section */}
          {todoTasks.length > 0 && (
            <motion.div layout className="mb-8">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide mb-4">📝 À faire ({todoTasks.length})</h3>
              <div className="space-y-3 p-3 rounded-xl">
                <AnimatePresence mode="popLayout">
                  {todoTasks.map((task, index) => {
                    const columnTasks = todoTasks;
                    return (
                      <TaskRow 
                        key={task.id} 
                        task={task} 
                        index={index} 
                        onEdit={onEdit} 
                        onToggleComplete={onToggleComplete} 
                        onDelete={handleDelete} 
                        hoveredId={hoveredId} 
                        setHoveredId={setHoveredId} 
                        deletingId={deletingId} 
                        expandedTaskIds={expandedTaskIds} 
                        toggleExpanded={toggleExpanded} 
                        commentsMap={commentsMap} 
                        handleToggleSubtask={handleToggleSubtask} 
                        handleDeleteSubtask={handleDeleteSubtask}
                        onAddSubtask={handleAddSubtask}
                        onAddAlert={onAddAlert}
                        onValidateTask={onValidateTask}
                        currentUserName={currentUserName}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* EN COURS Section */}
          {inProgressTasks.length > 0 && (
            <motion.div layout className="mb-8">
              <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-4">⚙️ En cours ({inProgressTasks.length})</h3>
              <div className="space-y-3 p-3 rounded-xl">
                <AnimatePresence mode="popLayout">
                  {inProgressTasks.map((task, index) => {
                    const columnTasks = inProgressTasks;
                    return (
                      <TaskRow 
                        key={task.id} 
                        task={task} 
                        index={index} 
                        onEdit={onEdit} 
                        onToggleComplete={onToggleComplete} 
                        onDelete={handleDelete} 
                        hoveredId={hoveredId} 
                        setHoveredId={setHoveredId} 
                        deletingId={deletingId} 
                        expandedTaskIds={expandedTaskIds} 
                        toggleExpanded={toggleExpanded} 
                        commentsMap={commentsMap} 
                        handleToggleSubtask={handleToggleSubtask} 
                        handleDeleteSubtask={handleDeleteSubtask}
                        onAddSubtask={handleAddSubtask}
                        onAddAlert={onAddAlert}
                        onValidateTask={onValidateTask}
                        currentUserName={currentUserName}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* RENDEZ-VOUS À VENIR Section */}
          {upcomingAppointments.length > 0 && (
            <motion.div layout className="mb-8">
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide mb-4">📅 Rendez-vous à venir ({upcomingAppointments.length})</h3>
              <div className="space-y-3 p-3 rounded-xl">
                <AnimatePresence mode="popLayout">
                  {upcomingAppointments.map((task, index) => {
                    const columnTasks = upcomingAppointments;
                    return (
                      <TaskRow 
                        key={task.id} 
                        task={task} 
                        index={index} 
                        onEdit={onEdit} 
                        onToggleComplete={onToggleComplete} 
                        onDelete={handleDelete} 
                        hoveredId={hoveredId} 
                        setHoveredId={setHoveredId} 
                        deletingId={deletingId} 
                        expandedTaskIds={expandedTaskIds} 
                        toggleExpanded={toggleExpanded} 
                        commentsMap={commentsMap} 
                        handleToggleSubtask={handleToggleSubtask} 
                        handleDeleteSubtask={handleDeleteSubtask}
                        onAddSubtask={handleAddSubtask}
                        onAddAlert={onAddAlert}
                        onValidateTask={onValidateTask}
                        currentUserName={currentUserName}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Completed Tasks Section */}
          {completedTasks.length > 0 && (
            <motion.div layout className="mt-12 pt-8 border-t-2 border-zinc-200">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide mb-4">✅ Historique ({completedTasks.length})</h3>
              <motion.ul layout className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {completedTasks.map(task => {
                    const isDeleting = deletingId === task.id;
                    
                    return (
                      <motion.li
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className={`group relative px-4 py-3 rounded-xl border transition-all duration-300 ${
                          isDeleting ? 'scale-95 opacity-50' : ''
                        } bg-zinc-50/50 border-zinc-200/50 hover:bg-zinc-100/50`}
                        onMouseEnter={() => setHoveredId(task.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <div className="flex items-start gap-3">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleComplete(task, !task.is_complete);
                            }}
                            className="shrink-0 transition-colors mt-1 text-indigo-500 hover:text-indigo-600 hover:scale-110 cursor-pointer relative z-10"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </motion.button>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm line-through text-zinc-500">
                              {task.title}
                            </h3>
                          </div>
                          
                          {hoveredId === task.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex gap-1"
                            >
                              <motion.button
                                whileHover={{ scale: 1.1, filter: "brightness(1.1)" }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDelete(task.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </motion.div>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}


