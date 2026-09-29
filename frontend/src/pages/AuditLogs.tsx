import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import api from '../lib/api';
import { formatDate, formatTime, getRoleBadgeClass } from '../lib/utils';

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => api.get(`/audit?page=${page}&limit=50`).then(r => r.data),
  });

  const logs = data?.data || [];
  const filtered = logs.filter((l: any) => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    (l.user?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Audit Logs</h1>
          <p className="text-zinc-500 text-sm mt-1">System activity and modifications history.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-secondary border-b border-surface-border text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-zinc-500">Loading logs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-zinc-500">No logs found.</td></tr>
              ) : (
                filtered.map((log: any) => (
                  <tr key={log.id} className="hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {formatDate(log.createdAt)}<br/>{formatTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-zinc-200">{log.user.name}</p>
                          <span className={`${getRoleBadgeClass(log.user.role)} text-[10px] px-1.5 py-0`}>{log.user.role}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-surface-secondary text-zinc-300 font-mono text-xs px-2">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs truncate max-w-xs">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-zinc-400">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={page === 1}
          className="btn-ghost btn-sm"
        >
          ← Previous
        </button>
        <span>Page {page}</span>
        <button 
          onClick={() => setPage(p => p + 1)} 
          disabled={!data || data.data.length < 50}
          className="btn-ghost btn-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
