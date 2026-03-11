import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseBackup, Download, Upload, Trash2, Lock, FileJson, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Backup {
  id: number;
  filename: string;
  path: string;
  exported_at: string;
  profile_id: number;
  profile_name: string;
  task_count: number;
  file_size_kb: number;
  is_encrypted: number;
  status: string;
}

interface Props {
  profileId: number;
  onRestoreComplete: () => void;
}

export default function BackupManager({ profileId, onRestoreComplete }: Props) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [password, setPassword] = useState('');
  const [useEncryption, setUseEncryption] = useState(false);
  const [importMode, setImportMode] = useState<'full' | 'merge' | 'profile'>('full');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      setBackups(data);
    } catch (error) {
      console.error('Failed to fetch backups', error);
    }
  };

  const handleExport = async () => {
    if (useEncryption && !password) {
      showMessage('error', 'Veuillez entrer un mot de passe pour chiffrer la sauvegarde.');
      return;
    }

    setIsExporting(true);
    try {
      // Collect all comments from localStorage
      const allComments: Record<string, any[]> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('-comments') || key.startsWith('task-') || key.startsWith('subtask-'))) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              allComments[key] = JSON.parse(value);
            }
          } catch (e) {
            // Skip invalid JSON entries
          }
        }
      }

      const res = await fetch('/api/backups/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profileId, 
          password: useEncryption ? password : null,
          comments: allComments
        })
      });
      const data = await res.json();
      
      if (data.success) {
        showMessage('success', `Sauvegarde créée : ${data.filename} (${data.size} KB)`);
        fetchBackups();
        
        // Trigger download
        window.location.href = `/api/backups/download/${data.filename}`;
      } else {
        showMessage('error', data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setIsExporting(false);
      setPassword('');
      setUseEncryption(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette sauvegarde ?')) return;
    
    try {
      await fetch(`/api/backups/${id}`, { method: 'DELETE' });
      fetchBackups();
    } catch (error) {
      console.error('Failed to delete backup', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setShowImportModal(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.json') || file.name.endsWith('.jsonbak')) {
        setSelectedFile(file);
        setShowImportModal(true);
      } else {
        showMessage('error', 'Format de fichier non supporté. Utilisez .json ou .jsonbak');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    if (selectedFile.name.endsWith('.jsonbak') && !importPassword) {
      showMessage('error', 'Mot de passe requis pour cette sauvegarde chiffrée.');
      return;
    }

    if (importMode === 'full' && !confirm('⚠️ ATTENTION : Toutes les données actuelles seront supprimées et remplacées par cette sauvegarde. Continuer ?')) {
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await selectedFile.text();
      
      const res = await fetch('/api/backups/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileContent, 
          filename: selectedFile.name,
          mode: importMode,
          password: importPassword
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Restore comments to localStorage
        if (data.comments && typeof data.comments === 'object') {
          for (const [key, value] of Object.entries(data.comments)) {
            try {
              localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
              console.error(`Failed to restore comment ${key}:`, e);
            }
          }
        }
        
        showMessage('success', `Restauration terminée — ${data.taskCount} tâches importées.`);
        setShowImportModal(false);
        setSelectedFile(null);
        setImportPassword('');
        onRestoreComplete();
      } else {
        showMessage('error', data.error || 'Erreur lors de la restauration');
      }
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div 
      className="max-w-5xl mx-auto space-y-8"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Sauvegardes & Restauration</h2>
          <p className="text-zinc-500 mt-1">Exportez ou importez vos données (glissez-déposez un fichier ici pour restaurer)</p>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-medium">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auto-Backup Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex flex-col md:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Sauvegarde Automatique</h3>
              <p className="text-zinc-500 text-sm">Configurez des sauvegardes régulières pour ne jamais perdre vos données.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Fréquence</label>
              <select className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                <option value="disabled">Désactivé</option>
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Nombre max. de sauvegardes à conserver</label>
              <select className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                <option value="3">3 sauvegardes</option>
                <option value="5">5 sauvegardes</option>
                <option value="10">10 sauvegardes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex flex-col">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Download className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Exporter une sauvegarde</h3>
          <p className="text-zinc-500 text-sm mb-6 flex-1">
            Créez un fichier contenant toutes vos tâches, affaires, catégories et statistiques.
          </p>
          
          <div className="space-y-4 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-zinc-400" />
                Chiffrer la sauvegarde (mot de passe)
              </span>
            </label>
            
            <AnimatePresence>
              {useEncryption && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe de chiffrement"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isExporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <DatabaseBackup className="w-5 h-5" />}
            {isExporting ? 'Création en cours...' : 'Sauvegarder maintenant'}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex flex-col">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Restaurer une sauvegarde</h3>
          <p className="text-zinc-500 text-sm mb-6 flex-1">
            Importez un fichier de sauvegarde précédent (.json ou .jsonbak).
          </p>
          
          <input 
            type="file" 
            accept=".json,.jsonbak" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-zinc-300 text-zinc-600 font-medium rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-colors"
          >
            <FileJson className="w-5 h-5" />
            Sélectionner un fichier
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
          <h3 className="font-bold text-zinc-900">Historique des sauvegardes locales</h3>
        </div>
        
        {backups.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <DatabaseBackup className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            <p>Aucune sauvegarde locale trouvée.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {backups.map((backup) => (
              <div key={backup.id} className="p-4 px-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${backup.is_encrypted ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {backup.is_encrypted ? <Lock className="w-5 h-5" /> : <FileJson className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900">{backup.filename}</h4>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span>{format(parseISO(backup.exported_at), 'd MMM yyyy à HH:mm', { locale: fr })}</span>
                      <span>•</span>
                      <span>{backup.file_size_kb} KB</span>
                      <span>•</span>
                      <span>{backup.task_count} tâches</span>
                      <span>•</span>
                      <span>Profil: {backup.profile_name || 'Inconnu'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={`/api/backups/download/${backup.filename}`}
                    download
                    className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => handleDelete(backup.id)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && selectedFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200"
            >
              <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                <h3 className="text-lg font-bold text-zinc-900">Restaurer la sauvegarde</h3>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-100">
                  <FileJson className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium truncate">{selectedFile.name}</span>
                </div>

                {selectedFile.name.endsWith('.jsonbak') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Mot de passe de déchiffrement</label>
                    <input
                      type="password"
                      value={importPassword}
                      onChange={(e) => setImportPassword(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Requis pour les fichiers .jsonbak"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-700">Mode de restauration</label>
                  
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${importMode === 'full' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}>
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'full'} 
                      onChange={() => setImportMode('full')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-medium text-zinc-900">Restauration complète</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Remplace toutes les données actuelles par celles de la sauvegarde.</div>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${importMode === 'merge' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}>
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'merge'} 
                      onChange={() => setImportMode('merge')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-medium text-zinc-900">Fusion intelligente</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Ajoute les nouvelles tâches sans supprimer les existantes.</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${importMode === 'profile' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}>
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'profile'} 
                      onChange={() => setImportMode('profile')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-medium text-zinc-900">Importer un profil uniquement</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Ajoute les profils de la sauvegarde comme de nouveaux profils.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
                <button 
                  onClick={() => { setShowImportModal(false); setSelectedFile(null); setImportPassword(''); }}
                  className="px-4 py-2 text-zinc-600 font-medium hover:bg-zinc-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleImport}
                  disabled={isImporting || (selectedFile.name.endsWith('.jsonbak') && !importPassword)}
                  className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isImporting ? 'Restauration...' : 'Restaurer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
