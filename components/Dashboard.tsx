import React from 'react';
import { JournalEntry, Task, Mood } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CheckCircle2, Circle, Activity, CalendarDays } from 'lucide-react';

interface DashboardProps {
  entries: JournalEntry[];
  tasks: Task[];
  userName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ entries, tasks, userName }) => {
  // Process data for mood chart
  const moodScore = {
    [Mood.GREAT]: 5,
    [Mood.GOOD]: 4,
    [Mood.NEUTRAL]: 3,
    [Mood.STRESSED]: 2,
    [Mood.BAD]: 1
  };

  const chartData = entries
    .slice(0, 7)
    .reverse()
    .map(e => ({
      date: new Date(e.date).toLocaleDateString('en-US', { weekday: 'short' }),
      score: moodScore[e.mood] || 3
    }));

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Welcome back, {userName}</h1>
        <p className="text-slate-500 mt-1">Here's your mindful overview for today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Pending Tasks</h3>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
              <Circle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{pendingTasks}</p>
          <p className="text-xs text-slate-400 mt-1">Keep it up!</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Completed</h3>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{completedTasks}</p>
          <p className="text-xs text-slate-400 mt-1">Tasks finished</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Journal Entries</h3>
            <div className="p-2 bg-primary-50 rounded-lg text-primary-500">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{entries.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total reflections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Mood Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 text-lg flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary-500" />
              Mood Trends
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis hide domain={[0, 6]} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#0ea5e9" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMood)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity/Quick Actions */}
        <div className="bg-gradient-to-br from-indigo-500 to-primary-600 p-6 rounded-2xl shadow-lg text-white">
          <h3 className="font-bold text-xl mb-2">Quote of the Day</h3>
          <p className="font-serif italic opacity-90 text-lg leading-relaxed">
            "The future depends on what you do today."
          </p>
          <div className="mt-4 flex items-center">
            <div className="w-8 h-1 bg-white/30 rounded-full"></div>
            <p className="ml-3 text-sm font-medium opacity-80">- Mahatma Gandhi</p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-sm font-medium opacity-80 mb-3">Focus for today</p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mr-3"></div>
              <span>Calculus Review</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
