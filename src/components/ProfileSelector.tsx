import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile } from '../types';
import { getAPIUrl } from '../utils/api';
import { Plus, Trash2, RotateCcw, Edit2, Upload, CheckCircle2, AlertCircle, Download, DatabaseBackup, FileJson, Monitor, Smartphone } from 'lucide-react';

interface Props {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onCreateProfile: (profile: Profile) => void;
  onDeleteProfile?: (profileId: number) => Promise<void>;
  onRestoreProfile?: (profileId: number) => Promise<void>;
  layoutMode: 'desktop' | 'mobile';
  onLayoutModeChange: (mode: 'desktop' | 'mobile') => void;
}

export default function ProfileSelector({ profiles, onSelect, onCreateProfile, onDeleteProfile, onRestoreProfile, layoutMode, onLayoutModeChange }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [createLogo, setCreateLogo] = useState('');
  const [createLogoUrl, setCreateLogoUrl] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [permanentDeleteConfirmId, setPermanentDeleteConfirmId] = useState<number | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingAllJson, setIsExportingAllJson] = useState(false);
  const [isExportingAllDb, setIsExportingAllDb] = useState(false);
  const [showBackupTools, setShowBackupTools] = useState(false);
  const [importTarget, setImportTarget] = useState<'profile' | 'full'>('profile');
  const [importKind, setImportKind] = useState<'json' | 'db'>('json');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const importToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [logoInputValue, setLogoInputValue] = useState('');

  useEffect(() => {
    return () => {
      if (importToastTimerRef.current) {
        clearTimeout(importToastTimerRef.current);
      }
    };
  }, []);

  const handleCreateLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCreateLogo(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setCreateError('Le nom du profil est requis.');
      return;
    }
    
    try {
      setIsCreatingProfile(true);
      setCreateError(null);
      const res = await fetch(getAPIUrl('/profiles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar, color_theme: 'blue', logo: createLogo || null })
      });
      
      if (!res.ok) {
        const rawError = await res.text();
        setCreateError(rawError || 'Impossible de créer le profil.');
        console.error('Failed to create profile:', rawError);
        return;
      }
      
      const newProfile = await res.json();
      let profileToSelect = newProfile;
      try {
        const profilesRes = await fetch(getAPIUrl('/profiles'));
        if (profilesRes.ok) {
          const updatedProfiles = await profilesRes.json();
          if (Array.isArray(updatedProfiles)) {
            window.dispatchEvent(new CustomEvent('profilesUpdated', { detail: updatedProfiles }));
            const persistedProfile = updatedProfiles.find((p: Profile) => p.id === newProfile.id);
            profileToSelect = persistedProfile || newProfile;
          }
        }
      } catch (syncError) {
        console.warn('Failed to resync profiles after creation:', syncError);
      }

      onCreateProfile(profileToSelect);
      onSelect(profileToSelect);
      setIsCreating(false);
      setName('');
      setAvatar('👤');
      setCreateLogo('');
      setCreateLogoUrl('');
    } catch (error) {
      console.error('Error creating profile:', error);
      setCreateError('Erreur réseau lors de la création du profil.');
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleArchiveProfile = async (profileId: number) => {
    if (onDeleteProfile) {
      await onDeleteProfile(profileId);
    }
    setDeleteConfirmId(null);
  };

  const handleRestoreProfile = async (profileId: number) => {
    if (onRestoreProfile) {
      await onRestoreProfile(profileId);
    }
  };

  const handlePermanentDeleteProfile = async (profileId: number | null) => {
    if (!profileId) return;
    
    try {
      const res = await fetch(getAPIUrl(`/profiles/${profileId}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        // Refresh profiles list
        const profilesRes = await fetch(getAPIUrl('/profiles'));
        const updatedProfiles = await profilesRes.json();
        window.dispatchEvent(new CustomEvent('profilesUpdated', { detail: updatedProfiles }));
        setPermanentDeleteConfirmId(null);
      } else {
        console.error('Failed to delete profile:', res.statusText);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditName(profile.name);
    setEditAvatar(profile.avatar);
    setEditLogo(profile.logo || '');
    setLogoInputValue(profile.logo || '');
  };

  const handleSaveEdit = async (profileId: number) => {
    try {
      const response = await fetch(getAPIUrl(`/profiles/${profileId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          avatar: editAvatar,
          logo: editLogo || null
        })
      });

      if (response.ok) {
        // Refresh profiles list
        const profilesRes = await fetch(getAPIUrl('/profiles'));
        const updatedProfiles = await profilesRes.json();
        // Dispatch event to notify parent component
        window.dispatchEvent(new CustomEvent('profilesUpdated', { detail: updatedProfiles }));
        setEditingProfileId(null);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setEditLogo(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const showImportToast = (type: 'success' | 'error', text: string, ms = 6000) => {
    if (importToastTimerRef.current) {
      clearTimeout(importToastTimerRef.current);
    }
    setImportMessage({ type, text });
    importToastTimerRef.current = setTimeout(() => setImportMessage(null), ms);
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const commaIndex = result.indexOf(',');
        if (commaIndex === -1) {
          reject(new Error('Impossible de lire le fichier'));
          return;
        }
        resolve(result.slice(commaIndex + 1));
      };
      reader.onerror = () => reject(reader.error || new Error('Lecture échouée'));
      reader.readAsDataURL(file);
    });

  const refreshProfilesList = async () => {
    const profilesRes = await fetch(getAPIUrl('/profiles'));
    if (!profilesRes.ok) return;
    const updated = await profilesRes.json();
    if (Array.isArray(updated)) {
      window.dispatchEvent(new CustomEvent('profilesUpdated', { detail: updated }));
    }
  };

  const handleExportAllJson = async () => {
    setIsExportingAllJson(true);
    try {
      const allComments: Record<string, any[]> = {};
      const allSettings: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const rawValue = localStorage.getItem(key);
        if (rawValue !== null) {
          try {
            allSettings[key] = JSON.parse(rawValue);
          } catch {
            allSettings[key] = rawValue;
          }
        }

        if (key && (key.includes('-comments') || key.startsWith('task-') || key.startsWith('subtask-'))) {
          try {
            if (rawValue) allComments[key] = JSON.parse(rawValue);
          } catch (_) {}
        }
      }

      const res = await fetch(getAPIUrl('/backups/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'full', comments: allComments, settings: allSettings })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Export JSON global échoué');
      }

      showImportToast('success', `Export complet JSON créé: ${data.filename}`);
      window.location.href = `/api/backups/download/${data.filename}`;
    } catch (error: any) {
      showImportToast('error', error?.message || 'Erreur export JSON global');
    } finally {
      setIsExportingAllJson(false);
    }
  };

  const handleExportAllDb = async () => {
    setIsExportingAllDb(true);
    try {
      const res = await fetch(getAPIUrl('/backups/export-db'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'full' })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Export DB global échoué');
      }

      showImportToast('success', `Export complet DB créé: ${data.filename}`);
      window.location.href = `/api/backups/download/${data.filename}`;
    } catch (error: any) {
      showImportToast('error', error?.message || 'Erreur export DB global');
    } finally {
      setIsExportingAllDb(false);
    }
  };

  const openImportFile = (file: File) => {
    const lower = file.name.toLowerCase();
    const isJson = lower.endsWith('.json') || lower.endsWith('.jsonbak');
    const isDb = lower.endsWith('.db') || lower.endsWith('.sqlite') || lower.endsWith('.sqlite3');
    if (!isJson && !isDb) {
      showImportToast('error', 'Format non supporté. Utilisez .json/.jsonbak/.db/.sqlite/.sqlite3', 5000);
      return;
    }
    setImportKind(isDb ? 'db' : 'json');
    if (isDb) {
      setImportTarget('full');
    }
    setImportFile(file);
    setImportPassword('');
    setShowImportModal(true);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openImportFile(file);
    e.target.value = '';
  };

  const handleDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDropZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openImportFile(file);
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;

    const lower = importFile.name.toLowerCase();
    const isDb = lower.endsWith('.db') || lower.endsWith('.sqlite') || lower.endsWith('.sqlite3');
    const isJsonBak = lower.endsWith('.jsonbak');

    if (!isDb && isJsonBak && !importPassword) {
      showImportToast('error', 'Mot de passe requis pour ce fichier chiffré.', 5000);
      return;
    }

    if (importTarget === 'full' && !window.confirm('⚠️ Import complet: toutes les données actuelles de l\'application seront remplacées. Continuer ?')) {
      return;
    }

    setIsImporting(true);
    try {
      let data: any = null;
      let response: Response;

      if (isDb) {
        const base64 = await readFileAsBase64(importFile);
        response = await fetch(getAPIUrl('/backups/import-db'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: importFile.name,
            fileContentBase64: base64,
            mode: importTarget,
            noSuffix: importTarget === 'profile'
          })
        });
      } else {
        const fileContent = await importFile.text();
        response = await fetch(getAPIUrl('/backups/import'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileContent,
            filename: importFile.name,
            mode: importTarget,
            noSuffix: importTarget === 'profile',
            password: importPassword || null
          })
        });
      }

      const rawBody = await response.text();
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        data = { error: rawBody || `Erreur HTTP ${response.status}` };
      }
      if (response.ok && data?.success) {
        if (data.settings && typeof data.settings === 'object') {
          for (const [key, value] of Object.entries(data.settings)) {
            try {
              localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            } catch (_) {}
          }
        }

        if (data.comments && typeof data.comments === 'object') {
          for (const [key, value] of Object.entries(data.comments)) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
          }
        }

        const importScopeLabel = importTarget === 'full' ? 'application complète' : 'profil(s)';
        showImportToast('success', `Importation ${importKind.toUpperCase()} réussie (${importScopeLabel}). Rechargement...`);
        setShowImportModal(false);
        setImportFile(null);
        setImportPassword('');

        // DB import or full import replaces broad app state — hard reload for fresh state
        if (isDb || importTarget === 'full') {
          setTimeout(() => window.location.reload(), 1500);
        } else {
          await refreshProfilesList();
        }
      } else {
        console.error('[import] Server error:', response.status, data);
        showImportToast('error', data?.error || 'Erreur lors de l\'importation.');
      }
    } catch (err: any) {
      showImportToast('error', err?.message || 'Erreur réseau.');
    } finally {
      setIsImporting(false);
    }
  };

  const activeProfiles = profiles.filter(p => !p.is_archived);
  const archivedProfiles = profiles.filter(p => p.is_archived);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl w-full"
      >
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center rounded-2xl border border-white/10 bg-zinc-800/80 p-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => onLayoutModeChange('desktop')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                layoutMode === 'desktop'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-300 hover:bg-zinc-700/80 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Vue Ordinateur</span>
            </button>
            <button
              type="button"
              onClick={() => onLayoutModeChange('mobile')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                layoutMode === 'mobile'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-300 hover:bg-zinc-700/80 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Vue Mobile</span>
            </button>
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Who's working today?</h1>
          <p className="text-zinc-400">Select your profile to continue</p>
        </div>

        {/* Import message */}
        <AnimatePresence mode="wait">
          {importMessage && (
            <motion.div
              key={`${importMessage.type}-${importMessage.text}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                importMessage.type === 'success'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                  : 'bg-red-900/60 text-red-300 border border-red-700'
              }`}
            >
              {importMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <p className="text-sm font-medium">{importMessage.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Profiles */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {activeProfiles.map(profile => (
            <motion.div
              key={profile.id}
              className="flex flex-col items-center gap-4 group"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(profile)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(profile);
                  }
                }}
                role="button"
                tabIndex={0}
                className="relative"
              >
                <div className="w-32 h-32 rounded-3xl bg-zinc-800 flex items-center justify-center text-5xl border-2 border-transparent group-hover:border-indigo-500 transition-colors shadow-xl overflow-hidden">
                  {profile.logo ? (
                    <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    profile.avatar
                  )}
                </div>
                
                {/* Buttons overlay - positioned inside the square */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 rounded-3xl bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProfile(profile);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors"
                    title="Edit profile"
                  >
                    <Edit2 className="w-5 h-5" />
                  </motion.button>
                  
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(profile.id);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    title="Archive profile"
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              </motion.div>
              
              <span className="text-lg font-medium text-zinc-300 group-hover:text-white transition-colors">
                {profile.name}
              </span>
            </motion.div>
          ))}

          {!isCreating ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreating(true)}
              className="flex flex-col items-center gap-4 group"
            >
              <div className="w-32 h-32 rounded-3xl bg-zinc-800/50 flex items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-700 group-hover:border-zinc-500 group-hover:text-zinc-300 transition-colors">
                <Plus className="w-10 h-10" />
              </div>
              <span className="text-lg font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                New Profile
              </span>
            </motion.button>
          ) : (
            <motion.form 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              onSubmit={handleCreate}
              autoComplete="off"
              className="flex flex-col items-center gap-4 bg-zinc-800 p-6 rounded-3xl shadow-xl max-w-sm"
            >
              <div className="flex gap-2 mb-2">
                {['👤', '👩‍💻', '👨‍🚀', '🦊', '🤖'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${avatar === emoji ? 'bg-indigo-500' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (createError) setCreateError(null);
                }}
                name="profile-display-name"
                autoComplete="off"
                placeholder="Your Name"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-full"
                autoFocus
              />
              {createError && (
                <p className="text-xs text-red-400 w-full">{createError}</p>
              )}
              <div className="w-full space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Logo (optionnel)</label>
                <input
                  type="text"
                  value={createLogoUrl}
                  onChange={e => {
                    setCreateLogoUrl(e.target.value);
                    setCreateLogo(e.target.value);
                  }}
                  placeholder="URL du logo"
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-full text-sm"
                />
                <div className="relative">
                  <button
                    type="button"
                    className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium text-sm transition-colors"
                    onClick={() => (document.getElementById('logoFileInput') as HTMLInputElement)?.click()}
                  >
                    ou Upload une image
                  </button>
                  <input
                    id="logoFileInput"
                    type="file"
                    accept="image/*"
                    onChange={handleCreateLogoFileUpload}
                    className="hidden"
                  />
                </div>
                {createLogo && (
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-indigo-500">
                    <img src={createLogo} alt="Logo preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setCreateLogo('');
                        setCreateLogoUrl('');
                      }}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 w-full">
                <button type="button" onClick={() => {
                  if (isCreatingProfile) return;
                  setIsCreating(false);
                  setName('');
                  setAvatar('👤');
                  setCreateLogo('');
                  setCreateLogoUrl('');
                  setCreateError(null);
                }} className="flex-1 py-2 text-zinc-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={isCreatingProfile} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                  {isCreatingProfile ? 'Création...' : 'Create'}
                </button>
              </div>
            </motion.form>
          )}
        </div>

        <div className="mt-6 mb-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowBackupTools((current) => !current)}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
              showBackupTools
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <DatabaseBackup className="w-4 h-4" />
            {showBackupTools ? 'Masquer Sauvegarde' : 'Sauvegarde'}
          </button>
        </div>

        <AnimatePresence>
          {showBackupTools && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Full extraction buttons */}
              <div className="mt-2 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={handleExportAllJson}
                  disabled={isExportingAllJson}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isExportingAllJson ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <FileJson className="w-4 h-4" />}
                  {isExportingAllJson ? 'Extraction JSON...' : 'Extraction Complète JSON'}
                </button>

                <button
                  onClick={handleExportAllDb}
                  disabled={isExportingAllDb}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {isExportingAllDb ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <DatabaseBackup className="w-4 h-4" />}
                  {isExportingAllDb ? 'Extraction DB...' : 'Extraction Complète DB'}
                </button>
              </div>

              {/* Import backup drop zone */}
              <div className="mt-3 mb-4">
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json,.jsonbak,.db,.sqlite,.sqlite3"
                  onChange={handleImportFileChange}
                  className="hidden"
                />
                <div
                  onDragOver={handleDropZoneDragOver}
                  onDragLeave={handleDropZoneDragLeave}
                  onDrop={handleDropZoneDrop}
                  onClick={() => importFileRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all ${
                    isDragOver
                      ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                      : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/40 hover:bg-zinc-800/70'
                  }`}
                >
                  <div className={`p-3 rounded-full transition-colors ${ isDragOver ? 'bg-indigo-500/20' : 'bg-zinc-700/50'}`}>
                    <Upload className={`w-6 h-6 ${ isDragOver ? 'text-indigo-400' : 'text-zinc-400' }`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-medium text-sm ${ isDragOver ? 'text-indigo-300' : 'text-zinc-300' }`}>
                      {isDragOver ? 'Déposez le fichier ici' : 'Importer des données (Profil ou Complet)'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Glissez-déposez .json/.jsonbak/.db ou cliquez pour choisir</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Archived Profiles */}
        <AnimatePresence>
          {archivedProfiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-zinc-700 pt-8 mt-8"
            >
              <h2 className="text-center text-zinc-400 text-sm font-semibold mb-6">Archived Profiles</h2>
              <div className="flex flex-wrap justify-center gap-6">
                {archivedProfiles.map(profile => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="w-24 h-24 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-3xl border-2 border-dashed border-zinc-700 group-hover:border-zinc-500 transition-colors opacity-60 group-hover:opacity-100 overflow-hidden">
                      {profile.logo ? (
                        <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        profile.avatar
                      )}
                    </div>
                    <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      {profile.name}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        onClick={() => handleRestoreProfile(profile.id)}
                        className="bg-indigo-500/80 hover:bg-indigo-600 text-white rounded-full p-1.5 text-xs transition-colors"
                        title="Restore profile"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        onClick={() => setPermanentDeleteConfirmId(profile.id)}
                        className="bg-red-600/80 hover:bg-red-700 text-white rounded-full p-1.5 text-xs transition-colors"
                        title="Permanently delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Import Backup Modal */}
        {showImportModal && importFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-xl border border-zinc-700">
                <h3 className="text-lg font-semibold text-white mb-1">Importer des données</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Fichier sélectionné : <strong className="text-zinc-300">{importFile.name}</strong>
                </p>

                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">Cible d'import</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImportTarget('profile')}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${importTarget === 'profile' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-900 text-zinc-300 border-zinc-600 hover:border-zinc-500'}`}
                    >
                      Profil uniquement
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportTarget('full')}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${importTarget === 'full' ? 'bg-amber-600 text-white border-amber-500' : 'bg-zinc-900 text-zinc-300 border-zinc-600 hover:border-zinc-500'}`}
                    >
                      Application complète
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mb-4">
                  Type détecté : <strong>{importKind.toUpperCase()}</strong>
                </p>

                {importKind === 'json' && importFile.name.toLowerCase().endsWith('.jsonbak') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Mot de passe de déchiffrement</label>
                    <input
                      type="password"
                      value={importPassword}
                      onChange={e => setImportPassword(e.target.value)}
                      placeholder="Mot de passe..."
                      className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
                      autoFocus
                    />
                  </div>
                )}

                {importMessage && (
                  <p className={`text-sm mb-3 ${ importMessage.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {importMessage.text}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowImportModal(false); setImportFile(null); setImportPassword(''); }}
                    disabled={isImporting}
                    className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting || (importKind === 'json' && importFile.name.toLowerCase().endsWith('.jsonbak') && !importPassword)}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isImporting ? (
                      <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Importation...</>
                    ) : (
                      'Importer'
                    )}
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* Permanent Delete Confirmation Modal */}
        <AnimatePresence>
          {permanentDeleteConfirmId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-800 rounded-xl p-6 max-w-sm shadow-xl border border-zinc-700"
              >
                <h3 className="text-lg font-semibold text-white mb-2">Permanently delete profile?</h3>
                <p className="text-zinc-400 mb-6">
                  This will permanently delete <strong>{archivedProfiles.find(p => p.id === permanentDeleteConfirmId)?.name}</strong> and all associated data. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPermanentDeleteConfirmId(null)}
                    className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (permanentDeleteConfirmId) {
                        handlePermanentDeleteProfile(permanentDeleteConfirmId);
                      }
                    }}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Archive Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-800 rounded-xl p-6 max-w-sm shadow-xl border border-zinc-700"
              >
                <h3 className="text-lg font-semibold text-white mb-2">Archive profile?</h3>
                <p className="text-zinc-400 mb-6">
                  This will move <strong>{activeProfiles.find(p => p.id === deleteConfirmId)?.name}</strong> to archived profiles. You can restore it later.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleArchiveProfile(deleteConfirmId)}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Archive
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {editingProfileId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-800 rounded-xl p-6 max-w-sm shadow-xl border border-zinc-700 w-full"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Edit Profile</h3>
                
                <div className="space-y-4">
                  {/* Avatar Selection */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Avatar Emoji</label>
                    <div className="flex gap-2">
                      {['👤', '👩‍💻', '👨‍🚀', '🦊', '🤖'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditAvatar(emoji)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${editAvatar === emoji ? 'bg-indigo-500 scale-110' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Profile Name */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Profile Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      placeholder="Profile name"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Company Logo (URL or Upload)</label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={logoInputValue}
                        onChange={e => {
                          setLogoInputValue(e.target.value);
                          setEditLogo(e.target.value);
                        }}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
                      />
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            handleLogoFileUpload(e);
                            setLogoInputValue('');
                          }}
                          className="hidden"
                        />
                        <span className="inline-block w-full text-center px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors cursor-pointer text-sm">
                          Upload Image
                        </span>
                      </label>
                      {editLogo && (
                        <div className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-700">
                          <img src={editLogo} alt="Logo preview" className="w-8 h-8 rounded object-cover" />
                          <span className="text-xs text-zinc-400 flex-1 truncate">Logo loaded</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditLogo('');
                              setLogoInputValue('');
                            }}
                            className="text-red-500 hover:text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditingProfileId(null)}
                    className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(editingProfileId)}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}


