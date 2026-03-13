import { useMemo, useState } from 'react';
import { Appointment, Task } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Target, Flame, CheckCircle2, Clock, CalendarDays, ListTodo } from 'lucide-react';

interface Props {
  stats: { completedToday: number; pomodorosToday: number };
  tasks: Task[];
  appointments: Appointment[];
  onTaskValidate: (task: Task) => void;
  onSubtaskValidate: (task: Task, subtaskId: number, subtaskTitle: string) => void;
  onOpenTaskDetail: (task: Task) => void;
  onOpenAppointmentDetail: (appointment: Appointment) => void;
}

type TodayItem =
  | { kind: 'task'; sortValue: string; task: Task }
  | { kind: 'appointment'; sortValue: string; appointment: Appointment };

const toLocalDateValue = (isoDate: string | null | undefined): Date | null => {
  if (!isoDate) return null;
  const parsed = parseISO(isoDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTimeLabel = (isoDate: string | null | undefined): string => {
  const dateValue = toLocalDateValue(isoDate);
  return dateValue ? format(dateValue, 'HH:mm') : '—';
};

export default function StatsView({
  stats,
  tasks,
  appointments,
  onTaskValidate,
  onSubtaskValidate,
  onOpenTaskDetail,
  onOpenAppointmentDetail
}: Props) {
  const [selectedItem, setSelectedItem] = useState<TodayItem | null>(null);

  // Generate last 7 days data
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const completed = tasks.filter(t => t.is_complete && t.completed_at && isSameDay(parseISO(t.completed_at), date)).length;
    return {
      name: format(date, 'EEE', { locale: fr }),
      completed
    };
  });

  const totalCompleted = tasks.filter(t => t.is_complete).length;
  const completionRate = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;
  const overdueCount = tasks.filter(t => !t.is_complete && t.due_date && new Date(t.due_date) < new Date()).length;

  const todayItems = useMemo(() => {
    const today = new Date();

    const todayTasks: TodayItem[] = tasks
      .filter(task => {
        if (task.is_complete) return false;
        const startDate = toLocalDateValue(task.start_date);
        const dueDate = toLocalDateValue(task.due_date);
        return Boolean((startDate && isSameDay(startDate, today)) || (dueDate && isSameDay(dueDate, today)));
      })
      .map(task => ({
        kind: 'task' as const,
        sortValue: task.start_time || task.due_date || task.start_date || '23:59',
        task
      }));

    const todayAppointments: TodayItem[] = appointments
      .filter(appointment => {
        const start = toLocalDateValue(appointment.start_time);
        return Boolean(start && isSameDay(start, today));
      })
      .map(appointment => ({
        kind: 'appointment' as const,
        sortValue: appointment.start_time,
        appointment
      }));

    return [...todayTasks, ...todayAppointments].sort((a, b) => a.sortValue.localeCompare(b.sortValue));
  }, [tasks, appointments]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">À réaliser aujourd&apos;hui</h2>
            <p className="text-zinc-500 mt-1">Tâches et rendez-vous de la journée</p>
          </div>
          <div className="text-sm text-zinc-500 font-medium">{todayItems.length} élément{todayItems.length > 1 ? 's' : ''}</div>
        </div>

        {todayItems.length === 0 ? (
          <div className="text-zinc-500 text-sm bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            Aucun élément planifié pour aujourd&apos;hui.
          </div>
        ) : (
          <div className="space-y-3">
            {todayItems.map((item, index) => {
              if (item.kind === 'task') {
                const task = item.task;
                return (
                  <div key={`task-${task.id}-${index}`} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                            <ListTodo className="w-3 h-3" /> Tâche
                          </span>
                          <span className="text-xs text-zinc-500">{formatTimeLabel(task.start_date || task.due_date)}</span>
                        </div>
                        <p className="font-semibold text-zinc-900 truncate">{task.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">Priorité: {task.priority}</p>
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-zinc-600">Sous-tâches ({task.subtasks.filter(s => s.is_complete).length}/{task.subtasks.length})</p>
                            {task.subtasks.slice(0, 3).map((subtask) => (
                              <div key={subtask.id} className="text-xs text-zinc-600 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${subtask.is_complete ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                  <span className={`truncate ${subtask.is_complete ? 'line-through text-zinc-400' : ''}`}>{subtask.title}</span>
                                </div>
                                {!subtask.is_complete && (
                                  <button
                                    onClick={() => onSubtaskValidate(task, subtask.id, subtask.title)}
                                    className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors shrink-0"
                                  >
                                    Valider
                                  </button>
                                )}
                              </div>
                            ))}
                            {task.subtasks.length > 3 && (
                              <p className="text-xs text-zinc-400">+ {task.subtasks.length - 3} autre(s)</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onTaskValidate(task)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors"
                        >
                          Détail
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const appointment = item.appointment;
              return (
                <div key={`appointment-${appointment.id}-${index}`} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                          <CalendarDays className="w-3 h-3" /> Rendez-vous
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatTimeLabel(appointment.start_time)} - {formatTimeLabel(appointment.end_time)}
                        </span>
                      </div>
                      <p className="font-semibold text-zinc-900 truncate">{appointment.title}</p>
                      <p className="text-xs text-zinc-500 mt-1 truncate">{appointment.location || 'Sans lieu'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors"
                      >
                        Détail
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-zinc-500 font-medium mb-1">Terminées Aujourd'hui</h3>
          <p className="text-4xl font-bold text-zinc-900">{stats.completedToday}</p>
          <p className="text-sm text-zinc-400 mt-2">{completionRate}% Taux d'achèvement</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-zinc-500 font-medium mb-1">Pomodoros Aujourd'hui</h3>
          <p className="text-4xl font-bold text-zinc-900">{stats.pomodorosToday}</p>
          <p className="text-sm text-zinc-400 mt-2">Sessions de concentration</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-zinc-500 font-medium mb-1">Tâches en retard</h3>
          <p className="text-4xl font-bold text-zinc-900">{overdueCount}</p>
          <p className="text-sm text-zinc-400 mt-2">Nécessite votre attention</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Productivité Hebdomadaire</h2>
            <p className="text-zinc-500 mt-1">Tâches terminées au cours des 7 derniers jours</p>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full font-medium">
            <Flame className="w-5 h-5" />
            <span>Série de 3 jours !</span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: '#f4f4f5' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="completed" radius={[6, 6, 0, 0]}>
                {last7Days.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.completed > 0 ? '#6366f1' : '#e4e4e7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 p-6" onClick={(e) => e.stopPropagation()}>
            {selectedItem.kind === 'task' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <ListTodo className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-zinc-900">Détail de la tâche</h3>
                </div>
                <p className="text-zinc-900 font-semibold mb-2">{selectedItem.task.title}</p>
                <p className="text-sm text-zinc-600 mb-1">Priorité: {selectedItem.task.priority}</p>
                <p className="text-sm text-zinc-600 mb-1">Échéance: {selectedItem.task.due_date ? format(parseISO(selectedItem.task.due_date), 'dd/MM/yyyy HH:mm') : 'Non définie'}</p>
                <p className="text-sm text-zinc-600 mb-4">Description: {selectedItem.task.description_md || 'Aucune description'}</p>

                {selectedItem.task.subtasks && selectedItem.task.subtasks.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                    <p className="text-sm font-semibold text-zinc-800 mb-2">Sous-tâches</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {selectedItem.task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="text-sm text-zinc-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`inline-block w-2 h-2 rounded-full ${subtask.is_complete ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                            <span className={`truncate ${subtask.is_complete ? 'line-through text-zinc-400' : ''}`}>{subtask.title}</span>
                          </div>
                          {!subtask.is_complete && (
                            <button
                              onClick={() => onSubtaskValidate(selectedItem.task, subtask.id, subtask.title)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors shrink-0"
                            >
                              Valider
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onTaskValidate(selectedItem.task)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Valider
                  </button>
                  <button
                    onClick={() => onOpenTaskDetail(selectedItem.task)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Ouvrir
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-zinc-900">Détail du rendez-vous</h3>
                </div>
                <p className="text-zinc-900 font-semibold mb-2">{selectedItem.appointment.title}</p>
                <p className="text-sm text-zinc-600 mb-1">Horaire: {formatTimeLabel(selectedItem.appointment.start_time)} - {formatTimeLabel(selectedItem.appointment.end_time)}</p>
                <p className="text-sm text-zinc-600 mb-1">Lieu: {selectedItem.appointment.location || 'Sans lieu'}</p>
                <p className="text-sm text-zinc-600 mb-4">Description: {selectedItem.appointment.description || 'Aucune description'}</p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onOpenAppointmentDetail(selectedItem.appointment)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                  >
                    Ouvrir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


