import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import api from '../lib/api';
import { formatDate, exportFile } from '../lib/utils';

export default function Reports() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions-reports'],
    queryFn: () => api.get('/attendance/sessions').then(r => r.data.data),
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const handleExport = async () => {
    if (!selectedSessionId) {
      alert("Please select a session to export.");
      return;
    }
    try {
      const response = await api.get(`/stats/export/csv?sessionId=${selectedSessionId}`, { responseType: 'blob' });
      await exportFile(response.data, 'attendance_report.csv');
    } catch (error) {
      console.error('Failed to export CSV', error);
      alert('Failed to export report.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Reports</h1>
          <p className="text-zinc-500 text-sm mt-1">Generate and download team reports.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select 
            value={selectedSessionId} 
            onChange={e => setSelectedSessionId(e.target.value)}
            className="input text-sm py-1.5 min-w-[220px]"
          >
            <option value="">Select a session...</option>
            {sessions.map((s: any) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.date)} — {s.status.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button onClick={handleExport} disabled={!selectedSessionId || isLoading} className="btn-primary whitespace-nowrap">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border bg-surface-secondary/50">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-brand-400" />
            Recent Finalized Sessions
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-secondary text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Present</th>
                <th className="px-4 py-3 font-medium">Absent</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Loading...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No sessions found.</td></tr>
              ) : (
                sessions.slice(0, 10).map((s: any) => (
                  <tr key={s.id} className="hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 font-medium text-zinc-100">{formatDate(s.date)}</td>
                    <td className="px-4 py-3 text-green-400">{s.presentCount}</td>
                    <td className="px-4 py-3 text-red-400">{s.absentCount}</td>
                    <td className="px-4 py-3 text-zinc-300">{s.totalMarked}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`badge ${s.status === 'FINALIZED' ? 'badge-present' : 'badge-low'}`}>{s.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
