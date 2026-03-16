import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Affaire, Task } from '../types';
import { Plus, Briefcase, Edit2, Trash2, ImagePlus, X } from 'lucide-react';

interface Props {
  affaires: Affaire[];
  tasks: Task[];
  onAddAffaire: (affaire: Partial<Affaire>) => void;
  onUpdateAffaire: (affaire: Affaire) => void;
  onDeleteAffaire: (id: number) => void;
  onSelectAffaire: (affaire: Affaire | null) => void;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function AffairesView({ affaires, tasks, onAddAffaire, onUpdateAffaire, onDeleteAffaire, onSelectAffaire }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAffaire, setEditingAffaire] = useState<Affaire | null>(null);

  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [status, setStatus] = useState<'Active' | 'En pause' | 'Clôturée'>('Active');
  const [imageData, setImageData] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const openModal = (affaire?: Affaire) => {
    if (affaire) {
      setEditingAffaire(affaire);
      setNumber(affaire.number);
      setName(affaire.name);
      setColor(affaire.color);
      setStatus(affaire.status);
      setImageData(affaire.image_data ?? null);
    } else {
      setEditingAffaire(null);
      setNumber('');
      setName('');
      setColor('#6366f1');
      setStatus('Active');
      setImageData(null);
    }
    setIsModalOpen(true);
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageData(dataUrl);
    } catch {
      alert('Erreur lors de la lecture de l\'image.');
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!number || !name) return;

    if (editingAffaire) {
      onUpdateAffaire({ ...editingAffaire, number, name, color, status, image_data: imageData });
    } else {
      onAddAffaire({ number, name, color, status, image_data: imageData });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900">Gestion des Affaires</h2>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nouvelle Affaire
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {affaires.map(affaire => {
          const affaireTasks = tasks.filter(t => t.affaire_id === affaire.id);
          const completedTasks = affaireTasks.filter(t => t.is_complete).length;
          const totalTasks = affaireTasks.length;
          const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

          return (
      <motion.div
              key={affaire.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-sm transition-all cursor-pointer group overflow-hidden"
              onClick={() => onSelectAffaire(affaire)}
            >
              {/* Thumbnail banner */}
              {affaire.image_data && (
                <div className="relative h-28 w-full overflow-hidden">
                  <img
                    src={affaire.image_data}
                    alt={affaire.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateAffaire({ ...affaire, image_data: null });
                    }}
                    className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 text-zinc-500 hover:text-red-600 hover:bg-red-50 shadow transition-colors opacity-0 group-hover:opacity-100"
                    title="Supprimer la vignette"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${affaire.color}20`, color: affaire.color }}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-500">{affaire.number}</div>
                    <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">{affaire.name}</h3>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); openModal(affaire); }} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteAffaire(affaire.id); }} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Progression</span>
                  <span className="font-medium text-zinc-700">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: affaire.color }} />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 pt-2">
                  <span>{completedTasks} / {totalTasks} tâches</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${affaire.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : affaire.status === 'En pause' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-700'}`}>
                    {affaire.status}
                  </span>
                </div>
              </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingAffaire ? 'Modifier l\'affaire' : 'Nouvelle affaire'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Numéro d'affaire</label>
                <input
                  type="text"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  placeholder="ex: 26-009"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nom de l'affaire</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: Orkane"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Couleur</label>
                <div className="flex gap-2">
                  {['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'].map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-zinc-400' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Statut</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="En pause">En pause</option>
                  <option value="Clôturée">Clôturée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Vignette / Photo</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />
                {imageData ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-zinc-200">
                    <img src={imageData} alt="Vignette" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageData(null)}
                      className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/90 text-zinc-600 hover:text-red-600 hover:bg-red-50 shadow transition-colors"
                      title="Supprimer la vignette"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 border border-dashed border-zinc-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors w-full justify-center"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Ajouter une photo
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!number || !name}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Enregistrer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}


