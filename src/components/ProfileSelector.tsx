import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile } from '../types';
import { Plus, Trash2, RotateCcw, Edit2 } from 'lucide-react';

interface Props {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onCreateProfile: (profile: Profile) => void;
  onDeleteProfile?: (profileId: number) => Promise<void>;
  onRestoreProfile?: (profileId: number) => Promise<void>;
}

export default function ProfileSelector({ profiles, onSelect, onCreateProfile, onDeleteProfile, onRestoreProfile }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [createLogo, setCreateLogo] = useState('');
  const [createLogoUrl, setCreateLogoUrl] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [permanentDeleteConfirmId, setPermanentDeleteConfirmId] = useState<number | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [logoInputValue, setLogoInputValue] = useState('');

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
    if (!name.trim()) return;
    
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, color_theme: 'blue', logo: createLogo || null })
      });
      
      if (!res.ok) {
        console.error('Failed to create profile');
        return;
      }
      
      const newProfile = await res.json();
      onCreateProfile(newProfile);
      onSelect(newProfile);
      setIsCreating(false);
      setName('');
      setAvatar('👤');
      setCreateLogo('');
      setCreateLogoUrl('');
    } catch (error) {
      console.error('Error creating profile:', error);
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
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Refresh profiles list
        const profilesRes = await fetch('/api/profiles');
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
      const response = await fetch(`/api/profiles/${profileId}`, {
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
        const profilesRes = await fetch('/api/profiles');
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

  const activeProfiles = profiles.filter(p => !p.is_archived);
  const archivedProfiles = profiles.filter(p => p.is_archived);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl w-full"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Who's working today?</h1>
          <p className="text-zinc-400">Select your profile to continue</p>
        </div>

        {/* Active Profiles */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {activeProfiles.map(profile => (
            <motion.div
              key={profile.id}
              className="flex flex-col items-center gap-4 group"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(profile)}
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
              </motion.button>
              
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
                onChange={e => setName(e.target.value)}
                placeholder="Your Name"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-full"
                autoFocus
              />
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
                  setIsCreating(false);
                  setName('');
                  setAvatar('👤');
                  setCreateLogo('');
                  setCreateLogoUrl('');
                }} className="flex-1 py-2 text-zinc-400 hover:text-white">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Create</button>
              </div>
            </motion.form>
          )}
        </div>

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
