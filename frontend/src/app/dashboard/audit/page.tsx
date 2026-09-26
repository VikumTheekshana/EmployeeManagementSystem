'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Filter,
  CheckCircle,
  FileCode,
  X,
  Lock,
} from 'lucide-react';
import { api } from '../../../lib/api';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs(100);
      if (res.success) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = actionFilter
    ? logs.filter((l) => l.action.toLowerCase().includes(actionFilter.toLowerCase()))
    : logs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            Immutable Forensic Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Trust tamper-evident logging recording actor credentials, client IP, unmasking events, and state mutations.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Filter and Stats */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by action (e.g. UNMASK, LOGIN)..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-bold">{filteredLogs.length}</span> of{' '}
          <span className="text-indigo-400 font-bold">{total}</span> immutable records
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Event Action</th>
                <th className="py-3 px-4 font-semibold">Actor / Role</th>
                <th className="py-3 px-4 font-semibold">Resource</th>
                <th className="py-3 px-4 font-semibold">IP Address</th>
                <th className="py-3 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                          log.action.includes('UNMASK')
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : log.action.includes('DENIED') || log.action.includes('FAILED')
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-indigo-500/10 text-indigo-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{log.userName || 'System'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.userRole || 'Automated Worker'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-medium">
                      {log.resource} {log.resourceId ? `(${log.resourceId.slice(-6)})` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                Audit Record Payload: {selectedLog.action}
              </h2>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4">
              <pre className="bg-slate-950 p-4 rounded-xl text-[11px] text-indigo-300 font-mono overflow-x-auto max-h-96 border border-slate-800">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
