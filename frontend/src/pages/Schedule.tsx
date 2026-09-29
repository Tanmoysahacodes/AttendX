import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { CalendarPlus, CalendarDays, MapPin, Clock, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { getEventTypeColor } from '../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['PRACTICE', 'MATCH', 'TOURNAMENT', 'FITNESS', 'MEETING', 'OTHER']),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().optional(),
  location: z.string().optional(),
});

export default function Schedule() {
  const { user } = useAuth();
  const role = user?.role;
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => api.get('/schedule').then(r => r.data.data),
  });

  const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: 'PRACTICE', date: todayStr },
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/schedule', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming'] });
      setShowAddModal(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedule/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming'] });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Team Schedule</h1>
          <p className="text-zinc-500 text-sm mt-1">Upcoming practices, matches, and events.</p>
        </div>
        {(role === 'ADMIN' || role === 'COACH') && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <CalendarPlus className="w-4 h-4" /> Add Event
          </button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-card rounded-xl" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="card p-12 flex flex-col items-center justify-center text-center">
            <CalendarDays className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-300">No upcoming events</h3>
            <p className="text-zinc-500 mt-1">Check back later or add a new event.</p>
          </div>
        ) : (
          events.map((ev: any) => (
            <div key={ev.id} className="card p-0 overflow-hidden flex flex-col sm:flex-row">
              <div className="bg-surface-secondary sm:w-32 flex sm:flex-col items-center justify-center p-4 border-b sm:border-b-0 sm:border-r border-surface-border">
                <span className="text-brand-500 font-bold uppercase text-xs tracking-widest sm:mb-1 mr-2 sm:mr-0">
                  {new Date(ev.date).toLocaleDateString('en-IN', { month: 'short' })}
                </span>
                <span className="text-2xl sm:text-4xl font-black text-zinc-100 leading-none">
                  {new Date(ev.date).getDate()}
                </span>
                <span className="text-zinc-500 text-xs sm:mt-1 ml-2 sm:ml-0 hidden sm:block">
                  {new Date(ev.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-zinc-100">{ev.title}</h3>
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-secondary border border-surface-border ${getEventTypeColor(ev.type)}`}>
                      {ev.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 mt-2">
                    {ev.startTime && (
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {ev.startTime}</div>
                    )}
                    {ev.location && (
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {ev.location}</div>
                    )}
                  </div>
                </div>
                {(role === 'ADMIN' || role === 'COACH') && (
                  <button onClick={() => { if(confirm('Delete event?')) deleteMutation.mutate(ev.id); }} className="btn-ghost btn-icon text-zinc-500 hover:text-red-400 self-start sm:self-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Event</h2>
            <form onSubmit={handleSubmit(data => addMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input {...register('title')} className="input" placeholder="e.g. Evening Practice" />
                {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message as string}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select {...register('type')} className="input">
                    <option value="PRACTICE">Practice</option>
                    <option value="MATCH">Match</option>
                    <option value="TOURNAMENT">Tournament</option>
                    <option value="FITNESS">Fitness</option>
                    <option value="MEETING">Meeting</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" {...register('date')} className="input" />
                  {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date.message as string}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" {...register('startTime')} className="input" />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input {...register('location')} className="input" placeholder="e.g. Main Ground" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
