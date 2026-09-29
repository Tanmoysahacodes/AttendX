import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Trash2, Clock } from 'lucide-react';
import api from '../lib/api';
import { formatDateShort, formatTime, getPriorityBadge } from '../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const annSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
});

export default function Announcements() {
  const { user } = useAuth();
  const role = user?.role;
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(annSchema),
    defaultValues: { priority: 'NORMAL' },
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/announcements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowAddModal(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Announcements</h1>
          <p className="text-zinc-500 text-sm mt-1">Team news and updates.</p>
        </div>
        {(role === 'ADMIN' || role === 'COACH') && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Publish
          </button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-surface-card rounded-xl" />)}
          </div>
        ) : announcements.length === 0 ? (
          <div className="card p-12 text-center text-zinc-500 flex flex-col items-center">
            <Megaphone className="w-12 h-12 mb-4 text-zinc-700" />
            <p>No announcements yet.</p>
          </div>
        ) : (
          announcements.map((ann: any) => (
            <div key={ann.id} className="card p-5 relative overflow-hidden group">
              {ann.priority === 'URGENT' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />}
              {ann.priority === 'HIGH' && <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />}
              
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-zinc-100">{ann.title}</h3>
                    <span className={`${getPriorityBadge(ann.priority)} text-[10px]`}>{ann.priority}</span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{ann.message}</p>
                  
                  <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-surface-border flex items-center justify-center text-[8px] font-bold text-zinc-300">
                        {ann.createdBy.name[0]}
                      </div>
                      {ann.createdBy.name}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateShort(ann.createdAt)} at {formatTime(ann.createdAt)}
                    </div>
                  </div>
                </div>
                {(role === 'ADMIN' || role === 'COACH') && (
                  <button onClick={() => { if(confirm('Delete announcement?')) deleteMutation.mutate(ann.id); }} className="btn-ghost btn-icon opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4 hover:text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-xl font-bold mb-4">Publish Announcement</h2>
            <form onSubmit={handleSubmit(data => addMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input {...register('title')} className="input" placeholder="e.g. Schedule Change" />
                {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message as string}</p>}
              </div>
              <div>
                <label className="label">Message</label>
                <textarea {...register('message')} className="input min-h-[100px] resize-none" placeholder="Enter details..." />
                {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message.message as string}</p>}
              </div>
              <div>
                <label className="label">Priority</label>
                <select {...register('priority')} className="input">
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Publishing...' : 'Publish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
