import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task } from '../types';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, CheckCircle2, Circle, Briefcase, AlertCircle, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  tasks: Task[];
  onTaskMove: () => void;
  onEdit: (task: Task) => void;
}

const COLUMNS = ['Urgent', 'To Do', 'In Progress', 'Done'];
const COLUMN_LABELS: Record<string, string> = {
  'Urgent': '🔴 Urgent',
  'To Do': 'À faire',
  'In Progress': 'En cours',
  'Done': 'Terminé'
};

export default function KanbanView({ tasks, onTaskMove, onEdit }: Props) {
  const [columns, setColumns] = useState<{ [key: string]: Task[] }>({
    'Urgent': [],
    'To Do': [],
    'In Progress': [],
    'Done': []
  });
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const newCols = { 'Urgent': [], 'To Do': [], 'In Progress': [], 'Done': [] } as { [key: string]: Task[] };
    
    tasks.forEach(task => {
      // Skip archived tasks
      if (task.is_archived) {
        return;
      }
      
      // Hide tasks completed more than 7 days ago
      if (task.is_complete && task.completed_at) {
        const daysSinceCompletion = differenceInDays(new Date(), parseISO(task.completed_at));
        if (daysSinceCompletion > 7) {
          return; // Skip this task
        }
      }
      
      const col = task.kanban_column || 'To Do';
      if (newCols[col]) {
        newCols[col].push(task);
      } else {
        newCols['To Do'].push(task);
      }
    });
    
    // Sort by order_index
    Object.keys(newCols).forEach(key => {
      newCols[key].sort((a, b) => a.order_index - b.order_index);
    });
    
    setColumns(newCols);
  }, [tasks]);

  const toggleTaskExpand = (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceCol = columns[source.droppableId];
    const destCol = columns[destination.droppableId];
    
    const sourceTasks = [...sourceCol];
    const destTasks = source.droppableId === destination.droppableId ? sourceTasks : [...destCol];
    
    const [movedTask] = sourceTasks.splice(source.index, 1);
    movedTask.kanban_column = destination.droppableId;
    
    destTasks.splice(destination.index, 0, movedTask);
    
    setColumns({
      ...columns,
      [source.droppableId]: sourceTasks,
      [destination.droppableId]: destTasks
    });

    // Update backend
    const updatePayload: any = {
      kanban_column: destination.droppableId,
      order_index: destination.index
    };
    
    // If moving to "Done" column, auto-archive the task
    if (destination.droppableId === 'Done') {
      updatePayload.is_complete = 1;
      updatePayload.is_archived = 1;
      updatePayload.completed_at = new Date().toISOString();
    }
    
    await fetch(`/api/tasks/${movedTask.id}/kanban`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });
    
    onTaskMove();
  };

  const getFilteredTasks = (columnTasks: Task[]): Task[] => {
    return columnTasks.filter(task => {
      // Filter by search text (task name)
      if (searchText && !task.title.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      
      // Filter by completion status
      if (completionFilter === 'completed' && !task.is_complete) {
        return false;
      }
      if (completionFilter === 'incomplete' && task.is_complete) {
        return false;
      }
      
      return true;
    });
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        onTaskMove();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const priorityColors = {
    High: 'bg-red-500',
    Medium: 'bg-amber-500',
    Low: 'bg-emerald-500'
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pb-8">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 px-4 pt-4 pb-3 border-b border-zinc-200/50 shadow-sm">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-indigo-600 transition-colors whitespace-nowrap px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            <span>Filtrer</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-2"
          >
            {['all', 'completed', 'incomplete'].map(filter => (
              <button
                key={filter}
                onClick={() => setCompletionFilter(filter as typeof completionFilter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  completionFilter === filter
                    ? 'bg-indigo-500 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {filter === 'all' && 'Toutes'}
                {filter === 'completed' && 'Terminées'}
                {filter === 'incomplete' && 'Non terminées'}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Main Kanban Board */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-4 px-4">Tâches Actives</h2>
        <div className="flex gap-6 overflow-x-auto pb-4 px-4">
          <DragDropContext onDragEnd={onDragEnd}>
            {COLUMNS.map(colId => {
              const filteredTasks = getFilteredTasks(columns[colId] || []);
              const totalTasks = columns[colId] || [];
              const incompleteCount = filteredTasks.filter(t => !t.is_complete).length;
              
              return (
                <div key={colId} className="flex flex-col w-80 shrink-0 bg-zinc-100/50 rounded-2xl p-4 border border-zinc-200/50">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-semibold text-zinc-700">{COLUMN_LABELS[colId]}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-indigo-600">
                        {incompleteCount}
                      </span>
                      <span className="text-xs font-medium text-zinc-500 bg-zinc-200 px-2.5 py-1 rounded-full">
                        {filteredTasks.length}
                      </span>
                    </div>
                  </div>
                  
                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 min-h-[200px] transition-all duration-300 rounded-xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50 border-2 border-dashed border-indigo-300' : 'border-2 border-transparent'}`}
                      >
                        {filteredTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onEdit(task)}
                                style={{
                                  ...provided.draggableProps.style,
                                  transform: snapshot.isDragging 
                                    ? `${provided.draggableProps.style?.transform} rotate(3deg)` 
                                    : provided.draggableProps.style?.transform,
                                }}
                                className={`mb-3 bg-white p-4 rounded-xl border transition-all duration-200 cursor-pointer ${snapshot.isDragging ? 'shadow-2xl border-indigo-400 scale-105 z-50' : 'border-zinc-200 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5'}`}
                              >
                                {/* Header with priority and category */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-8 rounded-full ${priorityColors[task.priority]}`} />
                                    {task.category_name && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-sm">
                                        {task.category_name}
                                      </span>
                                    )}
                                  </div>
                                  {isPast(parseISO(task.due_date || new Date().toISOString())) && !task.is_complete && (
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                  )}
                                </div>
                                
                                {/* Task title */}
                                <h4 className={`font-semibold text-sm text-zinc-900 mb-2 line-clamp-2 leading-tight ${task.is_complete ? 'line-through text-zinc-400' : ''}`}>
                                  {task.title}
                                </h4>
                                
                                {/* Affaire badge */}
                                {task.affaire_name && (
                                  <div className="mb-3">
                                    <span className="inline-flex items-center gap-1.5 text-zinc-600 bg-zinc-100 px-2 py-1 rounded-md text-[10px] font-medium">
                                      <Briefcase className="w-3 h-3" style={{ color: task.affaire_color }} />
                                      {task.affaire_number} - {task.affaire_name}
                                    </span>
                                  </div>
                                )}

                                {/* Description preview */}
                                {task.description_md && (
                                  <p className="text-xs text-zinc-500 mb-2 line-clamp-1">
                                    {task.description_md.substring(0, 60)}...
                                  </p>
                                )}

                                {/* Subtasks progress */}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-zinc-600">Tâches</span>
                                      <button
                                        onClick={(e) => toggleTaskExpand(e, task.id)}
                                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-600 transition-colors"
                                      >
                                        <span>{task.subtasks.filter(s => s.is_complete).length}/{task.subtasks.length}</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedTaskIds.has(task.id) ? 'rotate-180' : ''}`} />
                                      </button>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                      <motion.div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(task.subtasks.filter(s => s.is_complete).length / task.subtasks.length) * 100}%` }}
                                        transition={{ duration: 0.4 }}
                                      />
                                    </div>
                                    
                                    {/* Subtasks list */}
                                    <AnimatePresence>
                                      {expandedTaskIds.has(task.id) && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-2 pt-2 border-t border-zinc-200 space-y-1.5"
                                        >
                                          {task.subtasks.map(subtask => (
                                            <div key={subtask.id} className="flex items-start gap-2 text-xs">
                                              <div className="mt-0.5">
                                                {subtask.is_complete ? (
                                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                                                ) : (
                                                  <Circle className="w-3.5 h-3.5 text-zinc-300" />
                                                )}
                                              </div>
                                              <span className={`flex-1 ${subtask.is_complete ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                                                {subtask.title}
                                              </span>
                                            </div>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}

                                {/* Footer with metadata */}
                                <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 pt-2">
                                  <div className="flex items-center gap-2">
                                    {task.due_date && (
                                      <span className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${isPast(parseISO(task.due_date)) && !task.is_complete ? 'text-red-600 bg-red-50 font-semibold' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                                        <Clock className="w-3 h-3" />
                                        {format(parseISO(task.due_date), 'd MMM', { locale: fr })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {task.is_complete ? (
                                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-zinc-300" />
                                    )}
                                    <button
                                      onClick={(e) => handleDeleteTask(e, task.id)}
                                      className="text-zinc-400 hover:text-red-500 transition-colors hover:bg-red-50 p-1.5 rounded-md"
                                      title="Supprimer la tâche"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
