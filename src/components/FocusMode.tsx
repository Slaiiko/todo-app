import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Task, Profile } from '../types';
import { X, Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';

interface Props {
  profile: Profile;
  tasks: Task[];
  onClose: () => void;
}

export default function FocusMode({ profile, tasks, onClose }: Props) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(tasks[0] || null);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      handleSessionComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleSessionComplete = async () => {
    // Play sound (simulated)
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});

    setSessionCount(c => c + 1);
    
    if (selectedTask) {
      await fetch(getAPIUrl('/pomodoro'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id, task_id: selectedTask.id, duration_min: 25 })
      });
    }
    
    // Auto-switch to 5 min break
    setTimeLeft(5 * 60);
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setTimeLeft(25 * 60); };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center text-white">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="flex gap-2 mb-12">
        {Array.from({ length: Math.max(4, sessionCount) }).map((_, i) => (
          <div key={i} className={`text-3xl transition-opacity ${i < sessionCount ? 'opacity-100' : 'opacity-20 grayscale'}`}>
            🍅
          </div>
        ))}
      </div>

      <div className="relative w-96 h-96 flex items-center justify-center mb-16">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="2" />
          <motion.circle 
            cx="50" cy="50" r="45" fill="none" stroke="#ef4444" strokeWidth="2"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * progress) / 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        
        <div className="text-center z-10">
          <motion.div 
            key={timeLeft}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-8xl font-mono font-light tracking-tighter mb-4"
          >
            {formatTime(timeLeft)}
          </motion.div>
          <div className="flex items-center justify-center gap-6">
            <button onClick={toggleTimer} className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-red-500/20">
              {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            <button onClick={resetTimer} className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
        <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-4 text-center">Current Focus</h3>
        {tasks.length > 0 ? (
          <select 
            value={selectedTask?.id || ''}
            onChange={e => setSelectedTask(tasks.find(t => t.id === Number(e.target.value)) || null)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 appearance-none text-center font-medium text-lg cursor-pointer"
          >
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        ) : (
          <div className="text-center text-zinc-500 py-4 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p>All tasks completed! Take a break.</p>
          </div>
        )}
      </div>
    </div>
  );
}


