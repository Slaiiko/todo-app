import { Task } from '../types';
import { motion } from 'motion/react';
import { Archive, RotateCcw, Download, Clock, ChevronDown, Briefcase, Folder, User, Calendar } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  tasks: Task[];
  onRestore: (id: number) => void;
  onExport: () => void;
}

export default function ArchiveView({ tasks, onRestore, onExport }: Props) {
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const toggleExpanded = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Count total completed subtasks across all archived tasks
  const totalCompletedSubtasks = tasks.reduce((sum, task) => {
    return sum + (task.subtasks?.filter(s => s.is_complete).length || 0);
  }, 0);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Archives</h2>
            <p className="text-zinc-500 text-sm">{tasks.length} tâches archivées</p>
          </div>
        </div>
        {tasks.length > 0 && (
          <button 
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Archive className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
          <p className="text-lg">Les archives sont vides.</p>
        </div>
      ) : (
        <motion.div layout className="space-y-3">
          {tasks.map(task => {
            const completedSubtasks = task.subtasks?.filter(s => s.is_complete) || [];
            const hasSubtasks = completedSubtasks.length > 0;
            const isExpanded = expandedTasks.has(task.id);
            
            return (
              <motion.div
                layout
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-2"
              >
                {/* Main Task */}
                <motion.li
                  className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-zinc-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg text-zinc-900 truncate">{task.title}</h3>
                      <button
                        onClick={() => toggleExpanded(task.id)}
                        className="shrink-0 p-1 text-zinc-400 hover:text-indigo-600 transition-colors"
                        title={isExpanded ? "Masquer détails" : "Voir détails"}
                      >
                        <ChevronDown 
                          className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      Archivée • {task.category_name || 'Aucune catégorie'}
                      {hasSubtasks && ` • ${completedSubtasks.length} sous-tâche${completedSubtasks.length > 1 ? 's' : ''}`}
                    </p>
                    {task.time_spent != null && Number(task.time_spent) > 0 && (
                      <div className="flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-lg mt-2 w-fit">
                        <Clock className="w-3 h-3" />
                        {Math.floor(Number(task.time_spent) / 60)}h {Number(task.time_spent) % 60}min
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button 
                      onClick={() => onRestore(task.id)} 
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Désarchiver
                    </button>
                  </div>
                </motion.li>

                {/* Subtasks and Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* Task Details */}
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                      {/* Affaire */}
                      {task.affaire_name && (
                        <div className="flex items-center gap-3">
                          <Briefcase className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="text-sm font-medium text-zinc-600">Affaire:</span>
                          <div 
                            className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-white"
                            style={{ backgroundColor: task.affaire_color || '#6366F1' }}
                          >
                            {task.affaire_number && <span className="mr-1 font-semibold">{task.affaire_number}</span>}
                            {task.affaire_name}
                          </div>
                        </div>
                      )}

                      {/* Category */}
                      {task.category_name && (
                        <div className="flex items-center gap-3">
                          <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="text-sm font-medium text-zinc-600">Catégorie:</span>
                          <div 
                            className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-white"
                            style={{ backgroundColor: task.category_color || '#6B7280' }}
                          >
                            {task.category_name}
                          </div>
                        </div>
                      )}

                      {/* Assignees */}
                      {task.assignees && task.assignees.length > 0 && (
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-zinc-600 block mb-1">En charge:</span>
                            <div className="flex flex-wrap gap-2">
                              {task.assignees.map((assignee) => (
                                <div key={assignee.assignee_id} className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-zinc-200 text-sm">
                                  {assignee.assignee_avatar && (
                                    <img src={assignee.assignee_avatar} alt={assignee.assignee_name} className="w-4 h-4 rounded-full object-cover" />
                                  )}
                                  <span className="font-medium text-zinc-700">{assignee.assignee_name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
                        {task.created_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-zinc-500">Créée le</p>
                              <p className="font-medium text-zinc-700">{format(parseISO(task.created_at), 'P', { locale: fr })}</p>
                            </div>
                          </div>
                        )}
                        {task.completed_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-zinc-500">Complétée le</p>
                              <p className="font-medium text-zinc-700">{format(parseISO(task.completed_at), 'P', { locale: fr })}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtasks */}
                    {hasSubtasks && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pl-4"
                      >
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Sous-tâches:</h4>
                        {completedSubtasks.map(subtask => (
                          <motion.div
                            key={subtask.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3 p-3 bg-white rounded-xl border border-zinc-100"
                          >
                            <div className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-zinc-900 truncate">{subtask.title || 'Sans titre'}</h4>
                              {subtask.assignee_name && (
                                <p className="text-xs text-zinc-600 mt-0.5">Assignée à: <span className="font-medium">{subtask.assignee_name}</span></p>
                              )}
                              {subtask.time_spent != null && Number(subtask.time_spent) > 0 && (
                                <div className="flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-lg mt-1.5 w-fit">
                                  <Clock className="w-3 h-3" />
                                  {Math.floor(Number(subtask.time_spent) / 60)}h {Number(subtask.time_spent) % 60}min
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
