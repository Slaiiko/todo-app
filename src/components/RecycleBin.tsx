import { Task } from '../types';
import { motion } from 'motion/react';
import { Archive, RotateCcw, Trash2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import TaskImageThumb from './TaskImageThumb';

interface Props {
  tasks: Task[];
  onRestore: (id: number) => void;
  onDeletePermanent: (id: number) => void;
  onEmptyTrash: () => void;
}

export default function RecycleBin({ tasks, onRestore, onDeletePermanent, onEmptyTrash }: Props) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Corbeille</h2>
            <p className="text-zinc-500 text-sm">{tasks.length} éléments</p>
          </div>
        </div>
        {tasks.length > 0 && (
          <button 
            onClick={onEmptyTrash}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors"
          >
            Vider la corbeille
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Trash2 className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
          <p className="text-lg">La corbeille est vide.</p>
        </div>
      ) : (
        <motion.ul layout className="space-y-3">
          {tasks.map(task => {
            const totalTime = Number(task.time_spent || 0) || 0;
            const focusTime = Number((task as any).focus_time_spent || 0) || 0;
            const validationTime = Number((task as any).validation_time_spent || 0) || 0;
            const knownTime = focusTime + validationTime;
            const legacyTime = totalTime > knownTime ? totalTime - knownTime : 0;

            return (
            <motion.li
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={task.id}
              className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-zinc-200"
            >
              <div className="flex-1 min-w-0 flex items-start gap-3">
                <TaskImageThumb
                  taskId={task.id}
                  imageData={task.image_data}
                  alt={task.title || 'Photo de la tâche'}
                  className="w-14 h-14 rounded-xl object-cover border border-zinc-200 shadow-sm shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-lg text-zinc-900 truncate">{task.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    Supprimée • {task.category_name || 'Aucune catégorie'}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    {focusTime > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3" />
                        Focus · {Math.floor(focusTime / 60)}h {focusTime % 60}min
                      </span>
                    )}
                    {validationTime > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3" />
                        Validation · {Math.floor(validationTime / 60)}h {validationTime % 60}min
                      </span>
                    )}
                    {legacyTime > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 bg-zinc-100 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3" />
                        Temps · {Math.floor(legacyTime / 60)}h {legacyTime % 60}min
                      </span>
                    )}
                    {task.subtasks_time_spent != null && Number(task.subtasks_time_spent) > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-fuchsia-700 bg-fuchsia-50 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3" />
                        Sous-tâches · {Math.floor(Number(task.subtasks_time_spent) / 60)}h {Number(task.subtasks_time_spent) % 60}min
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button 
                  onClick={() => onRestore(task.id)} 
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurer
                </button>
                <button 
                  onClick={() => onDeletePermanent(task.id)} 
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer définitivement"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.li>
          );})}
        </motion.ul>
      )}
    </div>
  );
}


