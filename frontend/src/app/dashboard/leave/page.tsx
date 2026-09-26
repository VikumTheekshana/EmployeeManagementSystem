'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  PlusCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { api } from '../../../lib/api';

export default function LeavePage() {
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Apply Form State
  const [form, setForm] = useState({
    leaveType: 'Annual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    totalDays: 1,
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, reqRes] = await Promise.all([
        api.getMyLeaveBalances(),
        api.getLeaveRequests(),
      ]);

      if (balRes.success) setBalances(balRes.data);
      if (reqRes.success) setRequests(reqRes.data);
    } catch (e) {
      console.error('Failed to load leave data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.applyLeave(form);
      if (res.success) {
        setMessage('Leave application submitted successfully for review.');
        setShowApplyModal(false);
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, decision: 'Approved' | 'Rejected') => {
    try {
      const res = await api.reviewLeaveRequest(id, decision, `Processed by reviewer as ${decision}`);
      if (res.success) {
        setMessage(`Leave request ${decision.toLowerCase()} successfully.`);
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to review leave request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            Sri Lankan Multi-Policy Leave Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Shop & Office Employees Act No. 19 of 1954 compliance with automated accrual and approval gates.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {balances.map((bal) => (
          <div key={bal._id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>{bal.leaveType}</span>
              <span className="text-[10px] text-slate-500 font-mono">2026</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{bal.available}</div>
            <div className="text-[10px] text-slate-400 mt-2 flex justify-between border-t border-slate-800/60 pt-1.5">
              <span>Used: {bal.used}</span>
              <span>Pending: {bal.pending}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Requests Ledger */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">Leave Application & Approval Ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Employee</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Dates</th>
                <th className="pb-3 font-semibold">Days</th>
                <th className="pb-3 font-semibold">Reason</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-medium text-white">
                      <div>{req.employeeId?.fullName || 'Current User'}</div>
                      <div className="text-[11px] text-slate-400">{req.employeeId?.employeeCode}</div>
                    </td>
                    <td className="py-3 font-semibold text-indigo-400">{req.leaveType}</td>
                    <td className="py-3 font-mono text-[11px]">
                      {new Date(req.startDate).toLocaleDateString()} &rarr; {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-mono font-semibold">{req.totalDays} day(s)</td>
                    <td className="py-3 text-slate-400 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          req.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : req.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReview(req._id, 'Approved')}
                            className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                            title="Approve Leave"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleReview(req._id, 'Rejected')}
                            className="p-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                            title="Reject Leave"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4">Submit Leave Application</h2>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Leave Category</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Annual">Annual Leave (14 days statutory)</option>
                  <option value="Casual">Casual Leave (7 days)</option>
                  <option value="Medical">Medical Leave (14 days)</option>
                  <option value="Maternity">Maternity Leave (84 days)</option>
                  <option value="No-Pay">No-Pay Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Total Days</label>
                <input
                  type="number"
                  min="1"
                  max="84"
                  required
                  value={form.totalDays}
                  onChange={(e) => setForm({ ...form, totalDays: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Notes</label>
                <textarea
                  required
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Detail reason for absence..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {loading ? 'Submitting...' : 'Submit Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
