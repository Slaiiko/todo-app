import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Check, Trash2, Edit2, X } from 'lucide-react';
import { Profile, Category } from '../types';
import { getAPIUrl } from '../utils/api';

interface SettingsViewProps {
  profile: Profile | null;
  categories: Category[];
  stats: { completedToday: number; pomodorosToday: number };
  onProfileUpdate: (profile: Profile) => void;
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (id: number) => void;
}

const APP_THEMES = [
  {
    id: 'theme-1',
    name: 'Bleu Ciel',
    description: 'Dégradé bleu clair à violet',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    darkGradient: 'linear-gradient(135deg, #2d3557 0%, #39253d 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #151d2b 0%, #1d121e 100%)'
  },
  {
    id: 'theme-2',
    name: 'Rose Passion',
    description: 'Dégradé rose à rouge vibrant',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    darkGradient: 'linear-gradient(135deg, #6b3a72 0%, #751829 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #381d3c 0%, #3d0d14 100%)'
  },
  {
    id: 'theme-3',
    name: 'Vert Émeraude',
    description: 'Dégradé vert clair à foncé',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    darkGradient: 'linear-gradient(135deg, #1a5a98 0%, #005f77 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #0d2d4c 0%, #002f3b 100%)'
  },
  {
    id: 'theme-4',
    name: 'Océan Profond',
    description: 'Dégradé bleu foncé à cyan',
    gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    darkGradient: 'linear-gradient(135deg, #0d1f3c 0%, #131f4a 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #060f1e 0%, #0a0f25 100%)'
  },
  {
    id: 'theme-5',
    name: 'Coucher Soleil',
    description: 'Dégradé orange à rouge vif',
    gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    darkGradient: 'linear-gradient(135deg, #994d5a 0%, #4d7f99 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #4d262d 0%, #263f4c 100%)'
  },
  {
    id: 'theme-6',
    name: 'Nuit Mystique',
    description: 'Dégradé violet profond à rose',
    gradient: 'linear-gradient(135deg, #2d0a4e 0%, #93329e 100%)',
    darkGradient: 'linear-gradient(135deg, #150327 0%, #4a1a52 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #0a0113 0%, #250d29 100%)'
  },
  {
    id: 'theme-8',
    name: 'Or Lumineux',
    description: 'Dégradé jaune à orange chaleureux',
    gradient: 'linear-gradient(135deg, #fdc830 0%, #f37335 100%)',
    darkGradient: 'linear-gradient(135deg, #9d6b1a 0%, #8b3a1a 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #4d350d 0%, #451d0d 100%)'
  },
  {
    id: 'theme-9',
    name: 'Terre Chaude',
    description: 'Dégradé marron à beige naturel',
    gradient: 'linear-gradient(135deg, #8b4513 0%, #d2b48c 100%)',
    darkGradient: 'linear-gradient(135deg, #4a2408 0%, #6b5840 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #251204 0%, #352c20 100%)'
  },
  {
    id: 'theme-10',
    name: 'Élégance Noire',
    description: 'Dégradé noir mat à charcoal',
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
    darkGradient: 'linear-gradient(135deg, #050403 0%, #15120f 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #020201 0%, #0a0907 100%)'
  },
  {
    id: 'theme-custom',
    name: 'Fond Personnalisé',
    description: 'Téléchargez votre vraie image',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #1a1a1a 100%)',
    darkGradient: 'linear-gradient(135deg, #8B4513 0%, #2a2a2a 100%)',
    veryDarkGradient: 'linear-gradient(135deg, #3d2817 0%, #0d0d0d 100%)',
    isCustom: true
  }
];

const AVAILABLE_FONTS = [
  // System & Default
  { id: 'system-ui', label: 'System UI (Défaut)', family: 'system-ui' },
  
  // Sans-Serif Modern
  { id: 'segoe-ui', label: 'Segoe UI', family: "'Segoe UI', sans-serif" },
  { id: 'roboto', label: 'Roboto', family: "'Roboto', sans-serif" },
  { id: 'arial', label: 'Arial', family: 'Arial, sans-serif' },
  { id: 'helvetica', label: 'Helvetica', family: 'Helvetica, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet MS', family: "'Trebuchet MS', sans-serif" },
  { id: 'verdana', label: 'Verdana', family: 'Verdana, sans-serif' },
  { id: 'open-sans', label: 'Open Sans', family: "'Open Sans', sans-serif" },
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif" },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif" },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif" },
  { id: 'ubuntu', label: 'Ubuntu', family: "'Ubuntu', sans-serif" },
  { id: 'proxima-nova', label: 'Proxima Nova', family: "'Proxima Nova', sans-serif" },
  { id: 'source-sans', label: 'Source Sans Pro', family: "'Source Sans Pro', sans-serif" },
  { id: 'work-sans', label: 'Work Sans', family: "'Work Sans', sans-serif" },
  { id: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif" },
  { id: 'quicksand', label: 'Quicksand', family: "'Quicksand', sans-serif" },
  { id: 'mulish', label: 'Mulish', family: "'Mulish', sans-serif" },
  
  // Sans-Serif Artistic
  { id: 'comfortaa', label: 'Comfortaa', family: "'Comfortaa', sans-serif" },
  { id: 'fredoka', label: 'Fredoka', family: "'Fredoka', sans-serif" },
  { id: 'cabin', label: 'Cabin', family: "'Cabin', sans-serif" },
  { id: 'play', label: 'Play', family: "'Play', sans-serif" },
  
  // Serif Fonts
  { id: 'georgia', label: 'Georgia', family: 'Georgia, serif' },
  { id: 'times-new-roman', label: 'Times New Roman', family: "'Times New Roman', serif" },
  { id: 'garamond', label: 'Garamond', family: 'Garamond, serif' },
  { id: 'palatino', label: 'Palatino', family: "'Palatino Linotype', serif" },
  { id: 'didot', label: 'Didot', family: 'Didot, serif' },
  { id: 'book-antiqua', label: 'Book Antiqua', family: "'Book Antiqua', serif" },
  { id: 'cambria', label: 'Cambria', family: 'Cambria, serif' },
  { id: 'gentium', label: 'Gentium', family: "'Gentium Book Basic', serif" },
  { id: 'lora', label: 'Lora', family: "'Lora', serif" },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif" },
  { id: 'cormorant', label: 'Cormorant', family: "'Cormorant', serif" },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif" },
  
  // Monospace Fonts
  { id: 'courier-new', label: 'Courier New', family: "'Courier New', monospace" },
  { id: 'consolas', label: 'Consolas', family: 'Consolas, monospace' },
  { id: 'monaco', label: 'Monaco', family: 'Monaco, monospace' },
  { id: 'inconsolata', label: 'Inconsolata', family: "'Inconsolata', monospace" },
  { id: 'source-code', label: 'Source Code Pro', family: "'Source Code Pro', monospace" },
  { id: 'fira-code', label: 'Fira Code', family: "'Fira Code', monospace" },
  { id: 'roboto-mono', label: 'Roboto Mono', family: "'Roboto Mono', monospace" },
  { id: 'ibm-plex', label: 'IBM Plex Mono', family: "'IBM Plex Mono', monospace" },
  { id: 'code-new', label: 'Courier Code', family: "'Courier Code', monospace" },
  
  // Handwriting & Display
  { id: 'comic-sans', label: 'Comic Sans MS', family: "'Comic Sans MS', cursive" },
  { id: 'impact', label: 'Impact', family: 'Impact, fantasy' },
  { id: 'brush-script', label: 'Brush Script MT', family: "'Brush Script MT', cursive" },
  { id: 'lucida-handwriting', label: 'Lucida Handwriting', family: "'Lucida Handwriting', cursive" },
  { id: 'caveat', label: 'Caveat', family: "'Caveat', cursive" },
  { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive" },
  { id: 'great-vibes', label: 'Great Vibes', family: "'Great Vibes', cursive" },
  { id: 'dancing-script', label: 'Dancing Script', family: "'Dancing Script', cursive" },
  
  // Display & Headlines
  { id: 'bebas', label: 'Bebas Neue', family: "'Bebas Neue', sans-serif" },
  { id: 'oswald', label: 'Oswald', family: "'Oswald', sans-serif" },
  { id: 'anton', label: 'Anton', family: "'Anton', sans-serif" },
  { id: 'righteous', label: 'Righteous', family: "'Righteous', sans-serif" },
  
  // Modern Web Fonts
  { id: 'jet-brains', label: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
  { id: 'dosis', label: 'Dosis', family: "'Dosis', sans-serif" },
  { id: 'exo', label: 'Exo 2', family: "'Exo 2', sans-serif" },
  { id: 'space-mono', label: 'Space Mono', family: "'Space Mono', monospace" },
  { id: 'sora', label: 'Sora', family: "'Sora', sans-serif" },
  { id: 'lexend', label: 'Lexend', family: "'Lexend', sans-serif" },
];

// Utility functions for color manipulation
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
  // Sample multiple text elements to get the dominant text color
  const textElements = document.querySelectorAll('body, p, span, div, h1, h2, h3, a');
  let colors: string[] = [];

  for (let i = 0; i < Math.min(10, textElements.length); i++) {
    const element = textElements[i] as HTMLElement;
    const computedStyle = window.getComputedStyle(element);
    const color = computedStyle.color;
    
    // Parse rgb() or rgba() format
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      colors.push(rgbToHex(r, g, b));
    }
  }

  // Return the first valid color found, or default to black
  return colors.length > 0 ? colors[0] : '#000000';
}

// Adapt color selection to maintain current luminosity
function adaptColorByLuminosity(selectedColor: string, referenceColor: string): string {
  const selectedHSL = hexToHSL(selectedColor);
  const referenceHSL = hexToHSL(referenceColor);
  
  // Keep the selected hue and saturation, but use reference luminosity
  return hslToHex(selectedHSL.h, selectedHSL.s, referenceHSL.l);
}

export default function SettingsView({ 
  profile, 
  categories, 
  stats,
  onProfileUpdate, 
  onAddCategory, 
  onDeleteCategory 
}: SettingsViewProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>(profile?.app_background_theme || 'theme-1');
  const [customBackgroundImage, setCustomBackgroundImage] = useState<string | null>(profile?.custom_background_image || null);
  const [selectedFont, setSelectedFont] = useState<string>(profile?.font_family || 'system-ui');
  const [selectedTextColor, setSelectedTextColor] = useState<string>(profile?.text_color || '#000000');
  const [baseTextColor, setBaseTextColor] = useState<string>('#000000');
  const [isSaving, setIsSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Label editing
  const [customLabels, setCustomLabels] = useState<Record<string, string>>(profile?.custom_labels || {});
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const previewRef = useRef<HTMLParagraphElement>(null);
  const referenceLuminosityRef = useRef<number>(0);

  // Default labels that can be edited
  const defaultLabels = {
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

  // Update preview font when selectedFont changes
  useEffect(() => {
    if (previewRef.current) {
      const fontFamily = AVAILABLE_FONTS.find(f => f.id === selectedFont)?.family || 'system-ui';
      previewRef.current.style.cssText = `font-family: ${fontFamily} !important;`;
    }
  }, [selectedFont]);

  // Initialize text color from actual document
  useEffect(() => {
    const actualColor = getActualTextColor();
    const hsl = hexToHSL(actualColor);
    referenceLuminosityRef.current = hsl.l;
    
    if (!profile?.text_color) {
      setBaseTextColor(actualColor);
      setSelectedTextColor(actualColor);
    } else {
      setBaseTextColor(actualColor);
      setSelectedTextColor(profile.text_color);
    }
  }, []);

  useEffect(() => {
    if (profile?.app_background_theme) {
      setSelectedTheme(profile.app_background_theme);
    }
    if (profile?.custom_background_image) {
      setCustomBackgroundImage(profile.custom_background_image);
    }
    if (profile?.font_family) {
      setSelectedFont(profile.font_family);
    }
    if (profile?.text_color) {
      setSelectedTextColor(profile.text_color);
    }
  }, [profile?.app_background_theme, profile?.custom_background_image, profile?.font_family, profile?.text_color]);

  // Theme is now handled by App.tsx, no need to apply it here

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // If image is too large, scale it down
        const maxWidth = 1920;
        const maxHeight = 1080;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to JPEG with compression
          const compressedImageData = canvas.toDataURL('image/jpeg', 0.8);
          setCustomBackgroundImage(compressedImageData);
          setSelectedTheme('theme-custom');
        }
      };
      img.onerror = () => {
        alert('Error loading image');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleValidateTheme = async () => {
    if (!profile) return;
    
    setIsSaving(true);

    try {
      const response = await fetch(getAPIUrl(`/profiles/${profile.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          avatar: profile.avatar,
          color_theme: profile.color_theme,
          app_background_theme: selectedTheme,
          custom_background_image: selectedTheme === 'theme-custom' ? customBackgroundImage : null
        })
      });

      if (response.ok) {
        onProfileUpdate({
          ...profile,
          app_background_theme: selectedTheme,
          custom_background_image: selectedTheme === 'theme-custom' ? customBackgroundImage : null
        });
        // Theme will be applied by useEffect hook after React finishes rendering
      }
    } catch (error) {
      console.error('Error updating theme:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateFont = async () => {
    if (!profile) return;
    
    setIsSaving(true);

    try {
      const response = await fetch(getAPIUrl(`/profiles/${profile.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          avatar: profile.avatar,
          color_theme: profile.color_theme,
          font_family: selectedFont
        })
      });

      if (response.ok) {
        // Apply font immediately - convert ID to CSS family
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
        
        const cssFont = fontMap[selectedFont] || 'system-ui';
        
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
        
        // Fetch updated profiles and dispatch event
        try {
          const profilesResponse = await fetch(getAPIUrl('/profiles'));
          const updatedProfiles = await profilesResponse.json();
          window.dispatchEvent(new CustomEvent('profilesUpdated', { detail: updatedProfiles }));
        } catch (error) {
          console.error('Error fetching updated profiles:', error);
        }
        
        onProfileUpdate({
          ...profile,
          font_family: selectedFont
        });
      }
    } catch (error) {
      console.error('Error updating font:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateTextColor = async () => {
    if (!profile) return;
    
    setIsSaving(true);

    try {
      const response = await fetch(getAPIUrl(`/profiles/${profile.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          avatar: profile.avatar,
          color_theme: profile.color_theme,
          text_color: selectedTextColor
        })
      });

      if (response.ok) {
        // Fetch updated profiles and dispatch event
        try {
          const profilesResponse = await fetch(getAPIUrl('/profiles'));
          const updatedProfiles = await profilesResponse.json();
          window.dispatchEvent(new CustomEvent('profilesUpdated', { detail: updatedProfiles }));
        } catch (error) {
          console.error('Error fetching updated profiles:', error);
        }
        
        // Update the parent with new profile - App.tsx will handle applying the style
        onProfileUpdate({
          ...profile,
          text_color: selectedTextColor
        });
      }
    } catch (error) {
      console.error('Error updating text color:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTextColor = async () => {
    if (!profile) return;
    
    const defaultColor = '#000000';
    setSelectedTextColor(defaultColor);
    setIsSaving(true);

    try {
      const response = await fetch(getAPIUrl(`/profiles/${profile.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          avatar: profile.avatar,
          color_theme: profile.color_theme,
          text_color: defaultColor
        })
      });

      if (response.ok) {
        // Fetch updated profiles and dispatch event
        try {
          const profilesResponse = await fetch(getAPIUrl('/profiles'));
          const updatedProfiles = await profilesResponse.json();
          window.dispatchEvent(new CustomEvent('profilesUpdated', { detail: updatedProfiles }));
        } catch (error) {
          console.error('Error fetching updated profiles:', error);
        }
        
        // Update the parent with new profile
        onProfileUpdate({
          ...profile,
          text_color: defaultColor
        });
      }
    } catch (error) {
      console.error('Error resetting text color:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const applyTheme = (themeId: string) => {
    const theme = APP_THEMES.find(t => t.id === themeId);
    if (theme) {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.style.cssText = `background: ${theme.gradient} !important; background-attachment: fixed !important;`;
      }
      const header = document.getElementById('header-content');
      if (header) {
        header.style.cssText = `background: ${theme.darkGradient} !important; background-attachment: fixed !important; color: white !important;`;
      }
      const sidebar = document.getElementById('sidebar-content');
      if (sidebar) {
        sidebar.style.cssText = `background: ${theme.veryDarkGradient} !important; background-attachment: fixed !important;`;
      }
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName, newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('#6366f1');
    }
  };

  const handleDeleteCategory = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      onDeleteCategory(id);
      setDeletingId(null);
    }, 300);
  };

  const startEditLabel = (key: string) => {
    setEditingLabelKey(key);
    setEditingLabelValue(customLabels[key] || defaultLabels[key] || '');
  };

  const saveLabel = async (key: string) => {
    if (!profile || !editingLabelValue.trim()) return;

    setSavingLabel(true);
    try {
      const updatedLabels = { ...customLabels, [key]: editingLabelValue };
      const response = await fetch(getAPIUrl(`/profiles/${profile.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          avatar: profile.avatar,
          color_theme: profile.color_theme,
          app_background_theme: profile.app_background_theme,
          custom_labels: updatedLabels
        })
      });

      if (response.ok) {
        setCustomLabels(updatedLabels);
        setEditingLabelKey(null);
        onProfileUpdate({
          ...profile,
          custom_labels: updatedLabels
        });
      }
    } catch (error) {
      console.error('Error saving label:', error);
    } finally {
      setSavingLabel(false);
    }
  };

  const cancelEdit = () => {
    setEditingLabelKey(null);
    setEditingLabelValue('');
  };

  const getDisplayLabel = (key: string) => {
    return customLabels[key] || defaultLabels[key] || key;
  };

  return (
    <div className="w-full space-y-6 settings-view-container">
      {/* Profile Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-lg p-6 relative z-10"
      >
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Profil & Statistiques</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm font-medium text-gray-300">Profil Actif</p>
            <p className="text-lg font-semibold text-blue-600 mt-2">{profile?.name}</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-900">
            <p className="text-sm font-medium text-gray-300">Complétées Aujourd'hui</p>
            <p className="text-lg font-semibold text-purple-600 mt-2">{stats.completedToday}</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-900">
            <p className="text-sm font-medium text-gray-300">Pomodoros Aujourd'hui</p>
            <p className="text-lg font-semibold text-amber-600 mt-2">{stats.pomodorosToday}</p>
          </div>
        </div>
      </motion.div>

      {/* Custom Labels Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-lg p-6 relative z-10"
      >
        <h2 className="text-2xl font-bold text-gray-100 mb-2 flex items-center gap-2">
          ✏️ Labels Personnalisés
        </h2>
        <p className="text-gray-300 mb-6">
          Modifiez les noms des éléments du menu (survol et cliquez sur l'icône edit pour personnaliser)
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(defaultLabels).map(([key, defaultValue]) => (
            <motion.div key={key} layout className="relative group">
              {editingLabelKey === key ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={editingLabelValue}
                    onChange={(e) => setEditingLabelValue(e.target.value)}
                    placeholder={defaultValue}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-100 placeholder:text-gray-400 rounded border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        saveLabel(key);
                      } else if (e.key === 'Escape') {
                        cancelEdit();
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveLabel(key)}
                      disabled={savingLabel || !editingLabelValue.trim()}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 rounded transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={savingLabel}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors cursor-pointer min-h-[80px] flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-gray-100 text-center truncate w-full">
                    {getDisplayLabel(key)}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">({key})</p>
                  
                  {/* Edit Icon appears on hover */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    onClick={() => startEditLabel(key)}
                    className="absolute top-2 right-2 p-1.5 bg-emerald-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Modifier ce label"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Themes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-lg shadow-lg p-6 relative z-0"
      >
        <h2 className="text-2xl font-bold text-gray-100 mb-2 flex items-center gap-2">
          🎨 Thème de l'Application
        </h2>
        <p className="text-gray-300 mb-6">
          Choisissez parmi 10 thèmes élégants pour personnaliser votre expérience
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {APP_THEMES.map((theme) => (
            <motion.button
              key={theme.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleThemeSelect(theme.id)}
              disabled={isSaving}
              className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all shadow-md hover:shadow-lg ${
                selectedTheme === theme.id 
                  ? 'ring-4 ring-blue-500 ring-offset-2 scale-105' 
                  : 'hover:ring-2 hover:ring-blue-300'
              }`}
            >
              {/* Theme Preview */}
              <div
                style={
                  theme.id === 'theme-custom' && customBackgroundImage
                    ? { backgroundImage: `url(${customBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: theme.gradient }
                }
                className="w-full h-32 flex items-center justify-center p-3 relative"
              >
                {selectedTheme === theme.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg"
                  >
                    <Check className="w-5 h-5 text-green-500" />
                  </motion.div>
                )}
                
                <div className="text-center">
                  <p className="text-white text-sm font-bold drop-shadow-lg">
                    {theme.name}
                  </p>
                  <p className="text-white text-xs drop-shadow-lg opacity-90">
                    {theme.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Custom Image Upload Section */}
        {selectedTheme === 'theme-custom' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <label className="block text-sm font-medium text-gray-200 mb-3">
              📸 Téléchargez votre image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-300
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700"
            />
            <p className="text-xs text-gray-300 mt-2">
              Tous les formats acceptés • Compression automatique • Max dimensions: 1920x1080
            </p>
          </motion.div>
        )}

        <div className="mt-6 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleValidateTheme}
            disabled={isSaving || (selectedTheme === profile?.app_background_theme && customBackgroundImage === profile?.custom_background_image)}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⛳</span>
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>✓ Valider le Thème</span>
            )}
          </motion.button>
        </div>

        {isSaving === false && selectedTheme === profile?.app_background_theme && customBackgroundImage === profile?.custom_background_image && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-sm text-green-600 dark:text-green-400 font-medium"
          >
            ✓ Thème appliqué et enregistré !
          </motion.p>
        )}
      </motion.div>

      {/* Font Selection Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-lg shadow-lg p-6 relative z-0"
      >
        <h2 className="text-2xl font-bold text-gray-100 mb-2 flex items-center gap-2">
          🔤 Police d'Écriture
        </h2>
        <p className="text-gray-300 mb-6">
          Sélectionnez votre police d'écriture préférée parmi +60 options disponibles
        </p>

        <div className="space-y-4">
          {/* Font Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Polices disponibles:
            </label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            >
              {AVAILABLE_FONTS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Aperçu:</p>
            <p 
              ref={previewRef}
              className="text-lg text-gray-100"
            >
              Abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 !@#$%^&*()
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleValidateFont}
            disabled={isSaving || selectedFont === profile?.font_family}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⛳</span>
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>✓ Valider la Police</span>
            )}
          </motion.button>
        </div>

        {isSaving === false && selectedFont === profile?.font_family && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-sm text-green-600 dark:text-green-400 font-medium"
          >
            ✓ Police appliquée et enregistrée !
          </motion.p>
        )}
      </motion.div>

      {/* Text Color Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative z-10"
      >
        <h2 className="text-2xl font-bold text-gray-100 mb-2 flex items-center gap-2">
          🎨 Couleur de la Police
        </h2>
        <p className="text-gray-300 mb-6">
          Sélectionnez la couleur de votre texte dans le spectre complet
        </p>

        <div className="space-y-4">
          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Couleur du texte:
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={selectedTextColor}
                onChange={(e) => setSelectedTextColor(e.target.value)}
                className="h-16 w-24 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-700"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-300 mb-1">Valeur hex:</p>
                <input
                  type="text"
                  value={selectedTextColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.match(/^#[0-9A-F]{6}$/i)) {
                      setSelectedTextColor(value);
                    }
                  }}
                  placeholder="#000000"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-100 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Aperçu:</p>
            <p 
              className="text-lg font-semibold"
              style={{ color: selectedTextColor }}
            >
              Ceci est votre couleur de texte personnalisée
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleValidateTextColor}
            disabled={isSaving || selectedTextColor === profile?.text_color}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⛳</span>
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>✓ Valider la Couleur</span>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleResetTextColor}
            disabled={isSaving || selectedTextColor === '#000000'}
            className="px-6 py-3 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>↺ Réinitialiser</span>
          </motion.button>
        </div>

        {isSaving === false && selectedTextColor === profile?.text_color && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-sm text-green-600 dark:text-green-400 font-medium"
          >
            ✓ Couleur appliquée et enregistrée !
          </motion.p>
        )}
      </motion.div>

      {/* Categories Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative z-10"
      >
        <h2 className="text-2xl font-bold text-gray-100 mb-6">Catégories</h2>

        {/* Existing Categories */}
        {categories.length > 0 && (
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-300 mb-4">Catégories Existantes</p>
            <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md transition-all group ${
                    deletingId === cat.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-gray-200 font-medium">{cat.name}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={deletingId === cat.id}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Category Form */}
        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm font-medium text-gray-200 mb-4">Ajouter une Catégorie</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">Nom</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="Ex: Travail, Personnel..."
                className="w-full px-4 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">Couleur</label>
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-14 h-10 border border-purple-300 dark:border-purple-700 rounded-lg cursor-pointer"
                />
              </div>
              <div 
                className="flex-1 h-10 rounded-lg border border-purple-300 dark:border-purple-700" 
                style={{ backgroundColor: newCategoryColor }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              + Ajouter Catégorie
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


