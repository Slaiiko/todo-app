/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile, Task, Category, Affaire, ViewMode, Appointment } from './types';
import Sidebar from './components/Sidebar';
import ProfileSelector from './components/ProfileSelector';
import TaskList from './components/TaskList';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import ArchiveView from './components/ArchiveView';
import RecycleBin from './components/RecycleBin';
import FocusMode from './components/FocusMode';
import TaskDetailModal from './components/TaskDetailModal';
import AppointmentModal from './components/AppointmentModal';
import AffairesView from './components/AffairesView';

// Helper to support both local and remote backend
const getAPIUrl = (endpoint: string) => {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api${endpoint}`;
};
import SettingsView from './components/SettingsView';
import { Plus, AlertCircle, X, CheckCircle2, Clock, Calendar } from 'lucide-react';

import BackupManager from './components/BackupManager';

// Color utility functions
function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHSL(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRGB(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const rgb = hexToRGB(hex);
  return rgbToHSL(rgb.r, rgb.g, rgb.b);
}

function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRGB(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// Get the actual computed text color from the document
function getActualTextColor(): string {
  const textElements = document.querySelectorAll('body, p, span, div, h1, h2, h3, a');
  let colors: string[] = [];

  for (let i = 0; i < Math.min(10, textElements.length); i++) {
    const element = textElements[i] as HTMLElement;
    const computedStyle = window.getComputedStyle(element);
    const color = computedStyle.color;
    
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      colors.push(rgbToHex(r, g, b));
    }
  }

  return colors.length > 0 ? colors[0] : '#000000';
}

// Adapt color by luminosity
function adaptColorByLuminosity(selectedColor: string, referenceColor: string): string {
  const selectedHSL = hexToHSL(selectedColor);
  const referenceHSL = hexToHSL(referenceColor);
  
  return hslToHex(selectedHSL.h, selectedHSL.s, referenceHSL.l);
}

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [trashedTasks, setTrashedTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [affaires, setAffaires] = useState<Affaire[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [stats, setStats] = useState({ completedToday: 0, pomodorosToday: 0 });
  const [alerts, setAlerts] = useState<Array<{ id: string; taskId: number; taskTitle: string; subtaskId?: number; subtaskTitle?: string; timestamp: number }>>([]);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [overdueAlerts, setOverdueAlerts] = useState<Array<{ id: number; title: string }>>([]);
  const [showOverdueAlert, setShowOverdueAlert] = useState(false);
  const [validationModal, setValidationModal] = useState({ isOpen: false, taskId: 0, subtaskId: undefined as number | undefined, taskTitle: '' });
  const [timeSpent, setTimeSpent] = useState(0);
  const [validationOption, setValidationOption] = useState<'cumulated' | 'custom' | 'none'>('none');
  const [selectedAffaireFilter, setSelectedAffaireFilter] = useState<number | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);

  // Appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Track if we've already checked for overdue tasks on startup
  const hasCheckedOverdueStartup = useRef(false);

  // Calculate cumulative time from subtasks
  const getCumulativeSubtaskTime = (taskId: number): number => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return 0;
    return task.subtasks.reduce((total, subtask) => {
      return total + (subtask.time_spent ? Number(subtask.time_spent) : 0);
    }, 0);
  };

  // Check for overdue tasks and auto-update priority
  const checkAndUpdateOverdueeTasks = async (taskList: Task[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueTasks = taskList.filter(task => 
      !task.is_complete && 
      task.due_date && 
      new Date(task.due_date) < today
    );

    if (overdueTasks.length > 0) {
      setOverdueAlerts(overdueTasks.map(t => ({ id: t.id, title: t.title })));
      setShowOverdueAlert(true);

      // Auto-update priority to Urgent for overdue tasks
      for (const task of overdueTasks) {
        if (task.priority !== 'Urgent') {
          try {
            await fetch(`/api/tasks/${task.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...task, priority: 'Urgent' })
            });
          } catch (error) {
            console.error('Failed to update task priority:', error);
          }
        }
      }
    }
  };

  // Fetch profiles on load
  useEffect(() => {
    fetch(getAPIUrl('/profiles'))
      .then(res => res.json())
      .then(data => {
        setProfiles(data);
        if (data.length > 0) {
          setActiveProfile(data[0]);
        }
      });
  }, []);

  // Listen for profile updates (from ProfileSelector modal)
  useEffect(() => {
    const handleProfilesUpdated = (event: any) => {
      const updatedProfiles = event.detail;
      setProfiles(updatedProfiles);
      // Update active profile if it was edited
      if (activeProfile) {
        const updatedProfile = updatedProfiles.find((p: Profile) => p.id === activeProfile.id);
        if (updatedProfile) {
          setActiveProfile(updatedProfile);
        }
      }
    };

    window.addEventListener('profilesUpdated', handleProfilesUpdated);
    return () => window.removeEventListener('profilesUpdated', handleProfilesUpdated);
  }, [activeProfile]);

  // Fetch data when profile changes
  useEffect(() => {
    if (activeProfile) {
      hasCheckedOverdueStartup.current = false; // Reset check flag for new profile
      fetchData();
    }
  }, [activeProfile]);

  // Apply theme when profile changes or when navigating between views
  useEffect(() => {
    if (activeProfile?.app_background_theme) {
      applyTheme(activeProfile.app_background_theme);
    }
  }, [activeProfile?.app_background_theme, activeProfile?.custom_background_image, viewMode]);

  // Apply font when profile changes
  useEffect(() => {
    if (activeProfile?.font_family) {
      applyFont(activeProfile.font_family);
    } else {
      applyFont('system-ui');
    }
  }, [activeProfile?.font_family]);

  // Apply text color when profile changes
  useEffect(() => {
    if (activeProfile?.text_color) {
      applyTextColor(activeProfile.text_color);
    } else {
      // Default to a dark gray that adapts to the color system
      applyTextColor('#1f2937');
    }
  }, [activeProfile?.text_color]);

  // Check for overdue tasks only once when tasks first load
  useEffect(() => {
    if (tasks.length > 0 && !hasCheckedOverdueStartup.current) {
      hasCheckedOverdueStartup.current = true;
      checkAndUpdateOverdueeTasks(tasks);
    }
  }, [activeProfile?.id]);

  const applyTheme = (themeId: string) => {
    const THEMES: Record<string, { gradient: string; darkGradient: string; veryDarkGradient: string; name: string }> = {
      'theme-1': { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', darkGradient: 'linear-gradient(135deg, #2d3557 0%, #39253d 100%)', veryDarkGradient: 'linear-gradient(135deg, #151d2b 0%, #1d121e 100%)', name: 'Bleu Ciel' },
      'theme-2': { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', darkGradient: 'linear-gradient(135deg, #6b3a72 0%, #751829 100%)', veryDarkGradient: 'linear-gradient(135deg, #381d3c 0%, #3d0d14 100%)', name: 'Rose Passion' },
      'theme-3': { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', darkGradient: 'linear-gradient(135deg, #1a5a98 0%, #005f77 100%)', veryDarkGradient: 'linear-gradient(135deg, #0d2d4c 0%, #002f3b 100%)', name: 'Vert Émeraude' },
      'theme-4': { gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', darkGradient: 'linear-gradient(135deg, #0d1f3c 0%, #131f4a 100%)', veryDarkGradient: 'linear-gradient(135deg, #060f1e 0%, #0a0f25 100%)', name: 'Océan Profond' },
      'theme-5': { gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)', darkGradient: 'linear-gradient(135deg, #994d5a 0%, #4d7f99 100%)', veryDarkGradient: 'linear-gradient(135deg, #4d262d 0%, #263f4c 100%)', name: 'Coucher Soleil' },
      'theme-6': { gradient: 'linear-gradient(135deg, #2d0a4e 0%, #93329e 100%)', darkGradient: 'linear-gradient(135deg, #150327 0%, #4a1a52 100%)', veryDarkGradient: 'linear-gradient(135deg, #0a0113 0%, #250d29 100%)', name: 'Nuit Mystique' },
      'theme-8': { gradient: 'linear-gradient(135deg, #fdc830 0%, #f37335 100%)', darkGradient: 'linear-gradient(135deg, #9d6b1a 0%, #8b3a1a 100%)', veryDarkGradient: 'linear-gradient(135deg, #4d350d 0%, #451d0d 100%)', name: 'Or Lumineux' },
      'theme-9': { gradient: 'linear-gradient(135deg, #8b4513 0%, #d2b48c 100%)', darkGradient: 'linear-gradient(135deg, #4a2408 0%, #6b5840 100%)', veryDarkGradient: 'linear-gradient(135deg, #251204 0%, #352c20 100%)', name: 'Terre Chaude' },
      'theme-10': { gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)', darkGradient: 'linear-gradient(135deg, #050403 0%, #15120f 100%)', veryDarkGradient: 'linear-gradient(135deg, #020201 0%, #0a0907 100%)', name: 'Élégance Noire' },
    };

    const theme = THEMES[themeId] || THEMES['theme-1'];
    const customImage = activeProfile?.custom_background_image;
    const overlayGradient = 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.8) 100%)';
    const overlayGradientDarker = 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.9) 100%)';
    
    if (themeId === 'theme-custom' && customImage) {
      // Apply custom image to entire app container (covers everything including sidebar)
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        appContainer.style.cssText = `background-image: url(${customImage}) !important; background-attachment: fixed !important; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important;`;
      }
      
      // Remove gradient from main-content since image is on container
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.style.cssText = `background: transparent !important;`;
      }
      
      // Apply overlay to header
      const header = document.getElementById('header-content');
      if (header) {
        header.style.cssText = `background: ${overlayGradient} !important; background-attachment: fixed !important; color: white !important;`;
      }
      
      // Apply darker overlay to sidebar (50% more dark)
      const sidebar = document.getElementById('sidebar-content');
      if (sidebar) {
        sidebar.style.cssText = `background: ${overlayGradientDarker} !important; background-attachment: fixed !important;`;
      }
    } else {
      // Use theme gradients
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        appContainer.style.cssText = `background: transparent !important;`;
      }
      
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.style.cssText = `background: ${theme.gradient}; background-attachment: fixed; !important;`;
      }
      
      const header = document.getElementById('header-content');
      if (header) {
        header.style.cssText = `background: ${theme.darkGradient}; background-attachment: fixed; color: white; !important;`;
      }
      
      const sidebar = document.getElementById('sidebar-content');
      if (sidebar) {
        sidebar.style.cssText = `background: ${theme.veryDarkGradient}; background-attachment: fixed; !important;`;
      }
    }
  };

  const applyFont = (fontFamily: string) => {
    // Map font IDs to CSS font-family values
    const fontMap: Record<string, string> = {
      // System & Default
      'system-ui': 'system-ui',
      // Sans-Serif Modern
      'segoe-ui': "'Segoe UI', sans-serif",
      'roboto': "'Roboto', sans-serif",
      'arial': 'Arial, sans-serif',
      'helvetica': 'Helvetica, sans-serif',
      'trebuchet': "'Trebuchet MS', sans-serif",
      'verdana': 'Verdana, sans-serif',
      'open-sans': "'Open Sans', sans-serif",
      'inter': "'Inter', sans-serif",
      'poppins': "'Poppins', sans-serif",
      'montserrat': "'Montserrat', sans-serif",
      'lato': "'Lato', sans-serif",
      'raleway': "'Raleway', sans-serif",
      'ubuntu': "'Ubuntu', sans-serif",
      'proxima-nova': "'Proxima Nova', sans-serif",
      'source-sans': "'Source Sans Pro', sans-serif",
      'work-sans': "'Work Sans', sans-serif",
      'nunito': "'Nunito', sans-serif",
      'quicksand': "'Quicksand', sans-serif",
      'mulish': "'Mulish', sans-serif",
      // Sans-Serif Artistic
      'comfortaa': "'Comfortaa', sans-serif",
      'fredoka': "'Fredoka', sans-serif",
      'cabin': "'Cabin', sans-serif",
      'play': "'Play', sans-serif",
      // Serif Fonts
      'georgia': 'Georgia, serif',
      'times-new-roman': "'Times New Roman', serif",
      'garamond': 'Garamond, serif',
      'palatino': "'Palatino Linotype', serif",
      'didot': 'Didot, serif',
      'book-antiqua': "'Book Antiqua', serif",
      'cambria': 'Cambria, serif',
      'gentium': "'Gentium Book Basic', serif",
      'lora': "'Lora', serif",
      'playfair': "'Playfair Display', serif",
      'cormorant': "'Cormorant', serif",
      'merriweather': "'Merriweather', serif",
      // Monospace Fonts
      'courier-new': "'Courier New', monospace",
      'consolas': 'Consolas, monospace',
      'monaco': 'Monaco, monospace',
      'inconsolata': "'Inconsolata', monospace",
      'source-code': "'Source Code Pro', monospace",
      'fira-code': "'Fira Code', monospace",
      'roboto-mono': "'Roboto Mono', monospace",
      'ibm-plex': "'IBM Plex Mono', monospace",
      'code-new': "'Courier Code', monospace",
      // Handwriting & Display
      'comic-sans': "'Comic Sans MS', cursive",
      'impact': 'Impact, fantasy',
      'brush-script': "'Brush Script MT', cursive",
      'lucida-handwriting': "'Lucida Handwriting', cursive",
      'caveat': "'Caveat', cursive",
      'pacifico': "'Pacifico', cursive",
      'great-vibes': "'Great Vibes', cursive",
      'dancing-script': "'Dancing Script', cursive",
      // Display & Headlines
      'bebas': "'Bebas Neue', sans-serif",
      'oswald': "'Oswald', sans-serif",
      'anton': "'Anton', sans-serif",
      'righteous': "'Righteous', sans-serif",
      // Modern Web Fonts
      'jet-brains': "'JetBrains Mono', monospace",
      'dosis': "'Dosis', sans-serif",
      'exo': "'Exo 2', sans-serif",
      'space-mono': "'Space Mono', monospace",
      'sora': "'Sora', sans-serif",
      'lexend': "'Lexend', sans-serif",
    };
    
    const cssFont = fontMap[fontFamily] || 'system-ui';
    
    // Remove existing font style if present
    let fontStyleElement = document.getElementById('app-font-style');
    if (fontStyleElement) {
      fontStyleElement.remove();
    }
    
    // Create a new style element with global font rule
    const style = document.createElement('style');
    style.id = 'app-font-style';
    style.textContent = `
      * {
        font-family: ${cssFont} !important;
      }
    `;
    document.head.appendChild(style);
  };

  const applyTextColor = (textColor: string) => {
    // Parse the selected color to get its HSL
    const selectedHSL = hexToHSL(textColor);
    
    // For normal text (not on white background): use BRIGHTER colors for visibility on dark theme
    // For white background text: force it to be extremely dark for readability
    
    // Normal colors - BRIGHTER for dark theme background
    const veryDarkColor = hslToHex(selectedHSL.h, selectedHSL.s, Math.max(Math.min(selectedHSL.l, 90), 60)); // 60-90% - VERY BRIGHT
    const darkColor = hslToHex(selectedHSL.h, selectedHSL.s, Math.max(Math.min(selectedHSL.l, 88), 58)); // 58-88% - VERY BRIGHT
    const semidarkColor = hslToHex(selectedHSL.h, selectedHSL.s, Math.max(Math.min(selectedHSL.l, 85), 55)); // 55-85% - VERY BRIGHT
    const normalColor = hslToHex(selectedHSL.h, selectedHSL.s, Math.max(Math.min(selectedHSL.l, 80), 50)); // 50-80% - BRIGHT
    const lightColor = hslToHex(selectedHSL.h, selectedHSL.s, Math.max(Math.min(selectedHSL.l, 75), 45)); // 45-75% - BRIGHT
    const veryLightColor = hslToHex(selectedHSL.h, selectedHSL.s, Math.max(Math.min(selectedHSL.l, 70), 40)); // 40-70% - BRIGHT
    
    // For white background text: force to pure black regardless of selected color
    const whiteBackgroundColor = '#000000'; // Pure black for maximum contrast on white backgrounds
    
    console.log('Selected color:', textColor);
    console.log('VeryDark:', veryDarkColor, 'Dark:', darkColor, 'SemiDark:', semidarkColor, 'Normal:', normalColor, 'Light:', lightColor, 'VeryLight:', veryLightColor);
    
    // Remove existing text color style if present
    let colorStyleElement = document.getElementById('app-text-color-style');
    if (colorStyleElement) {
      colorStyleElement.remove();
    }
    
    // Create comprehensive style with multiple luminosity levels
    const style = document.createElement('style');
    style.id = 'app-text-color-style';
    style.textContent = `
      /* Default text - use normal colors */
      * {
        color: ${normalColor} !important;
      }
      
      /* Labels and static text in white areas - DARK for readability */
      .bg-white label,
      .bg-white .text-sm,
      .bg-white > span,
      [class*="bg-white"] label,
      [class*="bg-white"] .text-sm,
      [class*="bg-white"] > span,
      [style*="background: white"] label,
      .modal label,
      .modal .text-sm,
      .modal > span,
      [style*="background-color: rgb(255"] label,
      [style*="background-color: rgb(255"] .text-sm,
      /* ALL text in white/modal areas */
      [class*="bg-white"] p,
      [class*="bg-white"] span,
      [class*="bg-white"] div,
      .modal p,
      .modal span,
      .modal div {
        color: #000000 !important;
      }
      
      /* Input fields and editable areas - LIGHT text */
      input,
      textarea,
      select,
      input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]),
      [type="text"],
      [type="email"],
      [type="password"],
      [type="date"],
      [type="time"],
      [type="number"],
      [type="tel"],
      [type="url"],
      .bg-white input,
      .bg-white textarea,
      .bg-white select {
        color: ${normalColor} !important;
        caret-color: ${normalColor} !important;
      }
      
      input::placeholder,
      textarea::placeholder,
      input::-webkit-input-placeholder,
      textarea::-webkit-input-placeholder {
        color: ${lightColor} !important;
        opacity: 1 !important;
      }
      
      /* Very dark elements - headings, strong text, primary content */
      strong, b, h1, h2, h3, h4, h5, h6,
      .font-bold, .font-extrabold, .font-black,
      .text-gray-900, .text-slate-900, .text-gray-950, .text-slate-950,
      button, .btn, [role="button"], a[href],
      .font-semibold {
        color: ${veryDarkColor} !important;
      }
      
      /* Dark elements - important text */
      .text-gray-800, .text-slate-800,
      .font-medium, .font-semibold {
        color: ${darkColor} !important;
      }
      
      /* Semi-dark elements - secondary content */
      .text-gray-700, .text-slate-700,
      .text-gray-600, .text-slate-600 {
        color: ${semidarkColor} !important;
      }
      
      /* Normal gray elements */
      .text-gray-500, .text-slate-500,
      .text-gray-400, .text-slate-400 {
        color: ${lightColor} !important;
      }
      
      /* Light gray elements - tertiary/subtle text */
      .text-gray-300, .text-slate-300,
      .text-gray-200, .text-slate-200,
      .opacity-50, .opacity-60, .opacity-70,
      .text-gray-100, .text-slate-100 {
        color: ${veryLightColor} !important;
      }
      
      /* Disabled/muted text */
      .text-gray-400, .disabled, [disabled],
      .opacity-40, .opacity-30 {
        color: ${veryLightColor} !important;
      }
      
      /* Make "Enregistrer" button text much darker/black */
      button[class*="bg-indigo"] {
        color: #000000 !important;
      }
      
      /* Make task title text transparent 50% */
      input[placeholder*="Titre de la tâche"] {
        opacity: 0.5 !important;
      }
      
      /* Settings View - Force ABSOLUTELY ALL text to WHITE */
      .settings-view-container {
        color: #ffffff !important;
      }
      
      /* Force white on EVERY single element */
      .settings-view-container * {
        color: #ffffff !important;
      }
      
      /* Override inline styles and computed colors */
      .settings-view-container[style] {
        color: #ffffff !important;
      }
      
      .settings-view-container *[style] {
        color: #ffffff !important;
      }
      
      /* Override all SVG text */
      .settings-view-container svg,
      .settings-view-container svg * {
        color: #ffffff !important;
        fill: #ffffff !important;
      }
      
      /* Exception: Hex color input gets the selected color */
      .settings-view-container input[placeholder="#000000"] {
        color: ${normalColor} !important;
      }
    `;
    document.head.appendChild(style);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setViewMode('backups');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Force white text in Settings View
  useEffect(() => {
    const forceWhiteTextInSettings = () => {
      const settingsContainer = document.querySelector('.settings-view-container');
      if (!settingsContainer) return;

      // Get all elements in settings
      const allElements = settingsContainer.querySelectorAll('*');
      allElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        // Skip input fields with hex color placeholder
        if (htmlEl instanceof HTMLInputElement && htmlEl.placeholder === '#000000') {
          return;
        }
        // Force white text on all elements
        htmlEl.style.color = '#ffffff';
      });
    };

    // Initial call
    forceWhiteTextInSettings();

    // Use MutationObserver to watch for new elements being added
    const observer = new MutationObserver(() => {
      forceWhiteTextInSettings();
    });

    const settingsContainer = document.querySelector('.settings-view-container');
    if (settingsContainer) {
      observer.observe(settingsContainer, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    return () => observer.disconnect();
  }, [viewMode]);

  useEffect(() => {
    const handleTaskMoved = () => {
      console.log('taskMoved event received, activeProfile:', activeProfile);
      if (activeProfile) {
        console.log('Fetching updated data...');
        fetchData();
      }
    };
    window.addEventListener('taskMoved', handleTaskMoved);
    return () => window.removeEventListener('taskMoved', handleTaskMoved);
  }, [activeProfile]);

  const handleAddAlert = (taskId: number, taskTitle: string, subtaskId?: number, subtaskTitle?: string) => {
    // Check if alert already exists for this task/subtask
    const alertExists = alerts.some(a => 
      a.taskId === taskId && a.subtaskId === subtaskId
    );
    
    if (alertExists) return; // Prevent duplicates
    
    const alertId = `${taskId}-${subtaskId || 'task'}-${Date.now()}`;
    const newAlert = {
      id: alertId,
      taskId,
      taskTitle,
      subtaskId,
      subtaskTitle,
      timestamp: Date.now()
    };
    setAlerts(prev => [...prev, newAlert]);
    setExpandedAlertId(alertId);
  };

  const handleRemoveAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleCompleteFromAlert = async (alert: { id: string; taskId: number; subtaskId?: number; taskTitle: string; subtaskTitle?: string }) => {
    // Open validation modal
    setValidationModal({
      isOpen: true,
      taskId: alert.taskId,
      subtaskId: alert.subtaskId,
      taskTitle: alert.subtaskTitle || alert.taskTitle
    });
    setTimeSpent(0);
  };

  const handleOpenValidationModal = (taskId: number, taskTitle: string, subtaskId?: number, subtaskTitle?: string) => {
    setValidationModal({
      isOpen: true,
      taskId,
      subtaskId,
      taskTitle: subtaskTitle || taskTitle
    });
    setTimeSpent(0);
    setValidationOption('none');
  };

  const handleValidateWithTime = async () => {
    try {
      console.log('🟢 handleValidateWithTime START - timeSpent:', timeSpent);
      if (validationModal.subtaskId) {
        // Complete subtask with time
        console.log('📋 Completing SUBTASK', validationModal.subtaskId, 'with time:', timeSpent);
        const response = await fetch(`/api/subtasks/${validationModal.subtaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_complete: true, time_spent: timeSpent, completed_at: new Date().toISOString() })
        });
        console.log('✅ Subtask response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        // Remove alert
        const alertId = `${validationModal.taskId}-${validationModal.subtaskId}-*`;
        setAlerts(prev => prev.filter(a => a.id !== alertId && !a.id.includes(`${validationModal.taskId}-${validationModal.subtaskId}`)));
        await fetchData();
        setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
        setTimeSpent(0);
        setValidationOption('none');
        console.log('✅ Subtask completed successfully');
      } else {
        // Complete task with time
        console.log('📝 Completing TASK', validationModal.taskId, 'with time:', timeSpent);
        const response = await fetch(`/api/tasks/${validationModal.taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_complete: true, time_spent: timeSpent, completed_at: new Date().toISOString() })
        });
        console.log('✅ Task response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        // Remove alert
        const alertId = `${validationModal.taskId}-task-*`;
        setAlerts(prev => prev.filter(a => a.id !== alertId && !a.id.includes(`${validationModal.taskId}-task`)));
        await fetchData();
        setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
        setTimeSpent(0);
        setValidationOption('none');
        console.log('✅ Task completed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to complete with time:', error);
      // Still close modal on error
      setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
      setTimeSpent(0);
      setValidationOption('none');
      alert('Erreur lors de la validation: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const handleValidateWithoutTime = async () => {
    try {
      console.log('🟢 handleValidateWithoutTime START');
      if (validationModal.subtaskId) {
        // Complete subtask without time
        console.log('📋 Completing SUBTASK', validationModal.subtaskId, 'without time');
        const response = await fetch(`/api/subtasks/${validationModal.subtaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_complete: true, completed_at: new Date().toISOString() })
        });
        console.log('✅ Subtask response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        // Remove alert
        const alertId = `${validationModal.taskId}-${validationModal.subtaskId}-*`;
        setAlerts(prev => prev.filter(a => a.id !== alertId && !a.id.includes(`${validationModal.taskId}-${validationModal.subtaskId}`)));
        await fetchData();
        setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
        setTimeSpent(0);
        setValidationOption('none');
        console.log('✅ Subtask completed successfully');
      } else {
        // Complete task without time
        console.log('📝 Completing TASK', validationModal.taskId, 'without time');
        const response = await fetch(`/api/tasks/${validationModal.taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_complete: true, completed_at: new Date().toISOString() })
        });
        console.log('✅ Task response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        // Remove alert
        const alertId = `${validationModal.taskId}-task-*`;
        setAlerts(prev => prev.filter(a => a.id !== alertId && !a.id.includes(`${validationModal.taskId}-task`)));
        await fetchData();
        setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
        setTimeSpent(0);
        setValidationOption('none');
        console.log('✅ Task completed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to complete without time:', error);
      // Still close modal on error
      setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
      setTimeSpent(0);
      setValidationOption('none');
      alert('Erreur lors de la validation: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const handleValidateWithCumulatedTime = async () => {
    try {
      console.log('🟢 handleValidateWithCumulatedTime START');
      const cumulatedTime = getCumulativeSubtaskTime(validationModal.taskId);
      console.log('📝 Completing TASK', validationModal.taskId, 'with cumulated time:', cumulatedTime);
      const response = await fetch(`/api/tasks/${validationModal.taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: true, time_spent: cumulatedTime, completed_at: new Date().toISOString() })
      });
      console.log('✅ Task response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      // Remove alert
      const alertId = `${validationModal.taskId}-task-*`;
      setAlerts(prev => prev.filter(a => a.id !== alertId && !a.id.includes(`${validationModal.taskId}-task`)));
      await fetchData();
      setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
      setTimeSpent(0);
      setValidationOption('none');
      console.log('✅ Task completed successfully with cumulated time');
    } catch (error) {
      console.error('❌ Failed to complete with cumulated time:', error);
      setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
      setTimeSpent(0);
      setValidationOption('none');
      alert('Erreur lors de la validation: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  // Auto-collapse alerts after 5 seconds
  useEffect(() => {
    if (!expandedAlertId) return;
    const timer = setTimeout(() => {
      setExpandedAlertId(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [expandedAlertId]);

  const fetchData = async () => {
    if (!activeProfile) return;
    
    const [tasksRes, archiveRes, trashRes, categoriesRes, affairesRes, statsRes, appointmentsRes] = await Promise.all([
      fetch(`/api/tasks/${activeProfile.id}`),
      fetch(`/api/tasks/${activeProfile.id}/archive`),
      fetch(`/api/tasks/${activeProfile.id}/trash`),
      fetch(`/api/categories/${activeProfile.id}`),
      fetch(`/api/affaires/${activeProfile.id}`),
      fetch(`/api/stats/${activeProfile.id}`),
      fetch(`/api/appointments/${activeProfile.id}`)
    ]);
    
    const tasksData = await tasksRes.json();
    setTasks(tasksData);
    setArchivedTasks(await archiveRes.json());
    setTrashedTasks(await trashRes.json());
    setCategories(await categoriesRes.json());
    setAffaires(await affairesRes.json());
    setStats(await statsRes.json());
    setAppointments(await appointmentsRes.json());
  };

  // Helper function to generate recurring task occurrences
  const generateRecurringTaskOccurrences = (task: Task): Task[] => {
    if (!task.recurrence_type) return [task];
    
    const occurrences: Task[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3); // 3 months ahead
    
    const startDate = task.start_date ? new Date(task.start_date) : new Date(task.due_date || today);
    startDate.setHours(0, 0, 0, 0);
    
    const taskStartDayOfWeek = startDate.getUTCDay();
    const taskStartDateOfMonth = startDate.getUTCDate();
    const taskStartMonth = startDate.getUTCMonth();
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      let shouldInclude = false;
      const dayOfWeek = currentDate.getUTCDay();
      
      // Skip weekends (0=Sunday, 6=Saturday) for daily/weekly recurrence
      if (task.recurrence_type === 'daily' || task.recurrence_type === 'weekly') {
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          continue;
        }
      }
      
      switch (task.recurrence_type) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          shouldInclude = dayOfWeek === taskStartDayOfWeek;
          break;
        case 'monthly':
          shouldInclude = currentDate.getUTCDate() === taskStartDateOfMonth;
          break;
        case 'yearly':
          shouldInclude = currentDate.getUTCMonth() === taskStartMonth && currentDate.getUTCDate() === taskStartDateOfMonth;
          break;
      }
      
      if (shouldInclude && currentDate >= startDate) {
        if (task.recurrence_end_date) {
          const recurrenceEnd = new Date(task.recurrence_end_date);
          recurrenceEnd.setHours(23, 59, 59, 999);
          if (currentDate > recurrenceEnd) {
            break;
          }
        }
        
        const dateStr = currentDate.toISOString().split('T')[0];
        occurrences.push({
          ...task,
          start_date: `${dateStr}T00:00:00.000Z`,
          due_date: `${dateStr}T00:00:00.000Z`,
          _isRecurringOccurrence: true,
          _parentTaskId: task.id,
          _occurrenceIndex: occurrences.length + 1
        });
      }
      
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return occurrences;
  };

  // Calculate recurring task count for badge display
  const calculateRecurringTaskCount = (task: Task): number => {
    if (!task.recurrence_type) return 1;
    
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);
    
    const startDate = task.start_date ? new Date(task.start_date) : new Date(task.due_date || today);
    startDate.setHours(0, 0, 0, 0);
    
    const taskStartDayOfWeek = startDate.getUTCDay();
    const taskStartDateOfMonth = startDate.getUTCDate();
    const taskStartMonth = startDate.getUTCMonth();
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      let shouldInclude = false;
      const dayOfWeek = currentDate.getUTCDay();
      
      if (task.recurrence_type === 'daily' || task.recurrence_type === 'weekly') {
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          continue;
        }
      }
      
      switch (task.recurrence_type) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          shouldInclude = dayOfWeek === taskStartDayOfWeek;
          break;
        case 'monthly':
          shouldInclude = currentDate.getUTCDate() === taskStartDateOfMonth;
          break;
        case 'yearly':
          shouldInclude = currentDate.getUTCMonth() === taskStartMonth && currentDate.getUTCDate() === taskStartDateOfMonth;
          break;
      }
      
      if (shouldInclude && currentDate >= startDate) {
        if (task.recurrence_end_date) {
          const recurrenceEnd = new Date(task.recurrence_end_date);
          recurrenceEnd.setHours(23, 59, 59, 999);
          if (currentDate > recurrenceEnd) {
            break;
          }
        }
        count++;
      }
      
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return count;
  };

  // Helper function to calculate recurring occurrences count
  const calculateRecurringCount = (apt: Appointment): number => {
    if (!apt.recurrence_type) return 1;
    
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Determine end date for calculation
    let endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3); // 3 months ahead
    
    if (apt.recurrence_end_date) {
      const recurrenceEnd = new Date(apt.recurrence_end_date);
      recurrenceEnd.setHours(0, 0, 0, 0);
      if (recurrenceEnd < endDate) {
        endDate = recurrenceEnd;
      }
    }
    
    const startTime = new Date(apt.start_time);
    const aptStartDayOfWeek = startTime.getUTCDay();
    const aptStartDateOfMonth = startTime.getUTCDate();
    const aptStartMonth = startTime.getUTCMonth();
    
    let currentDate = new Date(apt.start_time);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDate) {
      let shouldInclude = false;
      const dayOfWeek = currentDate.getUTCDay();
      
      // Skip weekends (0=Sunday, 6=Saturday) for daily/weekly recurrence
      if (apt.recurrence_type === 'daily' || apt.recurrence_type === 'weekly') {
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
      }
      
      switch (apt.recurrence_type) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          shouldInclude = dayOfWeek === aptStartDayOfWeek;
          break;
        case 'monthly':
          shouldInclude = currentDate.getUTCDate() === aptStartDateOfMonth;
          break;
        case 'yearly':
          shouldInclude = currentDate.getUTCMonth() === aptStartMonth && currentDate.getUTCDate() === aptStartDateOfMonth;
          break;
      }
      
      if (shouldInclude && currentDate >= today) {
        count++;
      }
      
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return count;
  };

  // Generate recurring appointment occurrences (3 months ahead) for calendar display
  const generateRecurringOccurrences = (apt: Appointment): Appointment[] => {
    if (!apt.recurrence_type) return [apt];
    
    const occurrences: Appointment[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);
    
    const startTime = new Date(apt.start_time);
    const endTime = new Date(apt.end_time);
    const startHour = String(startTime.getHours()).padStart(2, '0');
    const startMinute = String(startTime.getMinutes()).padStart(2, '0');
    const endHour = String(endTime.getHours()).padStart(2, '0');
    const endMinute = String(endTime.getMinutes()).padStart(2, '0');
    
    const aptStartDayOfWeek = startTime.getUTCDay();
    const aptStartDateOfMonth = startTime.getUTCDate();
    const aptStartMonth = startTime.getUTCMonth();
    
    let currentDate = new Date(apt.start_time);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDate) {
      let shouldInclude = false;
      const dayOfWeek = currentDate.getUTCDay();
      
      // Skip weekends (0=Sunday, 6=Saturday) for daily/weekly recurrence
      if (apt.recurrence_type === 'daily' || apt.recurrence_type === 'weekly') {
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          continue;
        }
      }
      
      switch (apt.recurrence_type) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          shouldInclude = dayOfWeek === aptStartDayOfWeek;
          break;
        case 'monthly':
          shouldInclude = currentDate.getUTCDate() === aptStartDateOfMonth;
          break;
        case 'yearly':
          shouldInclude = currentDate.getUTCMonth() === aptStartMonth && currentDate.getUTCDate() === aptStartDateOfMonth;
          break;
      }
      
      if (shouldInclude && currentDate >= today) {
        if (apt.recurrence_end_date) {
          const recurrenceEnd = new Date(apt.recurrence_end_date);
          recurrenceEnd.setHours(23, 59, 59, 999);
          if (currentDate > recurrenceEnd) {
            break;
          }
        }
        
        const dateStr = currentDate.toISOString().split('T')[0];
        occurrences.push({
          ...apt,
          start_time: `${dateStr}T${startHour}:${startMinute}:00`,
          end_time: `${dateStr}T${endHour}:${endMinute}:00`
        } as Appointment);
      }
      
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return occurrences;
  };

  // Convert recurring appointments to pseudo-tasks for display in the list
  const getDisplayedTasks = (): (Task & { _isAppointment?: boolean; _appointmentId?: number; _upcomingAppointment?: boolean; _occurrenceCount?: number })[] => {
    let taskList = [...tasks].map(task => {
      // Add occurrence count for recurring tasks
      if (task.recurrence_type) {
        return {
          ...task,
          _occurrenceCount: calculateRecurringTaskCount(task)
        };
      }
      return task;
    });
    
    // Check if an appointment is currently active (specific time range for today)
    const isAppointmentActive = (apt: Appointment): boolean => {
      const now = new Date();
      const startTime = new Date(apt.start_time);
      const endTime = new Date(apt.end_time);
      
      // Check if current time is within the appointment's time range
      return now >= startTime && now < endTime;
    };
    
    // Add all appointments as pseudo-tasks (ONE per appointment for list view)
    const appointmentEntries = appointments.map(apt => {
      const isActive = isAppointmentActive(apt);
      const occurrenceCount = calculateRecurringCount(apt);
      
      return {
        id: -apt.id, // Negative ID to distinguish from real tasks
        profile_id: apt.profile_id,
        title: apt.title,
        description_md: apt.description || '',
        start_date: apt.start_time?.split('T')[0] || null,
        due_date: apt.end_time?.split('T')[0] || null,
        priority: 'Medium' as const,
        category_id: null,
        affaire_id: apt.affaire_id || null,
        is_complete: false,
        kanban_column: 'To Do',
        order_index: 0,
        subtasks: [],
        category_name: isActive ? 'À faire (Rendez-vous en cours)' : 'Rendez-vous à venir',
        category_color: isActive ? '#10b981' : '#f59e0b',
        _isAppointment: true,
        _appointmentId: apt.id,
        _occurrenceCount: occurrenceCount
      };
    });
    
    return [...taskList, ...appointmentEntries] as any[];
  };

  // Get tasks with recurring appointments expanded for calendar view
  const getCalendarTasks = (): (Task & { _isAppointment?: boolean; _appointmentId?: number })[] => {
    let taskList = [...tasks].flatMap(task => {
      // Expand recurring tasks to all occurrences for calendar view
      if (task.recurrence_type) {
        return generateRecurringTaskOccurrences(task);
      }
      return [task];
    });
    
    // Check if an appointment is currently active (specific time range for today)
    const isAppointmentActive = (apt: Appointment): boolean => {
      const now = new Date();
      const startTime = new Date(apt.start_time);
      const endTime = new Date(apt.end_time);
      
      // Check if current time is within the appointment's time range
      return now >= startTime && now < endTime;
    };
    
    // Helper to extract time from ISO datetime string (HH:mm format)
    const extractTimeFromISO = (isoString: string | null): string | null => {
      if (!isoString) return null;
      const match = isoString.match(/T(\d{2}):(\d{2})/);
      return match ? `${match[1]}:${match[2]}` : null;
    };
    
    // Add all appointment occurrences as pseudo-tasks for calendar
    const appointmentEntries = appointments.flatMap(apt => {
      // Generate occurrences for recurring appointments
      const occurrences = generateRecurringOccurrences(apt);
      
      return occurrences.map(occurrence => {
        const isActive = isAppointmentActive(occurrence);
        const startTimeStr = extractTimeFromISO(occurrence.start_time);
        const endTimeStr = extractTimeFromISO(occurrence.end_time);
        
        return {
          id: -occurrence.id,
          profile_id: occurrence.profile_id,
          title: occurrence.title,
          description_md: occurrence.description || '',
          start_date: occurrence.start_time?.split('T')[0] || null,
          due_date: occurrence.end_time?.split('T')[0] || null,
          start_time: startTimeStr,
          end_time: endTimeStr,
          priority: 'Medium' as const,
          category_id: null,
          affaire_id: occurrence.affaire_id || null,
          is_complete: false,
          kanban_column: 'To Do',
          order_index: 0,
          subtasks: [],
          category_name: isActive ? 'À faire (Rendez-vous en cours)' : 'Rendez-vous à venir',
          category_color: isActive ? '#10b981' : '#f59e0b',
          _isAppointment: true,
          _appointmentId: apt.id
        };
      });
    });
    
    return [...taskList, ...appointmentEntries] as any[];
  };

  const handleTaskSave = async (data: { task: Partial<Task>; subtasks: any[]; assignees: any[] }) => {
    try {
      console.log('🟢 handleTaskSave STARTED with data:', data);
      
      // CHECK: Ensure activeProfile exists
      if (!activeProfile) {
        console.error('❌ NO ACTIVE PROFILE - Cannot save task');
        throw new Error('Aucun profil actif');
      }
      console.log('✅ Active profile found:', activeProfile.id);
      
      let taskId = data.task.id;
      
      // STEP 1: Create or update task
      if (data.task.id) {
        console.log('📝 Updating existing task ID:', data.task.id);
        const response = await fetch(`/api/tasks/${data.task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.task)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        console.log('✅ Task updated successfully');
      } else {
        console.log('🆕 Creating new task with profile_id:', activeProfile.id);
        const taskPayload = { ...data.task, profile_id: activeProfile.id };
        
        const response = await fetch(getAPIUrl('/tasks'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskPayload)
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }
        const newTask = await response.json();
        console.log('✅ Task created with ID:', newTask.id);
        taskId = newTask.id;
      }

      // STEP 2: Save any new subtasks
      console.log('📋 Processing subtasks:', data.subtasks.length);
      for (const subtask of data.subtasks) {
        if (!subtask.id || subtask.id < 0) {
          console.log('  → Saving new subtask:', subtask.title);
          try {
            const res = await fetch(getAPIUrl('/subtasks'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task_id: taskId,
                title: subtask.title,
                assignee_id: subtask.assignee_id || null
              })
            });
            if (!res.ok) throw new Error(`Subtask HTTP ${res.status}`);
            console.log('    ✅ Subtask saved');
          } catch (e) {
            console.error('    ❌ Could not save subtask:', e);
          }
        }
      }

      // STEP 3: Save any new assignees
      console.log('👥 Processing assignees:', data.assignees.length);
      for (const assignee of data.assignees) {
        if (!assignee.id || assignee.id < 0) {
          console.log('  → Saving new assignee:', assignee.assignee_name);
          try {
            const res = await fetch(getAPIUrl('/task-assignees'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task_id: taskId,
                assignee_name: assignee.assignee_name,
                assignee_avatar: assignee.assignee_avatar
              })
            });
            if (!res.ok) throw new Error(`Assignee HTTP ${res.status}`);
            console.log('    ✅ Assignee saved');
          } catch (e) {
            console.error('    ❌ Could not save assignee:', e);
          }
        }
      }

      console.log('📚 Fetching updated data...');
      await fetchData();
      console.log('✅ Data fetched successfully');
      
      console.log('🔴 Closing modal and resetting...');
      setIsTaskModalOpen(false);
      setSelectedTask(null);
      console.log('✅ ALL DONE - Task saved successfully!');
      
      return { success: true };
    } catch (error) {
      console.error('❌ CRITICAL ERROR in handleTaskSave:', error);
      throw error; // Propagate error to handleSave
    }
  };

  const handleTaskDelete = async (id: number) => {
    try {
      // Handle appointment deletion (negative IDs)
      if (id < 0) {
        const appointmentId = -id;
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous récurrent?')) {
          return;
        }
        const response = await fetch(`/api/appointments/${appointmentId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
      } else {
        // Handle task deletion
        const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
      }
      await fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleTaskDuplicate = async (taskId: number) => {
    try {
      // Get the task to duplicate
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Create a new task with copied properties
      const newTaskData = {
        profile_id: activeProfile?.id,
        title: task.title + ' (copie)',
        description_md: task.description_md || '',
        start_date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        due_date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        start_time: task.start_time || null,
        end_time: task.end_time || null,
        priority: task.priority,
        category_id: task.category_id || null,
        affaire_id: task.affaire_id || null,
        kanban_column: 'To Do'
      };

      const response = await fetch(getAPIUrl('/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskData)
      });

      if (!response.ok) throw new Error('Failed to duplicate task');
      
      await fetchData();
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      alert('Erreur lors de la duplication');
    }
  };

  const handleTaskComplete = async (task: Task & { _isAppointment?: boolean }, isComplete: boolean) => {
    try {
      // Ignore completion toggle for appointments - users should edit via the appointment modal
      if (task._isAppointment) {
        return;
      }
      
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: isComplete })
      });
      if (!response.ok) throw new Error(`Update failed: ${response.status}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await fetch(getAPIUrl('/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: activeProfile?.id,
          name: newCategoryName,
          color: newCategoryColor
        })
      });
      
      if (response.ok) {
        await fetchData();
        setNewCategoryName('');
        setNewCategoryColor('#6366f1');
      }
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  const confirmDeleteCategory = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      setDeletingCategoryId(id);
      try {
        const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (response.ok) {
          await fetchData();
          setDeletingCategoryId(null);
        }
      } catch (error) {
        console.error('Failed to delete category:', error);
        setDeletingCategoryId(null);
      }
    }
  };

  const handleAddAffaire = async (affaireData: Partial<Affaire>) => {
    await fetch(getAPIUrl('/affaires'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...affaireData, profile_id: activeProfile?.id })
    });
    fetchData();
  };

  const handleUpdateAffaire = async (affaire: Affaire) => {
    await fetch(`/api/affaires/${affaire.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(affaire)
    });
    fetchData();
  };

  const handleDeleteAffaire = async (id: number) => {
    await fetch(`/api/affaires/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleTaskArchive = async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: 1 })
      });
      if (!response.ok) throw new Error(`Archive failed: ${response.status}`);
      await fetchData();
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to archive task:', error);
      alert('Erreur lors de l\'archivage de la tâche');
    }
  };

  const handleTaskRestore = async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: 0, is_archived: 0, is_complete: 0 })
      });
      if (!response.ok) throw new Error(`Restore failed: ${response.status}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to restore task:', error);
    }
  };

  const handleExportArchive = () => {
    const csv = [
      ['ID', 'Title', 'Time Spent (min)', 'Completed At', 'Category', 'Description'],
      ...archivedTasks.map(task => [
        task.id,
        task.title,
        task.time_spent || 0,
        task.completed_at || '',
        task.category_name || '',
        task.description_md || ''
      ])
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archive_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeletePermanent = async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}/permanent`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Êtes-vous sûr? Cette action ne peut pas être annulée.')) return;
    try {
      const response = await fetch(`/api/tasks/trash/empty/${activeProfile?.id}`, { 
        method: 'DELETE' 
      });
      if (!response.ok) throw new Error(`Empty trash failed: ${response.status}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to empty trash:', error);
    }
  };

  const handleDeleteProfile = async (profileId: number) => {
    try {
      const profileToArchive = profiles.find(p => p.id === profileId);
      if (!profileToArchive) throw new Error('Profile not found');

      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileToArchive, is_archived: true })
      });
      if (!response.ok) throw new Error(`Archive failed: ${response.status}`);
      
      // Refresh profiles list
      const profilesRes = await fetch(getAPIUrl('/profiles'));
      const updatedProfiles = await profilesRes.json();
      setProfiles(updatedProfiles);
    } catch (error) {
      console.error('Failed to archive profile:', error);
    }
  };

  const handleRestoreProfile = async (profileId: number) => {
    try {
      const profileToRestore = profiles.find(p => p.id === profileId);
      if (!profileToRestore) throw new Error('Profile not found');

      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileToRestore, is_archived: false })
      });
      if (!response.ok) throw new Error(`Restore failed: ${response.status}`);
      
      // Refresh profiles list
      const profilesRes = await fetch(getAPIUrl('/profiles'));
      const updatedProfiles = await profilesRes.json();
      setProfiles(updatedProfiles);
    } catch (error) {
      console.error('Failed to restore profile:', error);
    }
  };

  const handleSaveAppointment = async (appointmentData: Partial<Appointment>) => {
    try {
      if (!activeProfile) throw new Error('No active profile');

      const payload = {
        profile_id: activeProfile.id,
        title: appointmentData.title,
        description: appointmentData.description,
        location: appointmentData.location,
        start_time: appointmentData.start_time,
        end_time: appointmentData.end_time,
        affaire_id: appointmentData.affaire_id,
        video_call_link: appointmentData.video_call_link,
        recurrence_type: appointmentData.recurrence_type,
        recurrence_end_date: appointmentData.recurrence_end_date,
        participants: appointmentData.participants || []
      };

      if (selectedAppointment?.id) {
        // Update existing appointment
        await fetch(`/api/appointments/${selectedAppointment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new appointment
        await fetch(getAPIUrl('/appointments'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      // Note: No task is created. Recurring appointments are displayed directly in the list

      // Refresh data and close modal
      await fetchData();
      setIsAppointmentModalOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Failed to save appointment:', error);
      throw error;
    }
  };

  const handleDeleteAppointment = async (appointmentId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous?')) return;
    try {
      await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to delete appointment:', error);
    }
  };

  const getHeaderTitle = (): string => {
    const customLabels = activeProfile?.custom_labels || {};
    const defaultLabels: Record<string, string> = {
      'list': customLabels['vue_liste'] || 'Vue Liste',
      'kanban': customLabels['tableau_kanban'] || 'Tableau Kanban',
      'calendar': customLabels['calendrier'] || 'Calendrier',
      'stats': customLabels['tableau_bord'] || 'Tableau de bord',
      'affaires': customLabels['affaires'] || 'Affaires',
      'archive': customLabels['archives'] || 'Archives',
      'trash': customLabels['corbeille'] || 'Corbeille',
      'backups': customLabels['sauvegardes'] || 'Sauvegardes',
    };
    return defaultLabels[viewMode] || viewMode;
  };

  if (!activeProfile) {
    return (
      <ProfileSelector 
        profiles={profiles} 
        onSelect={setActiveProfile} 
        onCreateProfile={(p) => setProfiles([...profiles, p])}
        onDeleteProfile={handleDeleteProfile}
        onRestoreProfile={handleRestoreProfile}
      />
    );
  }

  return (
    <div id="app-container" className="flex h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden">
      <Sidebar 
        profile={activeProfile} 
        stats={stats}
        viewMode={viewMode} 
        setViewMode={setViewMode} 
        categories={categories}
        affaires={affaires}
        customLabels={activeProfile?.custom_labels}
        onSwitchProfile={() => setActiveProfile(null)}
        onSettings={() => setIsSettingsOpen(true)}
        onSelectAffaire={(affaireId) => {
          setSelectedAffaireFilter(affaireId);
          setViewMode('list');
        }}
        onSelectCategory={(categoryId) => {
          setSelectedCategoryFilter(categoryId);
          setViewMode('list');
        }}
        onAddCategory={async (name: string, color: string) => {
          try {
            const response = await fetch(getAPIUrl('/categories'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                profile_id: activeProfile?.id,
                name,
                color
              })
            });
            
            if (response.ok) {
              await fetchData();
            }
          } catch (error) {
            console.error('Failed to add category:', error);
            throw error;
          }
        }}
      />
      
      <main id="main-content" className="flex-1 flex flex-col relative overflow-hidden">
        <header id="header-content" className="h-16 border-b border-zinc-200 flex items-center justify-between px-8 shrink-0 relative z-10">
          <h1 className="text-xl font-semibold capitalize">
            {getHeaderTitle()}
          </h1>
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.03, filter: "brightness(1.05)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsFocusMode(true)}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors shadow-sm"
            >
              🍅 Mode Focus
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.03, filter: "brightness(1.1)", boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setSelectedAppointment(null); setIsAppointmentModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all shadow-sm"
            >
              <Calendar className="w-4 h-4" /> Rendez-vous
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.03, filter: "brightness(1.1)", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nouvelle Tâche
            </motion.button>
          </div>
        </header>

        <div className="flex-1 p-8 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full overflow-auto"
            >
              {viewMode === 'list' && (
                <TaskList 
                  tasks={getDisplayedTasks()} 
                  onEdit={(t: any) => { 
                    if (t._isAppointment) {
                      // Open appointment modal for editing
                      const apt = appointments.find(a => a.id === t._appointmentId);
                      if (apt) {
                        setSelectedAppointment(apt);
                        setIsAppointmentModalOpen(true);
                      }
                    } else {
                      // Open task modal
                      setSelectedTask(t); 
                      setIsTaskModalOpen(true); 
                    }
                  }}
                  onToggleComplete={handleTaskComplete}
                  onDelete={handleTaskDelete}
                  onDuplicate={handleTaskDuplicate}
                  onAddAlert={handleAddAlert}
                  onValidateTask={handleOpenValidationModal}
                  selectedCategoryFilter={selectedCategoryFilter}
                  selectedAffaireFilter={selectedAffaireFilter}
                  categories={categories}
                  affaires={affaires}
                  currentUserName={activeProfile?.username}
                />
              )}
              {viewMode === 'kanban' && (
                <KanbanView 
                  tasks={tasks} 
                  onTaskMove={fetchData}
                  onEdit={(t) => { setSelectedTask(t); setIsTaskModalOpen(true); }}
                />
              )}
              {viewMode === 'calendar' && (
                <CalendarView 
                  tasks={getCalendarTasks()} 
                  onEdit={(t: any) => { 
                    if (t._isAppointment) {
                      // Open appointment modal for editing
                      const apt = appointments.find(a => a.id === t._appointmentId);
                      if (apt) {
                        setSelectedAppointment(apt);
                        setIsAppointmentModalOpen(true);
                      }
                    } else {
                      // Open task modal
                      setSelectedTask(t); 
                      setIsTaskModalOpen(true); 
                    }
                  }}
                  onDateClick={(date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateString = `${year}-${month}-${day}T00:00:00.000Z`;
                    setSelectedTask({ due_date: dateString } as Task);
                    setIsTaskModalOpen(true);
                  }}
                  onDelete={handleTaskDelete}
                  onDuplicate={handleTaskDuplicate}
                />
              )}
              {viewMode === 'stats' && (
                <StatsView stats={stats} tasks={tasks} />
              )}
              {viewMode === 'affaires' && (
                <AffairesView 
                  affaires={affaires} 
                  tasks={tasks} 
                  onAddAffaire={handleAddAffaire}
                  onUpdateAffaire={handleUpdateAffaire}
                  onDeleteAffaire={handleDeleteAffaire}
                  onSelectAffaire={(affaire) => {
                    setSelectedAffaireFilter(affaire.id);
                    setViewMode('list');
                  }}
                />
              )}
              {viewMode === 'archive' && (
                <ArchiveView 
                  tasks={archivedTasks} 
                  onRestore={handleTaskRestore}
                  onExport={handleExportArchive}
                />
              )}
              {viewMode === 'trash' && (
                <RecycleBin 
                  tasks={trashedTasks} 
                  onRestore={handleTaskRestore}
                  onDeletePermanent={handleDeletePermanent}
                  onEmptyTrash={handleEmptyTrash}
                />
              )}
              {viewMode === 'backups' && (
                <BackupManager 
                  profileId={activeProfile.id} 
                  onRestoreComplete={() => {
                    fetchData();
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <TaskDetailModal 
            task={selectedTask} 
            categories={categories}
            affaires={affaires}
            onClose={() => setIsTaskModalOpen(false)} 
            onSave={handleTaskSave}
            onArchive={handleTaskArchive}
          />
        )}
        {isAppointmentModalOpen && (
          <AppointmentModal
            isOpen={isAppointmentModalOpen}
            onClose={() => {
              setIsAppointmentModalOpen(false);
              setSelectedAppointment(null);
            }}
            onSave={handleSaveAppointment}
            affaires={affaires}
            existingAppointment={selectedAppointment}
          />
        )}
        {isFocusMode && (
          <FocusMode 
            profile={activeProfile}
            tasks={tasks.filter(t => !t.is_complete)}
            onClose={() => { setIsFocusMode(false); fetchData(); }} 
          />
        )}
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setIsSettingsOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm overflow-hidden flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700"
            >
              <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)} 
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6">
                <SettingsView 
                  profile={activeProfile}
                  categories={categories}
                  stats={stats}
                  onProfileUpdate={(updatedProfile) => {
                    setActiveProfile(updatedProfile);
                  }}
                  onAddCategory={async (name: string, color: string) => {
                    try {
                      const response = await fetch(getAPIUrl('/categories'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          profile_id: activeProfile?.id,
                          name,
                          color
                        })
                      });
                      
                      if (response.ok) {
                        await fetchData();
                      }
                    } catch (error) {
                      console.error('Failed to add category:', error);
                    }
                  }}
                  onDeleteCategory={async (id: number) => {
                    try {
                      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
                      if (response.ok) {
                        await fetchData();
                      }
                    } catch (error) {
                      console.error('Failed to delete category:', error);
                    }
                  }}
                />
              </div>
            </motion.div>
```
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Modal */}
      <AnimatePresence>
        {validationModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => {
              setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
              setValidationOption('none');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-lg font-bold text-zinc-900 mb-4">Valider: {validationModal.taskTitle}</h2>
              
              {/* Option selection */}
              <div className="space-y-3 mb-6">
                {/* Option 1: Cumulated time (only for tasks with subtasks) */}
                {!validationModal.subtaskId && getCumulativeSubtaskTime(validationModal.taskId) > 0 && (
                  <button
                    type="button"
                    onClick={() => setValidationOption('cumulated')}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      validationOption === 'cumulated'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-zinc-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="font-medium text-zinc-900 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Utiliser le temps cumulé
                    </div>
                    <div className="text-sm text-zinc-600 mt-1">
                      {Math.floor(getCumulativeSubtaskTime(validationModal.taskId) / 60)}h {getCumulativeSubtaskTime(validationModal.taskId) % 60}min (temps des sous-tâches)
                    </div>
                  </button>
                )}

                {/* Option 2: Custom time */}
                <button
                  type="button"
                  onClick={() => setValidationOption('custom')}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    validationOption === 'custom'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-zinc-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium text-zinc-900">Saisir un temps personnalisé</div>
                  <div className="text-sm text-zinc-600 mt-1">Entrez le temps que vous avez passé</div>
                </button>

                {/* Option 3: No time */}
                <button
                  type="button"
                  onClick={() => setValidationOption('none')}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    validationOption === 'none'
                      ? 'border-zinc-500 bg-zinc-50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="font-medium text-zinc-900">Pas de temps</div>
                  <div className="text-sm text-zinc-600 mt-1">Ne pas enregistrer de temps</div>
                </button>
              </div>

              {/* Custom time input - only show if custom option is selected */}
              {validationOption === 'custom' && (
                <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Temps de travail passé (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(Math.max(0, parseInt(e.target.value) || 0))}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {timeSpent > 0 && (
                    <div className="mt-2 text-sm text-blue-700 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {Math.floor(timeSpent / 60)}h {timeSpent % 60}min
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setValidationModal({ isOpen: false, taskId: 0, taskTitle: '' });
                    setValidationOption('none');
                  }}
                  className="flex-1 px-4 py-2.5 text-zinc-700 font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validationOption === 'cumulated') {
                      handleValidateWithCumulatedTime();
                    } else if (validationOption === 'custom') {
                      handleValidateWithTime();
                    } else {
                      handleValidateWithoutTime();
                    }
                  }}
                  disabled={validationOption === 'custom' && timeSpent === 0 && getCumulativeSubtaskTime(validationModal.taskId) === 0}
                  className="flex-1 px-4 py-2.5 text-white font-medium bg-green-600 hover:bg-green-700 disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Valider
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overdue Tasks Alert Popup */}
      <AnimatePresence>
        {showOverdueAlert && overdueAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => setShowOverdueAlert(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border-t-4 border-red-500"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900">Tâches en retard</h2>
              </div>
              
              <p className="text-sm text-zinc-600 mb-4">
                {overdueAlerts.length} tâche{overdueAlerts.length > 1 ? 's' : ''} dépassant l'échéance {overdueAlerts.length > 1 ? 'ont' : 'a'} été marquée{overdueAlerts.length > 1 ? 's' : ''} comme <span className="font-semibold text-red-600">Urgent</span>:
              </p>

              <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                {overdueAlerts.map(task => (
                  <div key={task.id} className="p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-zinc-700">
                    • {task.title}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowOverdueAlert(false)}
                className="w-full px-4 py-2.5 text-white font-medium bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                OK, j'ai compris
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts Popup */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {alerts.map(alert => {
            const isExpanded = expandedAlertId === alert.id;
            return (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, y: 20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 20, x: 20 }}
                onMouseEnter={() => setExpandedAlertId(alert.id)}
                onMouseLeave={() => setExpandedAlertId(null)}
                className={`transition-all cursor-pointer ${
                  isExpanded 
                    ? 'bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm' 
                    : 'bg-red-600 hover:bg-red-700 rounded-full p-2 shadow-lg'
                }`}
              >
                {isExpanded ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-red-900">{alert.taskTitle}</p>
                        {alert.subtaskTitle && (
                          <p className="text-sm text-red-700 mt-1">Sous-tâche: {alert.subtaskTitle}</p>
                        )}
                        <p className="text-xs text-red-600 mt-2">⚠️ ALERTE</p>
                      </div>
                      <button
                        onClick={() => handleRemoveAlert(alert.id)}
                        className="flex-shrink-0 text-red-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleCompleteFromAlert(alert)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded transition-colors text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Valider
                    </button>
                  </div>
                ) : (
                  <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}



