import { useState } from 'react';
import { Profile, ViewMode, Category, Affaire } from '../types';
import { LayoutList, LayoutGrid, Calendar, BarChart2, LogOut, Settings, Archive, Trash2, Briefcase, DatabaseBackup, Plus, Check, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  profile: Profile;
  stats: { completedToday: number; pomodorosToday: number };
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  categories: Category[];
  affaires: Affaire[];
  onSwitchProfile: () => void;
  onSettings?: () => void;
  onSelectAffaire?: (affaireId: number) => void;
  onSelectCategory?: (categoryId: number) => void;
  onAddCategory?: (name: string, color: string) => Promise<void>;
  customLabels?: Record<string, string>;
  onOpenChat?: () => void;
  className?: string;
}

export default function Sidebar({ profile, stats, viewMode, setViewMode, categories, affaires, onSwitchProfile, onSettings, onSelectAffaire, onSelectCategory, onAddCategory, customLabels, onOpenChat, className = '' }: Props) {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsAddingCategory(true);
    try {
      await onAddCategory?.(newCategoryName, newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('#6366f1');
      setShowAddCategory(false);
    } finally {
      setIsAddingCategory(false);
    }
  };

  const defaultLabels: Record<string, string> = {
    'affaires': 'Affaires',
    'archives': 'Archives',
    'corbeille': 'Corbeille',
    'categories': 'Catégories',
    'sauvegardes': 'Sauvegardes',
    'tableau_bord': 'Tableau de bord',
    'vue_liste': 'Vue Liste',
    'tableau_kanban': 'Tableau Kanban',
    'calendrier': 'Calendrier',
    'parametres': 'Paramètres',
  };

  const getLabel = (key: string, defaultLabel: string): string => {
    return customLabels?.[key] || defaultLabel;
  };

  const navItems = [
    { id: 'list', label: 'Vue Liste', key: 'vue_liste', icon: LayoutList },
    { id: 'kanban', label: 'Tableau Kanban', key: 'tableau_kanban', icon: LayoutGrid },
    { id: 'calendar', label: 'Calendrier', key: 'calendrier', icon: Calendar },
    { id: 'stats', label: 'Tableau de bord', key: 'tableau_bord', icon: BarChart2 },
    { id: 'affaires', label: 'Affaires', key: 'affaires', icon: Briefcase },
    { id: 'archive', label: 'Archives', key: 'archives', icon: Archive },
    { id: 'trash', label: 'Corbeille', key: 'corbeille', icon: Trash2 },
    { id: 'backups', label: 'Sauvegardes', key: 'sauvegardes', icon: DatabaseBackup },
  ] as const;

  return (
    <aside id="sidebar-content" className={`w-64 text-zinc-300 flex flex-col shrink-0 border-r border-zinc-800 shadow-[4px_0_24px_rgba(0,0,0,0.2)] relative z-20 transition-all duration-250 ease-in-out ${className}`}>
      <div className="p-6 flex items-center gap-4 border-b border-zinc-800">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl shadow-inner border border-zinc-700 overflow-hidden">
          {profile.logo ? (
            <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            profile.avatar
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white truncate">{profile.name}</h2>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Vues</div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = viewMode === item.id;
          const displayLabel = getLabel(item.key, item.label);
          return (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative group ${isActive ? 'text-white bg-zinc-800' : 'hover:bg-zinc-800/50 hover:text-white'}`}
            >
              <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-indigo-400'}`} />
              <span className="font-medium text-sm">{displayLabel}</span>
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}

        <div className="mt-8 mb-3 px-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{getLabel('categories', 'Catégories')}</div>
          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            title="Ajouter une catégorie"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {showAddCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 px-3 bg-zinc-800/30 rounded-lg p-3 mb-3"
            >
              <div>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nom de la catégorie"
                  className="w-full px-2 py-1.5 text-sm bg-zinc-700 text-white placeholder:text-zinc-500 rounded border border-zinc-600 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCategory();
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400">Couleur:</label>
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-600 cursor-pointer"
                  title="Sélectionner une couleur"
                />
                <div
                  className="w-4 h-4 rounded-full border border-zinc-600"
                  style={{ backgroundColor: newCategoryColor }}
                  title="Aperçu de la couleur"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim() || isAddingCategory}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-600 disabled:cursor-not-allowed rounded transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Ajouter
                </button>
                <button
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryName('');
                    setNewCategoryColor('#6366f1');
                  }}
                  disabled={isAddingCategory}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-zinc-300 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Annuler
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {categories.map(category => (
          <motion.button
            key={category.id}
            layout
            onClick={() => onSelectCategory?.(category.id)}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_0_rgba(0,0,0,0)] group-hover:shadow-[0_0_8px_var(--tw-shadow-color)] transition-shadow duration-300" style={{ backgroundColor: category.color, '--tw-shadow-color': category.color } as any} />
            <span className="font-medium text-sm text-zinc-400 group-hover:text-zinc-300 truncate">{category.name}</span>
          </motion.button>
        ))}

        <div className="mt-8 mb-3 px-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{getLabel('affaires', 'Affaires')}</div>
        </div>
        {affaires.map(affaire => (
          <button
            key={affaire.id}
            onClick={() => onSelectAffaire?.(affaire.id)}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_0_rgba(0,0,0,0)] group-hover:shadow-[0_0_8px_var(--tw-shadow-color)] transition-shadow duration-300" style={{ backgroundColor: affaire.color, '--tw-shadow-color': affaire.color } as any} />
            <span className="font-medium text-sm text-zinc-400 group-hover:text-zinc-300 truncate">
              {affaire.number} - {affaire.name}
            </span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-1">
        <button 
          onClick={onOpenChat}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Discussion</span>
        </button>
        <button 
          onClick={onSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium text-sm">{getLabel('parametres', 'Paramètres')}</span>
        </button>
        <button 
          onClick={onSwitchProfile}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Changer de profil</span>
        </button>
      </div>
    </aside>
  );
}


