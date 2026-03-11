import { Task } from '../types';
import { motion } from 'motion/react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

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
          {tasks.map(task => (
            <motion.li
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={task.id}
              className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-zinc-200"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-lg text-zinc-900 truncate">{task.title}</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Supprimée • {task.category_name || 'Aucune catégorie'}
                </p>
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
          ))}
        </motion.ul>
      )}
    </div>
  );
}
