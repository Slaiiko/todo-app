import { Task } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Target, Flame, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  stats: { completedToday: number; pomodorosToday: number };
  tasks: Task[];
}

export default function StatsView({ stats, tasks }: Props) {
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
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
    </div>
  );
}


