import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Task, Profile } from '../types';
import { X, Play, Pause, RotateCcw, CheckCircle2, Pencil, Check } from 'lucide-react';
import { getAPIUrl } from '../utils/api';

interface Props {
  profile: Profile;
  tasks: Task[];
  onClose: () => void;
}

interface FocusTarget {
  key: string;
  type: 'task' | 'subtask';
  id: number;
  taskId: number;
  label: string;
}

export default function FocusMode({ profile, tasks, onClose }: Props) {
  const [workDurationMin, setWorkDurationMin] = useState(25);
  const [breakDurationMin] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isDurationEditorOpen, setIsDurationEditorOpen] = useState(false);
  const [draftWorkDurationMin, setDraftWorkDurationMin] = useState(25);
  const [selectedTargetKey, setSelectedTargetKey] = useState('');
  const [loggedSecondsThisSession, setLoggedSecondsThisSession] = useState(0);
  const [isPersistingDelta, setIsPersistingDelta] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const focusTargets = useMemo<FocusTarget[]>(() => {
    const targets: FocusTarget[] = [];

    const toNumber = (value: unknown): number | null => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    for (const task of tasks) {
      if (!task || typeof task.id !== 'number') continue;

      targets.push({
        key: `task:${task.id}`,
        type: 'task',
        id: task.id,
        taskId: task.id,
        label: `📌 Tâche · ${task.title}`
      });

      const allSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];

      const buildSubtaskTree = (parentId: number | null, prefix = '') => {
        const children = allSubtasks.filter((subtask: any) => {
          if (Boolean(subtask?.is_complete)) return false;
          const currentParent = subtask?.parent_subtask_id ?? subtask?.parentSubtaskId ?? null;
          const normalizedParent = currentParent == null ? null : toNumber(currentParent);
          return normalizedParent === parentId;
        });

        children.forEach((subtask: any, index: number) => {
          const subtaskId = toNumber(subtask?.id);
          if (subtaskId == null) return;

          const hierarchy = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
          targets.push({
            key: `subtask:${subtaskId}`,
            type: 'subtask',
            id: subtaskId,
            taskId: task.id,
            label: `↳ ${hierarchy} · ${subtask.title}`
          });

          buildSubtaskTree(subtaskId, hierarchy);
        });
      };

      buildSubtaskTree(null);
    }

    return targets;
  }, [tasks]);

  const selectedTarget = useMemo(() => {
    return focusTargets.find((target) => target.key === selectedTargetKey) || null;
  }, [focusTargets, selectedTargetKey]);

  const getCurrentTaskTimeSpent = (taskId: number): number => {
    const task = tasks.find((t) => t.id === taskId);
    return Number(task?.time_spent || 0) || 0;
  };

  const getCurrentTaskFocusTime = (taskId: number): number => {
    const task = tasks.find((t) => t.id === taskId);
    return Number((task as any)?.focus_time_spent || 0) || 0;
  };

  const getCurrentTaskValidationTime = (taskId: number): number => {
    const task = tasks.find((t) => t.id === taskId);
    return Number((task as any)?.validation_time_spent || 0) || 0;
  };

  const getCurrentSubtaskTimeSpent = (subtaskId: number): number => {
    for (const task of tasks) {
      const subtask = (task.subtasks || []).find((item) => Number(item.id) === subtaskId);
      if (subtask) {
        return Number(subtask.time_spent || 0) || 0;
      }
    }
    return 0;
  };

  const getCurrentSubtaskFocusTime = (subtaskId: number): number => {
    for (const task of tasks) {
      const subtask = (task.subtasks || []).find((item: any) => Number(item.id) === subtaskId);
      if (subtask) return Number((subtask as any).focus_time_spent || 0) || 0;
    }
    return 0;
  };

  const getCurrentSubtaskValidationTime = (subtaskId: number): number => {
    for (const task of tasks) {
      const subtask = (task.subtasks || []).find((item: any) => Number(item.id) === subtaskId);
      if (subtask) return Number((subtask as any).validation_time_spent || 0) || 0;
    }
    return 0;
  };

  const persistDeltaMinutes = async (deltaMinutes: number) => {
    if (!selectedTarget || deltaMinutes <= 0) return;

    setIsPersistingDelta(true);
    try {
      if (selectedTarget.type === 'task') {
        const currentTotal = getCurrentTaskTimeSpent(selectedTarget.id);
        const currentFocus = getCurrentTaskFocusTime(selectedTarget.id);
        const currentValidation = getCurrentTaskValidationTime(selectedTarget.id);
        const nextFocus = currentFocus + deltaMinutes;
        const nextTotal = Math.max(currentTotal + deltaMinutes, nextFocus + currentValidation);
        const response = await fetch(getAPIUrl(`/tasks/${selectedTarget.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time_spent: nextTotal,
            focus_time_spent: nextFocus
          })
        });
        if (!response.ok) {
          throw new Error(`Task update failed: ${response.status}`);
        }
      } else {
        const currentTotal = getCurrentSubtaskTimeSpent(selectedTarget.id);
        const currentFocus = getCurrentSubtaskFocusTime(selectedTarget.id);
        const currentValidation = getCurrentSubtaskValidationTime(selectedTarget.id);
        const nextFocus = currentFocus + deltaMinutes;
        const nextTotal = Math.max(currentTotal + deltaMinutes, nextFocus + currentValidation);
        const response = await fetch(getAPIUrl(`/subtasks/${selectedTarget.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time_spent: nextTotal,
            focus_time_spent: nextFocus
          })
        });
        if (!response.ok) {
          throw new Error(`Subtask update failed: ${response.status}`);
        }
      }

      window.dispatchEvent(new CustomEvent('taskMoved'));
    } catch (error) {
      console.error('Failed to persist focus delta:', error);
      alert('Erreur lors de la validation du temps.');
    } finally {
      setIsPersistingDelta(false);
    }
  };

  const persistPendingElapsedDelta = async () => {
    if (isBreak) return;

    const elapsedSeconds = Math.max(0, (workDurationMin * 60) - timeLeft);
    const alreadyPersistedSeconds = loggedSecondsThisSession;
    const totalUnpersistedSeconds = Math.max(0, elapsedSeconds - alreadyPersistedSeconds);
    const deltaMinutes = Math.floor(totalUnpersistedSeconds / 60);

    if (deltaMinutes > 0) {
      await persistDeltaMinutes(deltaMinutes);
      const persistedSeconds = deltaMinutes * 60;
      setLoggedSecondsThisSession((previous) => previous + persistedSeconds);
      return { persistedMinutes: deltaMinutes, pendingSeconds: totalUnpersistedSeconds - persistedSeconds };
    }

    return { persistedMinutes: 0, pendingSeconds: totalUnpersistedSeconds };
  };

  useEffect(() => {
    const storageKey = `focus_work_duration_${profile.id}`;
    const saved = localStorage.getItem(storageKey);
    const parsed = Number(saved);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 240) {
      setWorkDurationMin(parsed);
      setDraftWorkDurationMin(parsed);
      setTimeLeft(parsed * 60);
    } else {
      setWorkDurationMin(25);
      setDraftWorkDurationMin(25);
      setTimeLeft(25 * 60);
    }
    setIsActive(false);
    setIsBreak(false);
    setIsDurationEditorOpen(false);
  }, [profile.id]);

  useEffect(() => {
    if (!focusTargets.length) {
      setSelectedTargetKey('');
      return;
    }

    const exists = focusTargets.some((target) => target.key === selectedTargetKey);
    if (!exists) {
      setSelectedTargetKey(focusTargets[0].key);
    }
  }, [focusTargets, selectedTargetKey]);

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

    if (!isBreak) {
      await persistPendingElapsedDelta();
      setSessionCount(c => c + 1);

      if (selectedTarget) {
        await fetch(getAPIUrl('/pomodoro'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profile.id, task_id: selectedTarget.taskId, duration_min: workDurationMin })
        });
      }

      setIsBreak(true);
      setTimeLeft(breakDurationMin * 60);
      setLoggedSecondsThisSession(0);
    } else {
      setIsBreak(false);
      setTimeLeft(workDurationMin * 60);
      setLoggedSecondsThisSession(0);
    }
  };

  const toggleTimer = () => {
    setIsActive((previous) => !previous);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(workDurationMin * 60);
    setLoggedSecondsThisSession(0);
  };

  const applyWorkDuration = () => {
    const nextDuration = Math.max(1, Math.min(240, Number(draftWorkDurationMin) || 1));
    setWorkDurationMin(nextDuration);
    localStorage.setItem(`focus_work_duration_${profile.id}`, String(nextDuration));
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(nextDuration * 60);
    setLoggedSecondsThisSession(0);
    setIsDurationEditorOpen(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentSessionSeconds = (isBreak ? breakDurationMin : workDurationMin) * 60;
  const progress = Math.min(100, Math.max(0, ((currentSessionSeconds - timeLeft) / currentSessionSeconds) * 100));
  const elapsedSeconds = Math.max(0, (workDurationMin * 60) - timeLeft);
  const loggedSeconds = loggedSecondsThisSession;
  const effectivePendingSeconds = isBreak ? 0 : Math.max(0, elapsedSeconds - loggedSeconds);
  const pendingDeltaMinutes = Math.floor(effectivePendingSeconds / 60);
  const pendingDeltaSeconds = effectivePendingSeconds % 60;

  const handleManualValidateTime = async () => {
    if (!selectedTarget) {
      alert('Sélectionnez une tâche ou sous-tâche avant de valider le temps.');
      return;
    }

    if (effectivePendingSeconds <= 0) {
      alert('Aucun nouveau temps à valider pour le moment.');
      return;
    }

    const result = await persistPendingElapsedDelta();
    if (!result) return;

    if (result.persistedMinutes === 0 && result.pendingSeconds > 0) {
      alert(`${result.pendingSeconds}s pris en compte. Le temps sera envoyé à la liste dès 1 minute cumulée.`);
    }
  };

  const RocketVisual = () => (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <motion.div
        animate={{ scaleY: [1, 1.25, 0.95, 1.2], opacity: [0.82, 1, 0.84, 0.96] }}
        transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 -translate-x-1/2 top-[71%] w-6 h-20 bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500 rounded-b-full z-0"
      />
      <svg viewBox="0 0 64 64" className="relative z-10 w-32 h-32 drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]" aria-hidden="true">
        <defs>
          <linearGradient id="rocketBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
        </defs>
        <path d="M32 6 C26 14 22 23 22 33 L22 44 L42 44 L42 33 C42 23 38 14 32 6 Z" fill="url(#rocketBody)" stroke="#60a5fa" strokeWidth="1.5"/>
        <circle cx="32" cy="28" r="5" fill="#60a5fa" stroke="#dbeafe" strokeWidth="1.5"/>
        <path d="M22 35 L14 43 L22 43 Z" fill="#f472b6"/>
        <path d="M42 35 L50 43 L42 43 Z" fill="#f472b6"/>
        <path d="M24 44 L32 50 L40 44 Z" fill="#fb7185"/>
      </svg>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center text-white">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="flex gap-2 mb-8 mt-6">
        {Array.from({ length: Math.max(4, sessionCount) }).map((_, i) => (
          <div key={i} className={`text-3xl transition-opacity ${i < sessionCount ? 'opacity-100' : 'opacity-20 grayscale'}`}>
            <span className="inline-block -rotate-45">🚀</span>
          </div>
        ))}
      </div>

      {isActive && (
        <>
          <motion.div
            animate={{ y: [0, -8, -3, -10, -4, 0], opacity: [0.9, 1, 0.92, 1, 0.9, 0.95] }}
            transition={{ duration: 3.9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
          >
            <RocketVisual />
          </motion.div>

          <motion.div
            animate={{ y: [0, -6, -2, -9, -3, 0], opacity: [0.92, 1, 0.9, 1, 0.92, 0.96] }}
            transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute right-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
          >
            <RocketVisual />
          </motion.div>
        </>
      )}

      <div className="relative w-[54vw] h-[41vh] max-w-[56rem] max-h-[56rem] min-w-[26rem] min-h-[26rem] flex items-center justify-center mb-[-2rem] z-0">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="2" />
          <motion.circle 
            cx="50" cy="50" r="45" fill="none" stroke="#0ea5e9" strokeWidth="2"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * progress) / 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        <div className="text-center z-10">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-3">
            {isBreak ? 'Pause' : 'Session de travail'}
          </div>
          <motion.div 
            key={timeLeft}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-8xl font-mono font-light tracking-tighter mb-4"
          >
            {formatTime(timeLeft)}
          </motion.div>
          <div className="flex items-center justify-center gap-6">
            <button onClick={toggleTimer} className="w-16 h-16 bg-sky-500 hover:bg-sky-600 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isPersistingDelta || !selectedTarget}>
              {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            <button
              onClick={() => setIsDurationEditorOpen((open) => !open)}
              className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition-colors"
              title="Modifier la durée"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button onClick={resetTimer} className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleManualValidateTime}
            disabled={isPersistingDelta}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed text-white text-sm font-medium"
          >
            Valider le temps{effectivePendingSeconds > 0 ? ` (+${pendingDeltaMinutes} min ${pendingDeltaSeconds}s)` : ''}
          </button>
        </div>
      </div>

      <div className="relative z-30 w-full max-w-md bg-zinc-900 rounded-3xl p-6 border border-zinc-800 mt-6">
        <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1 text-center">Current Focus</h3>
        <p className="text-center text-xs text-zinc-500 mb-4">Profil: {profile.name}</p>

        {isDurationEditorOpen && (
        <div className="mb-4 p-3 bg-zinc-800/70 rounded-xl border border-zinc-700">
          <label className="block text-zinc-300 text-sm mb-2">Temps de travail (minutes)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={240}
              value={draftWorkDurationMin}
              onChange={(e) => {
                const next = Math.max(1, Math.min(240, Number(e.target.value) || 1));
                setDraftWorkDurationMin(next);
              }}
              className="w-full bg-zinc-900 border border-zinc-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={applyWorkDuration}
              className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium whitespace-nowrap flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Appliquer
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Pause automatique: {breakDurationMin} min</p>
        </div>
        )}

        {focusTargets.length > 0 ? (
          <select 
            value={selectedTargetKey}
            onChange={(e) => {
              if (isActive && !isBreak) {
                void persistPendingElapsedDelta();
              }
              setIsActive(false);
              setIsBreak(false);
              setTimeLeft(workDurationMin * 60);
              setLoggedSecondsThisSession(0);
              setSelectedTargetKey(e.target.value);
            }}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-sky-500 appearance-none text-center font-medium text-lg cursor-pointer"
          >
            {focusTargets.map((target) => (
              <option key={target.key} value={target.key}>{target.label}</option>
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


